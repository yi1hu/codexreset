import "dotenv/config";

import { closeDatabase } from "@codexreset/db";

import { runCollectionCycle } from "./runtime";

async function main(): Promise<void> {
  const results = await runCollectionCycle(true);
  console.info(JSON.stringify({ component: "worker", event: "collection_cycle", results }));

  if (results.some((result) => result.status === "failed")) {
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
