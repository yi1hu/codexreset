import {
  createDefaultCollectors,
  runCollectors,
  type CollectorRunResult,
  type CollectorStore,
} from "@codexreset/collectors";
import {
  ensureCollectorSources,
  finishCollectorRun,
  getCollectorSource,
  insertCollectedPosts,
  startCollectorRun,
} from "@codexreset/db";
import { getServerEnv } from "@codexreset/shared";

const store: CollectorStore = {
  ensureSources: ensureCollectorSources,
  getSource: getCollectorSource,
  startRun: startCollectorRun,
  insertPosts: insertCollectedPosts,
  finishRun: finishCollectorRun,
};

export async function runCollectionCycle(force = false): Promise<CollectorRunResult[]> {
  const env = getServerEnv();
  const collectors = createDefaultCollectors({ githubToken: env.GITHUB_TOKEN });
  return runCollectors({ collectors, store, force });
}
