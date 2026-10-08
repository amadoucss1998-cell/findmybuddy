// Runs the Supabase migrations against PGlite (embedded Postgres) with a minimal
// stand-in for Supabase's auth schema and API roles, then exercises RLS and RPCs.
// Run: npm run test:db
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const SUPABASE_STUB = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text, email text, created_at timestamptz default now());
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  create publication supabase_realtime;
`;

let db;
before(async () => {
  db = await PGlite.create();
  await db.exec(SUPABASE_STUB);
  const dir = new URL("../migrations/", import.meta.url);
  for (const f of readdirSync(dir).sort()) await db.exec(readFileSync(new URL(f, dir), "utf8"));
});

// Run a query as a signed-in user (or anon when uid is null), like PostgREST does.
async function as(uid, sql, params = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid || ""}', false); set role ${uid ? "authenticated" : "anon"};`);
  try {
    return (await db.query(sql, params)).rows;
  } finally {
    await db.exec("reset role;");
  }
}
const fails = async (p, re) => assert.rejects(p, re);

async function newUser(phone) {
  const email = `${phone.replace(/\D/g, "")}@example.com`;
  const [u] = (await db.query("insert into auth.users (phone, email) values ($1, $2) returning id", [phone, email])).rows;
  return u.id;
}

test("catalog is public", async () => {
  assert.equal((await as(null, "select count(*)::int n from categories"))[0].n, 22);
  assert.equal((await as(null, "select count(*)::int n from taskers"))[0].n, 36);
  assert.ok((await as(null, "select count(*)::int n from reviews"))[0].n > 100);
});

test("signup creates profile with welcome credit; RLS isolates users", async () => {
  const a = await newUser("+231770000001");
  const b = await newUser("+231880000002");
  const [p] = await as(a, "select * from profiles");
  assert.equal(p.wallet_cents, 2500);
  assert.equal(p.email, "231770000001@example.com");
  assert.equal((await as(a, "select * from profiles")).length, 1);
  assert.equal((await as(b, "select * from notifications where user_id = $1", [a])).length, 0);
  assert.equal((await as(null, "select * from profiles")).length, 0);
  // Can edit name, cannot edit wallet.
  await as(a, "update profiles set name = 'Musu Kamara' where id = $1", [a]);
  await fails(as(a, "update profiles set wallet_cents = 999999 where id = $1", [a]), /permission denied/);
  // Cannot impersonate a Tasker in chat.
  await fails(as(a, "insert into messages (client_id, tasker_id, sender, body) values ($1, 't1', 'tasker', 'hi')", [a]), /row-level security/);
  await fails(as(a, "insert into messages (client_id, tasker_id, sender, body) values ($1, 't1', 'client', 'hi')", [b]), /row-level security/);
  // Internal helpers aren't callable.
  await fails(as(a, "select notify_user($1, 'x', 'y')", [b]), /permission denied/);
  await fails(as(null, "select quote_booking('t1', 'cleaning', 'small')"), /permission denied/);
});

test("booking lifecycle with promo, wallet credit, cancel and review", async () => {
  const u = await newUser("+231770000010");
  await as(u, "update profiles set name = 'Varney Toe' where id = $1", [u]);
  const [{ tasker_id }] = await as(u, "select tasker_id from tasker_skills where category_id = 'cleaning' limit 1");
  const [{ quote_booking: q }] = await as(u, "select quote_booking($1, 'cleaning', 'medium', 'lib5', true)", [tasker_id]);
  assert.equal(q.promo.valid, true);
  assert.equal(q.discount_cents, 500);
  assert.equal(q.credit_cents, Math.min(2500, q.subtotal_cents + q.fee_cents - 500));

  const create = (promo, wallet, method) =>
    as(u, "select * from create_booking($1, 'cleaning', 'medium', 'Sinkor', '14th Street', 'Deep clean 3 rooms', 'Today', 'Morning', $2, $3, $4)",
      [tasker_id, method, promo, wallet]);
  const [b] = await create("LIB5", true, "orange");
  assert.equal(b.status, "confirmed");
  assert.equal(b.total_cents, q.total_cents);
  assert.equal(b.payment_status, "succeeded");
  await fails(create("LIB5", false, "orange"), /already used/);
  assert.equal((await as(u, "select wallet_cents from profiles"))[0].wallet_cents, 2500 - q.credit_cents);

  // Opening message + demo auto-reply.
  const msgs = await as(u, "select sender from messages where tasker_id = $1 order by created_at", [tasker_id]);
  assert.deepEqual(msgs.map((m) => m.sender), ["client", "tasker"]);

  await as(u, "select cancel_booking($1)", [b.id]);
  assert.equal((await as(u, "select wallet_cents from profiles"))[0].wallet_cents, 2500);
  await fails(as(u, "select cancel_booking($1)", [b.id]), /haven't started/);

  const [b2] = await create("LIB5", false, "cash");
  assert.equal(b2.payment_status, "due");
  await fails(as(u, "select review_booking($1, 5)", [b2.id]), /once it's completed/);
  for (const s of ["on_the_way", "in_progress", "completed"]) {
    assert.equal((await as(u, "select * from advance_booking($1)", [b2.id]))[0].status, s);
  }
  await fails(as(u, "select advance_booking($1)", [b2.id]), /can't be advanced/);
  const [r] = await as(u, "select * from review_booking($1, 4, 200)", [b2.id]);
  assert.equal(r.rating, 4);
  await fails(as(u, "select review_booking($1, 5)", [b2.id]), /already rated/);
  const [rev] = await as(null, "select author_name from reviews where booking_id = $1", [b2.id]);
  assert.equal(rev.author_name, "Varney T.");

  // Another user can't see or touch it.
  const other = await newUser("+231880000011");
  assert.equal((await as(other, "select * from bookings where id = $1", [b2.id])).length, 0);
  await fails(as(other, "select cancel_booking($1)", [b2.id]), /not found/);
});

test("wallet top up", async () => {
  const u = await newUser("+231770000020");
  assert.equal((await as(u, "select topup_wallet(1000, 'mtn') as b"))[0].b, 3500);
  await fails(as(u, "select topup_wallet(50, 'mtn')"), /between/);
  await fails(as(u, "select topup_wallet(1000, 'cash')"), /Unsupported/);
});

test("tasker mode", async () => {
  const u = await newUser("+231770000030");
  await fails(as(u, "select tasker_dashboard()"), /Tasker mode/);
  await as(u, "update profiles set role = 'tasker' where id = $1", [u]);
  const jobs = await as(u, "select * from job_requests where status = 'open'");
  assert.equal(jobs.length, 4);
  await as(u, "select respond_to_job($1, 'accept')", [jobs[0].id]);
  await as(u, "select respond_to_job($1, 'complete')", [jobs[0].id]);
  await as(u, "select respond_to_job($1, 'decline')", [jobs[1].id]);
  await fails(as(u, "select respond_to_job($1, 'accept')", [jobs[1].id]), /can't be updated/);
  const [{ tasker_dashboard: d }] = await as(u, "select tasker_dashboard()");
  assert.equal(d.week.length, 7);
  assert.equal(d.available_cents, jobs[0].pay_cents);
  assert.equal(d.acceptance, 50);
  assert.equal((await as(u, "select cash_out() as c"))[0].c, jobs[0].pay_cents);
  await fails(as(u, "select cash_out()"), /No earnings/);
});
