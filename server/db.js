import { PGlite } from "@electric-sql/pglite";
import { mkdirSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { config } from "./config.js";
import { categories, taskers as seedTaskers } from "../src/lib/data.js";

export const newId = (prefix = "") => prefix + randomBytes(9).toString("base64url");

let db;

export async function openDb(dataDir = config.dataDir) {
  if (!dataDir.startsWith("memory://")) mkdirSync(dataDir, { recursive: true });
  db = await PGlite.create(dataDir);
  await db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
  await seed();
  return db;
}

export const getDb = () => db;

export async function query(sql, params = []) {
  return (await db.query(sql, params)).rows;
}
export async function one(sql, params = []) {
  return (await db.query(sql, params)).rows[0] || null;
}
export const tx = (fn) => db.transaction(fn);

const cents = (usd) => Math.round(usd * 100);

async function seed() {
  const { n } = await one("SELECT count(*)::int AS n FROM categories");
  if (n > 0) return;
  await tx(async (t) => {
    for (const [i, c] of categories.entries()) {
      await t.query(
        "INSERT INTO categories (id, name, icon, color, from_cents, description, sort) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [c.id, c.name, c.icon, c.color, cents(c.from), c.desc, i]
      );
    }
    for (const s of seedTaskers) {
      await t.query(
        `INSERT INTO taskers (id, name, first, gradient, rating, jobs, premium_cents, area, distance_km,
           elite, verified, response_mins, bio, languages, vehicle, online)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [s.id, s.name, s.first, JSON.stringify(s.gradient), s.rating, s.jobs, cents(s.premium), s.area, s.distance,
         s.elite, s.verified, s.responseMins, s.bio, JSON.stringify(s.languages), s.vehicle, s.online]
      );
      for (const [pos, cat] of s.skills.entries()) {
        await t.query("INSERT INTO tasker_skills (tasker_id, category_id, position) VALUES ($1,$2,$3)", [s.id, cat, pos]);
      }
      for (const [k, r] of s.reviews.entries()) {
        const cat = categories.find((c) => c.name === r.category)?.id || s.skills[0];
        await t.query(
          `INSERT INTO reviews (id, tasker_id, author_name, rating, body, category_id, created_at)
           VALUES ($1,$2,$3,$4,$5,$6, now() - ($7 || ' days')::interval)`,
          [newId("r_"), s.id, r.name, r.rating, r.text, cat, String(k === 0 ? 1 : k * 7)]
        );
      }
    }
    await t.query("INSERT INTO promo_codes (code, discount_cents) VALUES ('LIB5', 500), ('LONESTAR10', 1000)");
  });
}
