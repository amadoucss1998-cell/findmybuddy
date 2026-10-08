import { config } from "../config.js";
import { newId, one, query, tx } from "../db.js";
import { collect, METHODS } from "../payments.js";
import { emit } from "../realtime.js";
import { booking as serializeBooking, usd } from "../serialize.js";
import { fail, feeFor, notify, requireUser } from "../util.js";
import { taskSizes } from "../../src/lib/data.js";
import { getTasker } from "./catalog.js";
import { sendFromClient } from "./social.js";

const STATUS_FLOW = ["confirmed", "on_the_way", "in_progress", "completed"];
const STATUS_TEXT = {
  on_the_way: (t) => `${t} is on the way 🛵`,
  in_progress: (t) => `${t} has started your task`,
  completed: (t) => `Task completed! Rate ${t} and leave a tip`,
};

const dollars = (n) => Math.round(Number(n) * 100);

async function quote(user, { taskerId, categoryId, size, promoCode, useWallet }) {
  const t = await getTasker(taskerId, categoryId);
  if (!t) throw fail(404, "Tasker not found");
  if (!t.skills.includes(categoryId)) throw fail(400, `${t.first} doesn't offer this service`);
  const s = taskSizes.find((x) => x.id === size);
  if (!s) throw fail(400, "Invalid task size");
  const rateCents = dollars(t.rate);
  const subtotal = Math.round(rateCents * s.hours);
  const fee = feeFor(subtotal);
  let discount = 0;
  let promo = null;
  if (promoCode) {
    const code = promoCode.trim().toUpperCase();
    const p = await one("SELECT * FROM promo_codes WHERE code = $1 AND active", [code]);
    const used = p && (await one("SELECT 1 FROM promo_redemptions WHERE code = $1 AND user_id = $2", [code, user.id]));
    if (!p) promo = { code, valid: false, reason: "Invalid promo code" };
    else if (used) promo = { code, valid: false, reason: "You've already used this code" };
    else {
      discount = Math.min(p.discount_cents, subtotal + fee);
      promo = { code, valid: true };
    }
  }
  const credit = useWallet ? Math.min(user.wallet_cents, subtotal + fee - discount) : 0;
  const total = Math.max(0, subtotal + fee - discount - credit);
  return { tasker: t, hours: s.hours, rateCents, subtotal, fee, discount, credit, total, promo };
}

const publicQuote = (q) => ({
  rate: usd(q.rateCents),
  hours: q.hours,
  subtotal: usd(q.subtotal),
  fee: usd(q.fee),
  discount: usd(q.discount),
  credit: usd(q.credit),
  total: usd(q.total),
  promo: q.promo,
});

const BOOKING_SQL = `
  SELECT b.*, c.name AS category_name,
    (SELECT status FROM payments p WHERE p.booking_id = b.id AND p.kind = 'booking' ORDER BY created_at DESC LIMIT 1) AS payment_status
  FROM bookings b JOIN categories c ON c.id = b.category_id`;

async function loadBooking(id, userId) {
  const row = await one(`${BOOKING_SQL} WHERE b.id = $1 AND b.client_id = $2`, [id, userId]);
  if (!row) throw fail(404, "Booking not found");
  row.payment_name = METHODS[row.payment_method]?.name;
  return row;
}

const quoteSchema = {
  taskerId: { type: "string", maxLength: 40 },
  categoryId: { type: "string", maxLength: 40 },
  size: { type: "string", enum: taskSizes.map((s) => s.id) },
  promoCode: { type: "string", maxLength: 30 },
  useWallet: { type: "boolean" },
};

export default async function bookingRoutes(app) {
  app.addHook("preHandler", requireUser);

  app.post(
    "/api/quotes",
    { schema: { body: { type: "object", required: ["taskerId", "categoryId", "size"], properties: quoteSchema } } },
    async (req) => publicQuote(await quote(req.user, req.body))
  );

  app.post(
    "/api/bookings",
    {
      schema: {
        body: {
          type: "object",
          required: ["taskerId", "categoryId", "size", "area", "address", "details", "date", "slot", "paymentMethod"],
          properties: {
            ...quoteSchema,
            area: { type: "string", minLength: 1, maxLength: 60 },
            address: { type: "string", minLength: 3, maxLength: 200 },
            details: { type: "string", minLength: 6, maxLength: 400 },
            date: { type: "string", minLength: 1, maxLength: 40 },
            slot: { type: "string", minLength: 1, maxLength: 40 },
            paymentMethod: { type: "string", enum: ["orange", "mtn", "card", "cash"] },
          },
        },
      },
    },
    async (req) => {
      const b = req.body;
      const q = await quote(req.user, b);
      if (b.promoCode && !q.promo?.valid) throw fail(400, q.promo?.reason || "Invalid promo code");
      const pay = await collect({ method: b.paymentMethod, amountCents: q.total, phone: req.user.phone });
      const id = newId("b_");
      await tx(async (t) => {
        if (q.credit > 0) {
          const r = await t.query(
            "UPDATE users SET wallet_cents = wallet_cents - $2 WHERE id = $1 AND wallet_cents >= $2 RETURNING id",
            [req.user.id, q.credit]
          );
          if (!r.rows.length) throw fail(409, "Wallet balance changed — please try again");
          await t.query(
            "INSERT INTO payments (id, booking_id, user_id, kind, method, amount_cents, status) VALUES ($1,$2,$3,'booking','wallet',$4,'succeeded')",
            [newId("p_"), id, req.user.id, q.credit]
          );
        }
        await t.query(
          `INSERT INTO bookings (id, client_id, tasker_id, category_id, area, address, details, size, hours, date_label, slot,
             rate_cents, fee_cents, discount_cents, credit_cents, total_cents, promo_code, payment_method)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
          [id, req.user.id, b.taskerId, b.categoryId, b.area, b.address.trim(), b.details.trim(), b.size, q.hours, b.date, b.slot,
           q.rateCents, q.fee, q.discount, q.credit, q.total, q.promo?.valid ? q.promo.code : null, b.paymentMethod]
        );
        await t.query(
          "INSERT INTO payments (id, booking_id, user_id, kind, method, amount_cents, status, provider_ref) VALUES ($1,$2,$3,'booking',$4,$5,$6,$7)",
          [newId("p_"), id, req.user.id, b.paymentMethod, q.total, pay.status, pay.providerRef]
        );
        if (q.promo?.valid) {
          await t.query("INSERT INTO promo_redemptions (code, user_id, booking_id) VALUES ($1,$2,$3)", [q.promo.code, req.user.id, id]);
        }
      });
      const row = await loadBooking(id, req.user.id);
      await notify(req.user.id, "booking", `Booking confirmed with ${q.tasker.name}`);
      await sendFromClient(req.user, q.tasker, `Hi ${q.tasker.first}! I just booked you for ${row.category_name}. ${b.details.trim()}`);
      return { booking: serializeBooking(row) };
    }
  );

  app.get("/api/bookings", async (req) => {
    const rows = await query(`${BOOKING_SQL} WHERE b.client_id = $1 ORDER BY b.created_at DESC`, [req.user.id]);
    return { bookings: rows.map((r) => serializeBooking({ ...r, payment_name: METHODS[r.payment_method]?.name })) };
  });

  app.get("/api/bookings/:id", async (req) => ({ booking: serializeBooking(await loadBooking(req.params.id, req.user.id)) }));

  app.post("/api/bookings/:id/cancel", async (req) => {
    const b = await loadBooking(req.params.id, req.user.id);
    if (b.status !== "confirmed") throw fail(409, "Only bookings that haven't started can be cancelled");
    await tx(async (t) => {
      await t.query("UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1", [b.id]);
      if (b.credit_cents > 0) await t.query("UPDATE users SET wallet_cents = wallet_cents + $2 WHERE id = $1", [req.user.id, b.credit_cents]);
      await t.query("UPDATE payments SET status = 'refunded' WHERE booking_id = $1 AND status = 'succeeded'", [b.id]);
      await t.query("DELETE FROM promo_redemptions WHERE booking_id = $1", [b.id]);
    });
    await notify(req.user.id, "booking", `Booking for ${b.category_name} cancelled${b.status === "confirmed" ? " — any payment has been refunded" : ""}`);
    const row = await loadBooking(b.id, req.user.id);
    emit(req.user.id, "booking", serializeBooking(row));
    return { booking: serializeBooking(row) };
  });

  // Moves a booking to its next status. Real Tasker accounts would drive this from
  // their app; in demo mode the client can simulate it.
  app.post("/api/bookings/:id/advance", async (req) => {
    if (!config.demo) throw fail(403, "Status updates come from the Tasker");
    const b = await loadBooking(req.params.id, req.user.id);
    const i = STATUS_FLOW.indexOf(b.status);
    if (i < 0 || i === STATUS_FLOW.length - 1) throw fail(409, "Booking can't be advanced");
    const next = STATUS_FLOW[i + 1];
    await tx(async (t) => {
      await t.query("UPDATE bookings SET status = $2, updated_at = now() WHERE id = $1", [b.id, next]);
      if (next === "completed") await t.query("UPDATE taskers SET jobs = jobs + 1 WHERE id = $1", [b.tasker_id]);
    });
    const t = await getTasker(b.tasker_id);
    await notify(req.user.id, "booking", STATUS_TEXT[next](t.first));
    const row = await loadBooking(b.id, req.user.id);
    emit(req.user.id, "booking", serializeBooking(row));
    return { booking: serializeBooking(row) };
  });

  app.post(
    "/api/bookings/:id/review",
    {
      schema: {
        body: {
          type: "object",
          required: ["rating"],
          properties: {
            rating: { type: "integer", minimum: 1, maximum: 5 },
            tip: { type: "number", minimum: 0, maximum: 100 },
            review: { type: "string", maxLength: 500 },
          },
        },
      },
    },
    async (req) => {
      const b = await loadBooking(req.params.id, req.user.id);
      if (b.status !== "completed") throw fail(409, "You can rate a task once it's completed");
      if (b.rating) throw fail(409, "You've already rated this task");
      const tipCents = dollars(req.body.tip || 0);
      const tipPay = tipCents > 0 ? await collect({ method: b.payment_method, amountCents: tipCents, phone: req.user.phone }) : null;
      const [first, last = ""] = (req.user.name || "Client").split(" ");
      const text = req.body.review?.trim() || ["", "Not great.", "It was okay.", "Good job.", "Great work!", "Excellent — highly recommend!"][req.body.rating];
      await tx(async (t) => {
        await t.query("UPDATE bookings SET rating = $2, review = $3, tip_cents = $4, updated_at = now() WHERE id = $1", [b.id, req.body.rating, text, tipCents]);
        await t.query(
          "INSERT INTO reviews (id, tasker_id, booking_id, author_name, rating, body, category_id) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [newId("r_"), b.tasker_id, b.id, `${first} ${last ? last[0] + "." : ""}`.trim(), req.body.rating, text, b.category_id]
        );
        await t.query(
          "UPDATE taskers SET rating = (SELECT round(avg(rating)::numeric, 1) FROM reviews WHERE tasker_id = $1) WHERE id = $1",
          [b.tasker_id]
        );
        if (tipPay) {
          await t.query(
            "INSERT INTO payments (id, booking_id, user_id, kind, method, amount_cents, status, provider_ref) VALUES ($1,$2,$3,'tip',$4,$5,$6,$7)",
            [newId("p_"), b.id, req.user.id, b.payment_method, tipCents, tipPay.status, tipPay.providerRef]
          );
        }
      });
      return { booking: serializeBooking(await loadBooking(b.id, req.user.id)) };
    }
  );
}
