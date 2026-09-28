import type { CollectedPost, CollectorSourceSeed } from "@codexreset/domain";
import { eq } from "drizzle-orm";

import { getDatabase } from "./client";
import { collectorRuns, rawPosts, sources } from "./schema";

export interface CollectorSourceState {
  id: string;
  name: string;
  enabled: boolean;
  pollIntervalSeconds: number;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  cursor: Record<string, unknown>;
  etag: string | null;
}

export interface FinishCollectorRunInput {
  runId: string;
  sourceId: string;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  fetchedCount: number;
  insertedCount: number;
  errorMessage: string | null;
  etag?: string | null;
  cursor?: Record<string, unknown>;
  finishedAt: Date;
}

export type CollectorHealthStatus = "ok" | "stale" | "down" | "never-run";

export interface CollectorHealthItem {
  name: string;
  displayName: string;
  status: CollectorHealthStatus;
  pollIntervalSeconds: number;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
}

export function classifyCollectorHealth(
  source: Pick<
    CollectorSourceState,
    "lastSuccessAt" | "lastErrorAt" | "pollIntervalSeconds"
  >,
  now = new Date(),
): CollectorHealthStatus {
  if (!source.lastSuccessAt) return source.lastErrorAt ? "down" : "never-run";
  if (source.lastErrorAt && source.lastErrorAt > source.lastSuccessAt) return "down";

  const staleAfterMs = source.pollIntervalSeconds * 3_000;
  return now.getTime() - source.lastSuccessAt.getTime() > staleAfterMs ? "stale" : "ok";
}

export async function ensureCollectorSources(definitions: CollectorSourceSeed[]): Promise<void> {
  if (definitions.length === 0) return;

  const db = getDatabase();

  for (const definition of definitions) {
    await db
      .insert(sources)
      .values({
        name: definition.name,
        kind: definition.kind,
        baseUrl: definition.baseUrl,
        trustTier: definition.trustTier,
        enabled: definition.enabled,
        pollIntervalSeconds: definition.pollIntervalSeconds,
        configuration: {
          displayName: definition.displayName,
          ...definition.configuration,
        },
      })
      .onConflictDoUpdate({
        target: sources.name,
        set: {
          kind: definition.kind,
          baseUrl: definition.baseUrl,
          trustTier: definition.trustTier,
          pollIntervalSeconds: definition.pollIntervalSeconds,
          configuration: {
            displayName: definition.displayName,
            ...definition.configuration,
          },
          updatedAt: new Date(),
        },
      });
  }
}

export async function getCollectorSource(name: string): Promise<CollectorSourceState | undefined> {
  const [source] = await getDatabase()
    .select({
      id: sources.id,
      name: sources.name,
      enabled: sources.enabled,
      pollIntervalSeconds: sources.pollIntervalSeconds,
      lastSuccessAt: sources.lastSuccessAt,
      lastErrorAt: sources.lastErrorAt,
      lastError: sources.lastError,
      cursor: sources.cursor,
      etag: sources.etag,
    })
    .from(sources)
    .where(eq(sources.name, name))
    .limit(1);

  return source;
}

export async function startCollectorRun(sourceId: string, startedAt: Date): Promise<string> {
  const [run] = await getDatabase()
    .insert(collectorRuns)
    .values({ sourceId, startedAt, status: "RUNNING" })
    .returning({ id: collectorRuns.id });

  if (!run) throw new Error("Collector run could not be created");
  return run.id;
}

export async function insertCollectedPosts(
  sourceId: string,
  posts: CollectedPost[],
  collectedAt: Date,
): Promise<number> {
  if (posts.length === 0) return 0;

  const inserted = await getDatabase()
    .insert(rawPosts)
    .values(
      posts.map((post) => ({
        sourceId,
        externalId: post.externalId,
        authorHandle: post.authorHandle,
        authorDisplayName: post.authorDisplayName,
        sourceUrl: post.sourceUrl,
        relationType: post.relationType,
        publishedAt: post.publishedAt,
        collectedAt,
        contentText: post.contentText,
        contentHash: post.contentHash,
        rawPayload: post.rawPayload,
      })),
    )
    .onConflictDoNothing({
      target: [rawPosts.sourceId, rawPosts.externalId, rawPosts.contentHash],
    })
    .returning({ id: rawPosts.id });

  return inserted.length;
}

export async function finishCollectorRun(input: FinishCollectorRunInput): Promise<void> {
  const db = getDatabase();

  await db.transaction(async (tx) => {
    await tx
      .update(collectorRuns)
      .set({
        status: input.status,
        finishedAt: input.finishedAt,
        itemsFetched: input.fetchedCount,
        itemsInserted: input.insertedCount,
        errorMessage: input.errorMessage,
        checkpoint: input.cursor ?? {},
      })
      .where(eq(collectorRuns.id, input.runId));

    if (input.status === "FAILED") {
      await tx
        .update(sources)
        .set({
          lastErrorAt: input.finishedAt,
          lastError: input.errorMessage,
          updatedAt: input.finishedAt,
        })
        .where(eq(sources.id, input.sourceId));
      return;
    }

    await tx
      .update(sources)
      .set({
        lastSuccessAt: input.finishedAt,
        lastError: null,
        cursor: input.cursor ?? {},
        etag: input.etag,
        updatedAt: input.finishedAt,
      })
      .where(eq(sources.id, input.sourceId));
  });
}

export async function getCollectorHealth(now = new Date()): Promise<CollectorHealthItem[]> {
  const rows = await getDatabase()
    .select({
      name: sources.name,
      configuration: sources.configuration,
      pollIntervalSeconds: sources.pollIntervalSeconds,
      lastSuccessAt: sources.lastSuccessAt,
      lastErrorAt: sources.lastErrorAt,
      lastError: sources.lastError,
    })
    .from(sources)
    .where(eq(sources.enabled, true));

  return rows.map((source) => ({
    name: source.name,
    displayName:
      typeof source.configuration.displayName === "string"
        ? source.configuration.displayName
        : source.name,
    status: classifyCollectorHealth(source, now),
    pollIntervalSeconds: source.pollIntervalSeconds,
    lastSuccessAt: source.lastSuccessAt,
    lastErrorAt: source.lastErrorAt,
    lastError: source.lastError,
  }));
}
