import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL is required before opening a database connection");
    }

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }

  return pool;
}

export function getDatabase() {
  return drizzle(getPool(), { schema });
}

export async function pingDatabase(): Promise<void> {
  await getPool().query("select 1");
}

export async function closeDatabase(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
