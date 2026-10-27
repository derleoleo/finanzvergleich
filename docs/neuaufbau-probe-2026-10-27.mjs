// Laesst sich aus `supabase/` eine leere Datenbank aufbauen? (Audit D02)
//
// Gegen echtes Postgres (pglite). Nachgebaut wird nur, was Supabase
// mitbringt und die Migrationen voraussetzen: die drei Rollen, das
// auth-Schema mit `users` und `auth.uid()`. Alles andere kommt aus dem Ordner.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";

const S = "C:/Users/leobr/develop/finanzvergleich-local/supabase";
const db = new PGlite();

await db.exec(`
  create role anon;
  create role authenticated;
  create role service_role;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('probe.uid', true), '')::uuid;
  $$;
`);
console.log("Grundlage steht (Rollen, auth.users, auth.uid)\n");

const dateien = readdirSync(`${S}/migrations`).filter((f) => f.endsWith(".sql")).sort();
let gescheitert = 0;
for (const f of dateien) {
  const sql = readFileSync(`${S}/migrations/${f}`, "utf8");
  try {
    await db.exec(sql);
    console.log(`  ok        ${f}`);
  } catch (e) {
    gescheitert++;
    console.log(`  SCHEITERT ${f}\n              ${String(e.message).slice(0, 160)}`);
  }
}

console.log("\nZugriffsregeln:");
try {
  await db.exec(readFileSync(`${S}/zugriffsregeln-stand.sql`, "utf8"));
  console.log("  ok        zugriffsregeln-stand.sql");
} catch (e) {
  gescheitert++;
  console.log(`  SCHEITERT zugriffsregeln-stand.sql\n              ${String(e.message).slice(0, 200)}`);
}

const zahl = async (sql) => (await db.query(sql)).rows[0].n;
console.log("\n--- Ergebnis ---");
console.log(
  "Tabellen:        ",
  await zahl(`select count(*)::int as n from pg_class where relnamespace='public'::regnamespace and relkind='r'`)
);
console.log(
  "davon mit RLS:   ",
  await zahl(`select count(*)::int as n from pg_class where relnamespace='public'::regnamespace and relkind='r' and relrowsecurity`)
);
console.log(
  "Regeln (Policies):",
  await zahl(`select count(*)::int as n from pg_policies where schemaname='public'`)
);
console.log(
  "Funktionen:      ",
  await zahl(`select count(*)::int as n from pg_proc where pronamespace='public'::regnamespace`)
);
const fehlend = await db.query(`
  select relname from pg_class
  where relnamespace='public'::regnamespace and relkind='r' and not relrowsecurity
  order by relname`);
if (fehlend.rows.length) console.log("OHNE RLS:", fehlend.rows.map((r) => r.relname).join(", "));

// Gegenprobe: Die Haertung muss auch dort laufen, wo die Regeln schon da sind
// - und sie auf `authenticated` stellen. Dazu eine Regel absichtlich auf
// `public` zuruecksetzen und die Migration erneut spielen.
await db.exec(`
  drop policy if exists own_data on public.calculations;
  create policy own_data on public.calculations for all to public
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
`);
const rolle = async () =>
  (
    await db.query(
      `select roles::text as r from pg_policies where tablename='calculations' and policyname='own_data'`
    )
  ).rows[0].r;
const vorher = await rolle();
try {
  await db.exec(readFileSync(`${S}/migrations/20260928120000_rls_haerten.sql`, "utf8"));
  const nachher = await rolle();
  console.log(`\nHaertung erneut gespielt: ${vorher} -> ${nachher}`);
  if (!nachher.includes("authenticated")) gescheitert++;
} catch (e) {
  gescheitert++;
  console.log("\nHaertung SCHEITERT auf bestehenden Regeln:", String(e.message).slice(0, 160));
}

console.log(
  gescheitert === 0
    ? "\nNeuaufbau und Haertung vollstaendig gelungen."
    : `\n${gescheitert} Schritt(e) gescheitert.`
);
