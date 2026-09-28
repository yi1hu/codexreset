import { describe, expect, it, vi } from "vitest";

import { OpenAIStatusCollector } from "./openai-status";

describe("OpenAIStatusCollector", () => {
  it("keeps Codex-related updates and ignores unrelated incidents", async () => {
    const payload = {
      incidents: [
        {
          id: "incident-codex",
          name: "Issues with Codex",
          created_at: "2026-09-25T22:58:48Z",
          status: "resolved",
          incident_updates: [
            {
              id: "update-codex",
              body: "All impacted services have now fully recovered.",
              created_at: "2026-09-25T23:54:41Z",
              display_at: "2026-09-25T23:54:41Z",
              status: "resolved",
            },
          ],
        },
        {
          id: "incident-unrelated",
          name: "Image API issue",
          created_at: "2026-09-25T20:00:00Z",
          incident_updates: [
            {
              id: "update-unrelated",
              body: "Image requests were delayed.",
              created_at: "2026-09-25T20:00:00Z",
            },
          ],
        },
      ],
    };
    const fetcher = vi.fn(
      async () => Response.json(payload, { headers: { ETag: '"status-v1"' } }),
    ) as unknown as typeof fetch;

    const result = await new OpenAIStatusCollector().collect({
      etag: null,
      cursor: {},
      fetcher,
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({
      externalId: "update-codex",
      authorHandle: "openai-status",
      sourceUrl: "https://status.openai.com/incidents/incident-codex",
      relationType: "original",
    });
    expect(result.posts[0]?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.etag).toBe('"status-v1"');
    expect(result.cursor).toEqual({ latestPublishedAt: "2026-09-25T23:54:41.000Z" });
  });
});
