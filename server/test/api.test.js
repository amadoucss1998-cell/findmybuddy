import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../index.js";

let app;
before(async () => {
  app = await buildApp({ dataDir: "memory://", logger: false });
});
after(() => app.close());

const call = async (method, url, { token, body } = {}) => {
  const res = await app.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload: body });
  return { status: res.statusCode, body: res.json() };
};

async function signIn(phone) {
  const otp = await call("POST", "/api/auth/otp", { body: { phone } });
  assert.equal(otp.status, 200);
  assert.match(otp.body.devCode, /^\d{6}$/);
  const v = await call("POST", "/api/auth/verify", { body: { phone, code: otp.body.devCode } });
  assert.equal(v.status, 200);
  return v.body;
}

test("catalog and taskers are seeded", async () => {
  const c = await call("GET", "/api/catalog");
  assert.equal(c.body.categories.length, 22);
  const t = await call("GET", "/api/taskers?category=generator&sort=price");
  assert.ok(t.body.taskers.length > 0);
  assert.ok(t.body.taskers.every((x) => x.skills.includes("generator")));
  const rates = t.body.taskers.map((x) => x.rate);
  assert.deepEqual(rates, [...rates].sort((a, b) => a - b));
  const d = await call("GET", `/api/taskers/${t.body.taskers[0].id}`);
  assert.ok(d.body.tasker.reviews.length > 0);
});

test("phone auth rejects bad numbers and wrong codes", async () => {
  assert.equal((await call("POST", "/api/auth/otp", { body: { phone: "12" } })).status, 400);
  await call("POST", "/api/auth/otp", { body: { phone: "0886 000 111" } });
  const bad = await call("POST", "/api/auth/verify", { body: { phone: "886000111", code: "000000" } });
  assert.ok([400].includes(bad.status));
  assert.equal((await call("GET", "/api/me")).status, 401);
});

test("full client booking flow", async () => {
  const { token, user, needsProfile } = await signIn("077 123 4567");
  assert.equal(user.phone, "+231771234567");
  assert.equal(user.wallet, 25);
  assert.equal(needsProfile, true);
  const me = await call("PATCH", "/api/me", { token, body: { name: "Musu Kamara", area: "Sinkor" } });
  assert.equal(me.body.user.name, "Musu Kamara");

  const tasker = (await call("GET", "/api/taskers?category=cleaning")).body.taskers[0];
  const q = await call("POST", "/api/quotes", {
    token,
    body: { taskerId: tasker.id, categoryId: "cleaning", size: "medium", promoCode: "lib5", useWallet: true },
  });
  assert.equal(q.status, 200);
  assert.equal(q.body.promo.valid, true);
  assert.equal(q.body.discount, 5);

  const booking = {
    taskerId: tasker.id, categoryId: "cleaning", size: "medium", promoCode: "LIB5", useWallet: true,
    area: "Sinkor", address: "14th Street, behind the clinic", details: "Deep clean 3 bedrooms", date: "Today",
    slot: "Morning · 8am–12pm", paymentMethod: "orange",
  };
  const b = await call("POST", "/api/bookings", { token, body: booking });
  assert.equal(b.status, 200, JSON.stringify(b.body));
  assert.equal(b.body.booking.status, "confirmed");
  assert.equal(b.body.booking.total, q.body.total);

  // Promo can't be reused, wallet was debited.
  const again = await call("POST", "/api/bookings", { token, body: booking });
  assert.equal(again.status, 400);
  const w = await call("GET", "/api/wallet", { token });
  assert.equal(w.body.balance, Math.round((25 - q.body.credit) * 100) / 100);

  // Cancel refunds credit and frees the promo code.
  const c = await call("POST", `/api/bookings/${b.body.booking.id}/cancel`, { token });
  assert.equal(c.body.booking.status, "cancelled");
  assert.equal((await call("GET", "/api/wallet", { token })).body.balance, 25);
  const b2 = await call("POST", "/api/bookings", { token, body: { ...booking, useWallet: false, paymentMethod: "cash" } });
  assert.equal(b2.status, 200);
  assert.equal(b2.body.booking.paymentStatus, "due");

  // Advance through to completion and review.
  const id = b2.body.booking.id;
  assert.equal((await call("POST", `/api/bookings/${id}/review`, { token, body: { rating: 5 } })).status, 409);
  for (const s of ["on_the_way", "in_progress", "completed"]) {
    assert.equal((await call("POST", `/api/bookings/${id}/advance`, { token })).body.booking.status, s);
  }
  const r = await call("POST", `/api/bookings/${id}/review`, { token, body: { rating: 4, tip: 2 } });
  assert.equal(r.body.booking.rated, 4);
  assert.equal(r.body.booking.tip, 2);
  assert.equal((await call("POST", `/api/bookings/${id}/review`, { token, body: { rating: 5 } })).status, 409);

  const list = await call("GET", "/api/bookings", { token });
  assert.equal(list.body.bookings.length, 2);

  // Other users can't see this booking.
  const other = await signIn("088 555 0000");
  assert.equal((await call("GET", `/api/bookings/${id}`, { token: other.token })).status, 404);
});

test("chat, favorites, notifications, wallet top up", async () => {
  const { token } = await signIn("055 222 3333");
  const m = await call("POST", "/api/threads/t1/messages", { token, body: { text: "Hello!" } });
  assert.equal(m.body.message.from, "client");
  const threads = await call("GET", "/api/threads", { token });
  assert.equal(threads.body.threads[0].taskerId, "t1");
  assert.equal((await call("PUT", "/api/favorites/t1", { token })).status, 200);
  assert.deepEqual((await call("GET", "/api/favorites", { token })).body.favorites, ["t1"]);
  assert.equal((await call("PUT", "/api/favorites/nope", { token })).status, 404);
  const n = await call("GET", "/api/notifications", { token });
  assert.ok(n.body.notifications.length >= 1);
  const top = await call("POST", "/api/wallet/topup", { token, body: { amount: 10, method: "mtn" } });
  assert.equal(top.body.balance, 35);
});

test("tasker mode", async () => {
  const { token } = await signIn("077 999 8888");
  assert.equal((await call("GET", "/api/tasker/jobs", { token })).status, 403);
  await call("PATCH", "/api/me", { token, body: { name: "Kollie Doe", role: "tasker" } });
  const jobs = (await call("GET", "/api/tasker/jobs", { token })).body.jobs;
  assert.equal(jobs.length, 4);
  assert.equal((await call("POST", `/api/tasker/jobs/${jobs[0].id}/accept`, { token })).body.job.status, "accepted");
  assert.equal((await call("POST", `/api/tasker/jobs/${jobs[0].id}/complete`, { token })).body.job.status, "completed");
  const dash = (await call("GET", "/api/tasker/dashboard", { token })).body;
  assert.equal(dash.week.length, 7);
  assert.equal(dash.weekTotal, jobs[0].pay);
  assert.equal(dash.available, jobs[0].pay);
  const out = await call("POST", "/api/tasker/cashout", { token });
  assert.equal(out.body.amount, jobs[0].pay);
  assert.equal((await call("POST", "/api/tasker/cashout", { token })).status, 409);
});
