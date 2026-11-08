import { Database } from "bun:sqlite";
import { resolve } from "node:path";
import { env } from "@lilia/api/config/env.ts";

const db = new Database(resolve(env.DATABASE_URL), { readonly: true });
const tables = db
  .query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  )
  .all() as { name: string }[];
for (const { name } of tables) {
  const safeName = name.replaceAll('"', '""');
  const rows = db.query(`SELECT COUNT(*) AS count FROM "${safeName}"`).get() as { count: number };
  console.log(`${name}: ${rows.count}`);
}
db.close();
