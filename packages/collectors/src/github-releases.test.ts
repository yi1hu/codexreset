import { describe, expect, it, vi } from "vitest";

import { GitHubCodexReleasesCollector } from "./github-releases";

describe("GitHubCodexReleasesCollector", () => {
  it("normalizes public releases and sends conditional request headers", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("if-none-match")).toBe('"release-v1"');
      expect(headers.get("authorization")).toBe("Bearer test-token");

      return Response.json(
        [
          {
            id: 42,
            tag_name: "rust-v1.2.3",
            name: "Codex CLI 1.2.3",
            body: "A published release.",
            html_url: "https://github.com/openai/codex/releases/tag/rust-v1.2.3",
            created_at: "2026-09-27T10:00:00Z",
            published_at: "2026-09-27T11:00:00Z",
            draft: false,
            prerelease: false,
            author: { login: "openai-release-bot" },
          },
        ],
        { headers: { ETag: '"release-v2"' } },
      );
    }) as typeof fetch;

    const result = await new GitHubCodexReleasesCollector("test-token").collect({
      etag: '"release-v1"',
      cursor: {},
      fetcher,
    });

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toMatchObject({
      externalId: "42",
      authorHandle: "openai-release-bot",
      contentText: "Codex CLI 1.2.3\n\nA published release.",
    });
    expect(result.etag).toBe('"release-v2"');
  });
});
