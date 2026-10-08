import { config } from "../config.js";
import { newId, one, query, tx } from "../db.js";
import { usd, job as serializeJob } from "../serialize.js";
import { fail, notify, requireUser } from "../util.js";
import { categories, firstNames, lastNames, neighborhoods } from "../../src/lib/data.js";

const WHEN = ["Today · 2pm", "Today · 5pm", "Tomorrow · 9am", "Tomorrow · 1pm", "Sat · 8am", "Sun · 10am"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Gives a new Tasker a few nearby job requests so the marketplace isn't empty.
export async function seedJobsFor(userId, count = 4) {
  const { n } = await one("SELECT count(*)::int AS n FROM job_requests WHERE tasker_user = $1 AND status = 'open'", [userId]);
  if (n > 0) return;
  for (let i = 0; i < count; i++) {
    const cat = pick(categories);
    await query(
      `INSERT INTO job_requests (id, tasker_user, client_name, category_id, area, when_label, pay_cents, distance_km)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        newId("j_"),
        userId,
        `${pick(firstNames)} ${pick(lastNames)[0]}.`,
        cat.id,
        pick(neighborhoods.slice(0, 10)),
        pick(WHEN),
        Math.round((cat.from * (1.5 + Math.random() * 2.5)) * 100),
        Math.round((0.5 + Math.random() * 7) * 10) / 10,
      ]
    );
  }
}

async function loadJob(id, userId) {
  const j = await one("SELECT * FROM job_requests WHERE id = $1 AND tasker_user = $2", [id, userId]);
  if (!j) throw fail(404, "Job not found");
  return j;
}

export default async function taskerRoutes(app) {
  app.addHook("preHandler", requireUser);
  app.addHook("preHandler", async (req) => {
    if (req.user.role !== "tasker") throw fail(403, "Switch to Tasker mode first");
  });

  app.get("/api/tasker/dashboard", async (req) => {
    const days = await query(
      `SELECT d::date AS day, COALESCE(sum(j.pay_cents), 0)::int AS cents
       FROM generate_series(current_date - 6, current_date, interval '1 day') d
       LEFT JOIN job_requests j ON j.tasker_user = $1 AND j.status = 'completed' AND j.completed_at::date = d::date
       GROUP BY d ORDER BY d`,
      [req.user.id]
    );
    const stats = await one(
      `SELECT
         count(*) FILTER (WHERE status IN ('accepted','completed'))::int AS accepted,
         count(*) FILTER (WHERE status = 'declined')::int AS declined,
         count(*) FILTER (WHERE status = 'completed')::int AS completed,
         COALESCE(sum(pay_cents) FILTER (WHERE status = 'completed'), 0)::int AS earned
       FROM job_requests WHERE tasker_user = $1`,
      [req.user.id]
    );
    const { paid } = await one(
      "SELECT COALESCE(sum(amount_cents), 0)::int AS paid FROM payments WHERE user_id = $1 AND kind = 'payout'",
      [req.user.id]
    );
    const decided = stats.accepted + stats.declined;
    return {
      online: req.user.tasker_online,
      week: days.map((d) => ({ day: new Date(d.day).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }), amount: usd(d.cents) })),
      weekTotal: usd(days.reduce((a, d) => a + d.cents, 0)),
      available: usd(stats.earned - paid),
      completed: stats.completed,
      acceptance: decided ? Math.round((stats.accepted / decided) * 100) : null,
    };
  });

  app.get("/api/tasker/jobs", async (req) => {
    const rows = await query("SELECT * FROM job_requests WHERE tasker_user = $1 AND status <> 'declined' ORDER BY created_at DESC", [req.user.id]);
    return { jobs: rows.map(serializeJob) };
  });

  app.post("/api/tasker/jobs/:id/accept", async (req) => {
    const j = await loadJob(req.params.id, req.user.id);
    if (j.status !== "open") throw fail(409, "Job is no longer open");
    const row = await one("UPDATE job_requests SET status = 'accepted', accepted_at = now() WHERE id = $1 RETURNING *", [j.id]);
    return { job: serializeJob(row) };
  });

  app.post("/api/tasker/jobs/:id/decline", async (req) => {
    const j = await loadJob(req.params.id, req.user.id);
    if (j.status !== "open") throw fail(409, "Job is no longer open");
    await query("UPDATE job_requests SET status = 'declined' WHERE id = $1", [j.id]);
    // Keep the request feed topped up.
    await seedJobsFor(req.user.id, 2);
    return { ok: true };
  });

  app.post("/api/tasker/jobs/:id/complete", async (req) => {
    const j = await loadJob(req.params.id, req.user.id);
    if (j.status !== "accepted") throw fail(409, "Only accepted jobs can be completed");
    const row = await one("UPDATE job_requests SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *", [j.id]);
    await notify(req.user.id, "booking", `Job completed — $${usd(j.pay_cents)} added to your earnings`);
    return { job: serializeJob(row) };
  });

  app.post("/api/tasker/cashout", async (req) => {
    const res = await tx(async (t) => {
      const { earned } = (await t.query(
        "SELECT COALESCE(sum(pay_cents), 0)::int AS earned FROM job_requests WHERE tasker_user = $1 AND status = 'completed'",
        [req.user.id]
      )).rows[0];
      const { paid } = (await t.query(
        "SELECT COALESCE(sum(amount_cents), 0)::int AS paid FROM payments WHERE user_id = $1 AND kind = 'payout'",
        [req.user.id]
      )).rows[0];
      const amount = earned - paid;
      if (amount <= 0) throw fail(409, "No earnings available to cash out");
      await t.query(
        "INSERT INTO payments (id, user_id, kind, method, amount_cents, status) VALUES ($1,$2,'payout','orange',$3,$4)",
        [newId("p_"), req.user.id, amount, config.payments.mode === "sandbox" ? "succeeded" : "pending"]
      );
      return amount;
    });
    await notify(req.user.id, "promo", `Cash out of $${usd(res)} requested to Orange Money`);
    return { amount: usd(res) };
  });
}
