import { describe, expect, it, vi } from "vitest";

import { fetchJson } from "./http";

describe("fetchJson", () => {
  it("respects Retry-After before retrying a transient response", async () => {
    const responses = [
      new Response("busy", { status: 429, headers: { "Retry-After": "2" } }),
      Response.json({ ok: true }, { headers: { ETag: '"v2"' } }),
    ];
    const fetcher = vi.fn(async () => responses.shift() as Response) as typeof fetch;
    const delays: number[] = [];

    const result = await fetchJson<{ ok: boolean }>({
      url: "https://example.test/data",
      fetcher,
      sleep: async (milliseconds) => {
        delays.push(milliseconds);
      },
    });

    expect(result.data).toEqual({ ok: true });
    expect(result.etag).toBe('"v2"');
    expect(delays).toEqual([2_000]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("preserves the prior ETag on a 304 response", async () => {
    const fetcher = vi.fn(
      async () => new Response(null, { status: 304 }),
    ) as unknown as typeof fetch;

    const result = await fetchJson({
      url: "https://example.test/data",
      etag: '"v1"',
      fetcher,
    });

    expect(result).toEqual({ etag: '"v1"', notModified: true });
  });
});
