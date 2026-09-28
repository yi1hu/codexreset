import "dotenv/config";

import { closeDatabase } from "@codexreset/db";
import { getServerEnv } from "@codexreset/shared";

import { runCollectionCycle } from "./runtime";

const env = getServerEnv();
let shuttingDown = false;
let cycleRunning = false;

async function runScheduledCycle(): Promise<void> {
  if (cycleRunning) {
    console.warn(JSON.stringify({ component: "worker", event: "cycle_skipped", reason: "busy" }));
    return;
  }

  cycleRunning = true;
  try {
    const results = await runCollectionCycle();
    console.info(
      JSON.stringify({
        component: "worker",
        event: "collection_cycle",
        results,
        checkedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        component: "worker",
        event: "collection_cycle_failed",
        checkedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : "Unknown worker error",
      }),
    );
  } finally {
    cycleRunning = false;
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

void runScheduledCycle();
setInterval(() => void runScheduledCycle(), env.WORKER_POLL_INTERVAL_MS);

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
