import type { CollectedPost, CollectorSourceSeed } from "@codexreset/domain";

export interface CollectorContext {
  etag: string | null;
  cursor: Record<string, unknown>;
  fetcher?: typeof fetch;
}

export interface CollectorResult {
  posts: CollectedPost[];
  etag: string | null;
  cursor: Record<string, unknown>;
  notModified: boolean;
}

export interface SourceCollector {
  definition: CollectorSourceSeed;
  collect(context: CollectorContext): Promise<CollectorResult>;
}

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

export interface FinishRunInput {
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

export interface CollectorStore {
  ensureSources(definitions: CollectorSourceSeed[]): Promise<void>;
  getSource(name: string): Promise<CollectorSourceState | undefined>;
  startRun(sourceId: string, startedAt: Date): Promise<string>;
  insertPosts(sourceId: string, posts: CollectedPost[], collectedAt: Date): Promise<number>;
  finishRun(input: FinishRunInput): Promise<void>;
}

export interface CollectorRunResult {
  sourceName: string;
  status: "skipped" | "succeeded" | "failed";
  fetchedCount: number;
  insertedCount: number;
  reason?: string;
}
