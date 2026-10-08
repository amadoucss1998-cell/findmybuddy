import { config } from "../config.js";
import { one, query } from "../db.js";
import { METHODS } from "../payments.js";
import { category, tasker, usd } from "../serialize.js";
import { fail } from "../util.js";
import { neighborhoods, taskSizes, timeSlots } from "../../src/lib/data.js";

const SORTS = {
  rec: "t.rating * 100 + t.jobs / 10.0 DESC",
  rating: "t.rating DESC, t.jobs DESC",
  price: "rate_cents ASC, t.rating DESC",
  near: "t.distance_km ASC",
  jobs: "t.jobs DESC",
};

// Shared tasker query: skills array + hourly rate for the requested category (or primary skill).
export const TASKER_SQL = `
  WITH sk AS (
    SELECT tasker_id, array_agg(category_id ORDER BY position) AS skills FROM tasker_skills GROUP BY tasker_id
  )
  SELECT t.*, sk.skills, (c.from_cents + t.premium_cents) AS rate_cents
  FROM taskers t
  JOIN sk ON sk.tasker_id = t.id
  JOIN categories c ON c.id = COALESCE($1::text, sk.skills[1])`;

export async function getTasker(id, categoryId = null) {
  const row = await one(`${TASKER_SQL} WHERE t.id = $2`, [categoryId, id]);
  return row && tasker(row);
}

export default async function catalogRoutes(app) {
  app.get("/api/health", async () => ({ ok: true, demo: config.demo }));

  app.get("/api/catalog", async () => {
    const cats = await query("SELECT * FROM categories ORDER BY sort");
    return {
      categories: cats.map(category),
      neighborhoods,
      timeSlots,
      taskSizes,
      paymentMethods: Object.entries(METHODS)
        .filter(([id]) => id !== "wallet")
        .map(([id, m]) => ({ id, ...m })),
      lrdRate: config.lrdRate,
      demo: config.demo,
    };
  });

  app.get(
    "/api/taskers",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            category: { type: "string", maxLength: 40 },
            sort: { type: "string", enum: Object.keys(SORTS).concat("elite") },
            online: { type: "boolean" },
            elite: { type: "boolean" },
            q: { type: "string", maxLength: 60 },
            area: { type: "string", maxLength: 60 },
            limit: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        },
      },
    },
    async (req) => {
      const { category: cat = null, sort = "rec", online, q, area, limit } = req.query;
      const elite = req.query.elite || sort === "elite";
      const order = SORTS[sort] || SORTS.rating;
      const rows = await query(
        `${TASKER_SQL}
         WHERE ($1::text IS NULL OR $1 = ANY(sk.skills))
           AND ($2::bool IS NOT TRUE OR t.online)
           AND ($3::bool IS NOT TRUE OR t.elite)
           AND ($4::text IS NULL OR t.name ILIKE '%' || $4 || '%' OR t.bio ILIKE '%' || $4 || '%')
           AND ($5::text IS NULL OR t.area = $5 OR t.distance_km < 3)
         ORDER BY ${order}
         LIMIT $6`,
        [cat, online ?? null, elite || null, q || null, area || null, limit]
      );
      return { taskers: rows.map(tasker) };
    }
  );

  app.get("/api/taskers/:id", async (req) => {
    const t = await getTasker(req.params.id, req.query.category || null);
    if (!t) throw fail(404, "Tasker not found");
    const [reviews, dist, rates] = await Promise.all([
      query(
        `SELECT r.*, c.name AS category_name FROM reviews r LEFT JOIN categories c ON c.id = r.category_id
         WHERE r.tasker_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
        [t.id]
      ),
      query("SELECT rating, count(*)::int AS n FROM reviews WHERE tasker_id = $1 GROUP BY rating", [t.id]),
      query(
        `SELECT ts.category_id, ts.position, c.from_cents + t.premium_cents AS rate_cents,
           (SELECT count(*)::int FROM bookings b WHERE b.tasker_id = t.id AND b.category_id = ts.category_id AND b.status = 'completed') AS done
         FROM tasker_skills ts JOIN categories c ON c.id = ts.category_id JOIN taskers t ON t.id = ts.tasker_id
         WHERE ts.tasker_id = $1 ORDER BY ts.position`,
        [t.id]
      ),
    ]);
    const total = dist.reduce((a, r) => a + r.n, 0) || 1;
    return {
      tasker: {
        ...t,
        reviews: reviews.map((r) => ({
          id: r.id,
          name: r.author_name,
          rating: r.rating,
          text: r.body,
          category: r.category_name,
          at: new Date(r.created_at).getTime(),
        })),
        ratingBreakdown: [5, 4, 3, 2, 1].map((s) => ({
          stars: s,
          pct: Math.round(((dist.find((d) => d.rating === s)?.n || 0) / total) * 100),
        })),
        skillRates: rates.map((r) => ({
          categoryId: r.category_id,
          rate: usd(r.rate_cents),
          // Seeded Taskers carry historical counts; real completions are added on top.
          completed: Math.floor(t.jobs / (r.position + 2)) + r.done,
        })),
      },
    };
  });
}
