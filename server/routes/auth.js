import { config } from "../config.js";
import { newId, one, query } from "../db.js";
import { user as serializeUser } from "../serialize.js";
import { sendSms } from "../sms.js";
import { createSession, fail, normalizePhone, otpCode, requireUser, safeEqual, sha256 } from "../util.js";
import { seedJobsFor } from "./tasker.js";

const hashCode = (phone, code) => sha256(`${phone}:${code}`);

export default async function authRoutes(app) {
  app.post(
    "/api/auth/otp",
    {
      config: { rateLimit: { max: 5, timeWindow: "10 minutes" } },
      schema: { body: { type: "object", required: ["phone"], properties: { phone: { type: "string", maxLength: 20 } } } },
    },
    async (req) => {
      const phone = normalizePhone(req.body.phone);
      if (!phone) throw fail(400, "Enter a valid Liberian phone number");
      const existing = await one("SELECT sent_at FROM otp_codes WHERE phone = $1", [phone]);
      if (existing && Date.now() - new Date(existing.sent_at).getTime() < config.otpResendSeconds * 1000) {
        throw fail(429, `Please wait ${config.otpResendSeconds} seconds before requesting another code`);
      }
      const code = otpCode();
      await query(
        `INSERT INTO otp_codes (phone, code_hash, expires_at, attempts, sent_at)
         VALUES ($1, $2, now() + ($3 || ' minutes')::interval, 0, now())
         ON CONFLICT (phone) DO UPDATE SET code_hash = $2, expires_at = EXCLUDED.expires_at, attempts = 0, sent_at = now()`,
        [phone, hashCode(phone, code), String(config.otpTtlMinutes)]
      );
      await sendSms(phone, `Your LoneStar Tasks code is ${code}. It expires in ${config.otpTtlMinutes} minutes.`, req.log);
      return { phone, ...(config.demo ? { devCode: code } : {}) };
    }
  );

  app.post(
    "/api/auth/verify",
    {
      config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
      schema: {
        body: {
          type: "object",
          required: ["phone", "code"],
          properties: { phone: { type: "string", maxLength: 20 }, code: { type: "string", pattern: "^\\d{6}$" } },
        },
      },
    },
    async (req) => {
      const phone = normalizePhone(req.body.phone);
      if (!phone) throw fail(400, "Invalid phone number");
      const otp = await one("SELECT * FROM otp_codes WHERE phone = $1", [phone]);
      if (!otp || new Date(otp.expires_at) < new Date()) throw fail(400, "Code expired — request a new one");
      if (otp.attempts >= 5) throw fail(429, "Too many attempts — request a new code");
      if (!safeEqual(otp.code_hash, hashCode(phone, req.body.code))) {
        await query("UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = $1", [phone]);
        throw fail(400, "Incorrect code");
      }
      await query("DELETE FROM otp_codes WHERE phone = $1", [phone]);
      let u = await one("SELECT * FROM users WHERE phone = $1", [phone]);
      const isNew = !u;
      if (!u) {
        // New accounts get a $25 welcome credit.
        u = await one("INSERT INTO users (id, phone, wallet_cents) VALUES ($1, $2, 2500) RETURNING *", [newId("u_"), phone]);
        await query(
          `INSERT INTO payments (id, user_id, kind, method, amount_cents, status) VALUES ($1, $2, 'topup', 'wallet', 2500, 'succeeded')`,
          [newId("p_"), u.id]
        );
        await query(
          "INSERT INTO notifications (id, user_id, kind, body) VALUES ($1, $2, 'promo', $3)",
          [newId("n_"), u.id, "Welcome to LoneStar Tasks 🇱🇷 Get $5 off your first task with code LIB5"]
        );
      }
      const token = await createSession(u.id);
      return { token, user: serializeUser(u), needsProfile: isNew || !u.name };
    }
  );

  app.post("/api/auth/logout", { preHandler: requireUser }, async (req) => {
    const token = req.headers.authorization.slice(7);
    await query("DELETE FROM sessions WHERE token_hash = $1", [sha256(token)]);
    return { ok: true };
  });

  app.get("/api/me", { preHandler: requireUser }, async (req) => ({ user: serializeUser(req.user) }));

  app.patch(
    "/api/me",
    {
      preHandler: requireUser,
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 80 },
            area: { type: "string", minLength: 1, maxLength: 60 },
            role: { type: "string", enum: ["client", "tasker"] },
            taskerOnline: { type: "boolean" },
          },
        },
      },
    },
    async (req) => {
      const b = req.body;
      const u = await one(
        `UPDATE users SET name = COALESCE($2, name), area = COALESCE($3, area), role = COALESCE($4, role),
           tasker_online = COALESCE($5, tasker_online)
         WHERE id = $1 RETURNING *`,
        [req.user.id, b.name?.trim() ?? null, b.area ?? null, b.role ?? null, b.taskerOnline ?? null]
      );
      if (u.role === "tasker") await seedJobsFor(u.id);
      return { user: serializeUser(u) };
    }
  );
}
