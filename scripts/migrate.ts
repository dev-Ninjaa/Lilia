import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "@lilia/api/config/env.ts";

const migrationsDir = resolve("database/migrations");
const filename = resolve(env.DATABASE_URL);
mkdirSync(dirname(filename), { recursive: true });
const db = new Database(filename, { create: true });
db.exec("PRAGMA foreign_keys = ON");
db.exec(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
);

const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

let appliedCount = 0;
for (const name of migrations) {
  const applied = db.query("SELECT name FROM schema_migrations WHERE name = ?").get(name);
  if (applied) {
    console.log(`Migration ${name} already applied`);
    continue;
  }
  const sql = readFileSync(resolve(migrationsDir, name), "utf8");
  db.transaction(() => {
    db.exec(sql);
    db.query("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(
      name,
      new Date().toISOString(),
    );
  })();
  appliedCount += 1;
  console.log(`Applied migration ${name}`);
}

console.log(
  appliedCount === 0
    ? "Database is up to date"
    : `Applied ${appliedCount} migration${appliedCount === 1 ? "" : "s"}`,
);
db.close();
