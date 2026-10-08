import { newId, one, query, tx } from "../db.js";
import { collect, METHODS } from "../payments.js";
import { usd } from "../serialize.js";
import { fail, notify, requireUser } from "../util.js";

const LABEL = { booking: "Task payment", topup: "Wallet top up", tip: "Tip", payout: "Cash out" };

export default async function walletRoutes(app) {
  app.addHook("preHandler", requireUser);

  app.get("/api/wallet", async (req) => {
    const rows = await query(
      `SELECT p.*, c.name AS category_name FROM payments p
       LEFT JOIN bookings b ON b.id = p.booking_id LEFT JOIN categories c ON c.id = b.category_id
       WHERE p.user_id = $1 ORDER BY p.created_at DESC LIMIT 100`,
      [req.user.id]
    );
    return {
      balance: usd(req.user.wallet_cents),
      activity: rows.map((p) => {
        const incoming = p.kind === "topup" || p.status === "refunded" || p.kind === "payout";
        return {
          id: p.id,
          title: p.category_name ? `${p.category_name}${p.kind === "tip" ? " · tip" : ""}` : p.method === "wallet" ? "Welcome bonus" : LABEL[p.kind],
          sub: `${METHODS[p.method]?.name || p.method} · ${p.status}`,
          amount: (incoming ? 1 : -1) * usd(p.amount_cents),
          at: new Date(p.created_at).getTime(),
        };
      }),
    };
  });

  app.post(
    "/api/wallet/topup",
    {
      schema: {
        body: {
          type: "object",
          required: ["amount", "method"],
          properties: { amount: { type: "number", minimum: 1, maximum: 500 }, method: { type: "string", enum: ["orange", "mtn", "card"] } },
        },
      },
    },
    async (req) => {
      const cents = Math.round(req.body.amount * 100);
      const pay = await collect({ method: req.body.method, amountCents: cents, phone: req.user.phone });
      if (pay.status !== "succeeded") throw fail(402, "Payment was not completed");
      const user = await tx(async (t) => {
        await t.query(
          "INSERT INTO payments (id, user_id, kind, method, amount_cents, status, provider_ref) VALUES ($1,$2,'topup',$3,$4,'succeeded',$5)",
          [newId("p_"), req.user.id, req.body.method, cents, pay.providerRef]
        );
        return (await t.query("UPDATE users SET wallet_cents = wallet_cents + $2 WHERE id = $1 RETURNING wallet_cents", [req.user.id, cents])).rows[0];
      });
      await notify(req.user.id, "promo", `$${req.body.amount} added to your wallet via ${METHODS[req.body.method].name}`);
      return { balance: usd(user.wallet_cents) };
    }
  );
}
