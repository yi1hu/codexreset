import "dotenv/config";

import { migrate } from "drizzle-orm/node-postgres/migrator";

import { closeDatabase, getDatabase } from "./client";

async function main(): Promise<void> {
  await migrate(getDatabase(), { migrationsFolder: "packages/db/migrations" });
  console.info("Database migrations completed.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
