import type { CollectorRunResult, CollectorStore, SourceCollector } from "./types";

export interface RunCollectorsOptions {
  collectors: SourceCollector[];
  store: CollectorStore;
  now?: () => Date;
  force?: boolean;
}

function lastAttemptAt(source: {
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
}): Date | null {
  if (!source.lastSuccessAt) return source.lastErrorAt;
  if (!source.lastErrorAt) return source.lastSuccessAt;
  return source.lastSuccessAt > source.lastErrorAt ? source.lastSuccessAt : source.lastErrorAt;
}

function isDue(
  source: { pollIntervalSeconds: number; lastSuccessAt: Date | null; lastErrorAt: Date | null },
  now: Date,
): boolean {
  const lastAttempt = lastAttemptAt(source);
  if (!lastAttempt) return true;
  return now.getTime() - lastAttempt.getTime() >= source.pollIntervalSeconds * 1_000;
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 1_000);
  return "Unknown collector error";
}

export async function runCollectors(options: RunCollectorsOptions): Promise<CollectorRunResult[]> {
  await options.store.ensureSources(options.collectors.map((collector) => collector.definition));

  const results: CollectorRunResult[] = [];

  for (const collector of options.collectors) {
    const source = await options.store.getSource(collector.definition.name);

    if (!source || !source.enabled) {
      results.push({
        sourceName: collector.definition.name,
        status: "skipped",
        fetchedCount: 0,
        insertedCount: 0,
        reason: source ? "disabled" : "source-not-found",
      });
      continue;
    }

    const startedAt = options.now?.() ?? new Date();
    if (!options.force && !isDue(source, startedAt)) {
      results.push({
        sourceName: source.name,
        status: "skipped",
        fetchedCount: 0,
        insertedCount: 0,
        reason: "not-due",
      });
      continue;
    }

    const runId = await options.store.startRun(source.id, startedAt);

    try {
      const collected = await collector.collect({ etag: source.etag, cursor: source.cursor });
      const finishedAt = options.now?.() ?? new Date();
      const insertedCount = await options.store.insertPosts(
        source.id,
        collected.posts,
        finishedAt,
      );

      await options.store.finishRun({
        runId,
        sourceId: source.id,
        status: "SUCCEEDED",
        fetchedCount: collected.posts.length,
        insertedCount,
        errorMessage: null,
        etag: collected.etag,
        cursor: collected.cursor,
        finishedAt,
      });

      results.push({
        sourceName: source.name,
        status: "succeeded",
        fetchedCount: collected.posts.length,
        insertedCount,
        reason: collected.notModified ? "not-modified" : undefined,
      });
    } catch (error) {
      const finishedAt = options.now?.() ?? new Date();
      const message = safeErrorMessage(error);

      await options.store.finishRun({
        runId,
        sourceId: source.id,
        status: "FAILED",
        fetchedCount: 0,
        insertedCount: 0,
        errorMessage: message,
        finishedAt,
      });

      results.push({
        sourceName: source.name,
        status: "failed",
        fetchedCount: 0,
        insertedCount: 0,
        reason: message,
      });
    }
  }

  return results;
}
