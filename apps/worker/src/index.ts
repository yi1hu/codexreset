import "dotenv/config";

import { closeDatabase, pingDatabase } from "@codexreset/db";
import { getServerEnv } from "@codexreset/shared";

const env = getServerEnv();
let shuttingDown = false;

async function checkFoundation(): Promise<void> {
  try {
    await pingDatabase();
    console.info(
      JSON.stringify({
        component: "worker",
        event: "foundation_check",
        database: "ok",
        checkedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        component: "worker",
        event: "foundation_check",
        database: "unavailable",
        checkedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Unknown database error",
      }),
    );
  }
}

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(JSON.stringify({ component: "worker", event: "shutdown", signal }));
  await closeDatabase();
  process.exit(0);
}

console.info(
  JSON.stringify({
    component: "worker",
    event: "started",
    pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
  }),
);

void checkFoundation();
setInterval(() => void checkFoundation(), env.WORKER_POLL_INTERVAL_MS);

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
