import type { CollectedPost, CollectorSourceSeed } from "@codexreset/domain";
import { describe, expect, it } from "vitest";

import { contentHash } from "./hash";
import { runCollectors } from "./runner";
import type {
  CollectorSourceState,
  CollectorStore,
  FinishRunInput,
  SourceCollector,
} from "./types";

function definition(name: string): CollectorSourceSeed {
  return {
    name,
    displayName: name,
    kind: "manual",
    baseUrl: "https://example.test",
    trustTier: "A1",
    pollIntervalSeconds: 60,
    enabled: true,
    configuration: {},
  };
}

function post(externalId: string): CollectedPost {
  const contentText = `post-${externalId}`;
  return {
    externalId,
    authorHandle: null,
    authorDisplayName: null,
    sourceUrl: `https://example.test/${externalId}`,
    relationType: "original",
    publishedAt: new Date("2026-09-28T00:00:00Z"),
    contentText,
    contentHash: contentHash(contentText),
    rawPayload: {},
  };
}

class MemoryStore implements CollectorStore {
  readonly sources = new Map<string, CollectorSourceState>();
  readonly posts = new Set<string>();
  readonly finished: FinishRunInput[] = [];
  private runNumber = 0;

  async ensureSources(definitions: CollectorSourceSeed[]): Promise<void> {
    for (const item of definitions) {
      if (this.sources.has(item.name)) continue;
      this.sources.set(item.name, {
        id: `source-${item.name}`,
        name: item.name,
        enabled: item.enabled,
        pollIntervalSeconds: item.pollIntervalSeconds,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastError: null,
        cursor: {},
        etag: null,
      });
    }
  }

  async getSource(name: string): Promise<CollectorSourceState | undefined> {
    return this.sources.get(name);
  }

  async startRun(): Promise<string> {
    this.runNumber += 1;
    return `run-${this.runNumber}`;
  }

  async insertPosts(sourceId: string, posts: CollectedPost[]): Promise<number> {
    let inserted = 0;
    for (const item of posts) {
      const key = `${sourceId}:${item.externalId}:${item.contentHash}`;
      if (this.posts.has(key)) continue;
      this.posts.add(key);
      inserted += 1;
    }
    return inserted;
  }

  async finishRun(input: FinishRunInput): Promise<void> {
    this.finished.push(input);
  }
}

function successfulCollector(name: string): SourceCollector {
  return {
    definition: definition(name),
    async collect() {
      return { posts: [post("same")], etag: '"v1"', cursor: {}, notModified: false };
    },
  };
}

describe("runCollectors", () => {
  it("isolates a failing source and continues the collection cycle", async () => {
    const store = new MemoryStore();
    const failed: SourceCollector = {
      definition: definition("failed"),
      async collect() {
        throw new Error("upstream unavailable");
      },
    };

    const results = await runCollectors({
      collectors: [failed, successfulCollector("healthy")],
      store,
      force: true,
      now: () => new Date("2026-09-28T00:00:00Z"),
    });

    expect(results.map((result) => result.status)).toEqual(["failed", "succeeded"]);
    expect(store.finished.map((run) => run.status)).toEqual(["FAILED", "SUCCEEDED"]);
  });

  it("reports zero inserts when the same version is collected twice", async () => {
    const store = new MemoryStore();
    const collector = successfulCollector("idempotent");

    const first = await runCollectors({ collectors: [collector], store, force: true });
    const second = await runCollectors({ collectors: [collector], store, force: true });

    expect(first[0]?.insertedCount).toBe(1);
    expect(second[0]?.insertedCount).toBe(0);
  });
});
