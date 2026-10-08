// Runs the paste-friendly setup files against PGlite with a stub of Supabase's
// auth schema, to prove they work as-is. Run: npm run check:setup
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const STUB = `create role anon nologin; create role authenticated nologin; create role service_role nologin;
  create schema auth; create table auth.users (id uuid primary key default gen_random_uuid(), phone text);
  create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  create publication supabase_realtime;`;

for (const files of [["setup.sql"], ["setup/1-tables.sql", "setup/2-functions.sql", "setup/3-catalog.sql", "setup/4-reviews.sql"]]) {
  const db = await PGlite.create();
  await db.exec(STUB);
  for (const f of files) await db.exec(readFileSync(new URL(`../supabase/${f}`, import.meta.url), "utf8"));
  const { n } = (await db.query("select count(*)::int n from public.taskers")).rows[0];
  const { r } = (await db.query("select count(*)::int r from public.reviews")).rows[0];
  console.log(`${files.join(" + ")}: OK (${n} taskers, ${r} reviews)`);
}
