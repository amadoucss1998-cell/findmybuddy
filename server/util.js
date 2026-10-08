import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { one, newId, query } from "./db.js";
import { emit } from "./realtime.js";
import { notification } from "./serialize.js";
import { config } from "./config.js";

export function fail(statusCode, message) {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
}

export const sha256 = (s) => createHash("sha256").update(s).digest("hex");
export const safeEqual = (a, b) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export const newToken = () => randomBytes(32).toString("base64url");
export const otpCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

// Accepts 0770123456, 770123456, +231770123456, "77 012 3456" → "+231770123456".
export function normalizePhone(input) {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("231")) d = d.slice(3);
  if (d.startsWith("0")) d = d.slice(1);
  if (!/^[2-9]\d{6,8}$/.test(d)) return null;
  return `+231${d}`;
}

export async function notify(userId, kind, body) {
  const row = await one(
    "INSERT INTO notifications (id, user_id, kind, body) VALUES ($1,$2,$3,$4) RETURNING *",
    [newId("n_"), userId, kind, body]
  );
  emit(userId, "notification", notification(row));
  return row;
}

// Fastify preHandler: resolves the bearer token to request.user.
export async function requireUser(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const user = token ? await userForToken(token) : null;
  if (!user) throw fail(401, "Not signed in");
  request.user = user;
}

export async function userForToken(token) {
  return one(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
}

export async function createSession(userId) {
  const token = newToken();
  await query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [sha256(token), userId, String(config.sessionDays)]
  );
  return token;
}

export const feeFor = (subtotalCents) => Math.round(subtotalCents * config.feeRate);
