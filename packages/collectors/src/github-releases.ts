import type { CollectedPost } from "@codexreset/domain";

import { contentHash } from "./hash";
import { fetchJson } from "./http";
import type { CollectorContext, CollectorResult, SourceCollector } from "./types";

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  created_at: string;
  published_at: string | null;
  draft: boolean;
  prerelease: boolean;
  author?: {
    login?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function isReleaseList(value: unknown): value is GitHubRelease[] {
  return Array.isArray(value);
}

function toPost(release: GitHubRelease): CollectedPost | undefined {
  if (!release.id || !release.tag_name || !release.html_url || release.draft) return undefined;

  const publishedAt = new Date(release.published_at ?? release.created_at);
  if (Number.isNaN(publishedAt.getTime())) return undefined;

  const title = release.name?.trim() || release.tag_name;
  const contentText = `${title}\n\n${release.body ?? ""}`.trim();

  return {
    externalId: String(release.id),
    authorHandle: release.author?.login ?? null,
    authorDisplayName: release.author?.login ?? "OpenAI",
    sourceUrl: release.html_url,
    relationType: "original",
    publishedAt,
    contentText,
    contentHash: contentHash(contentText),
    rawPayload: release,
  };
}

export class GitHubCodexReleasesCollector implements SourceCollector {
  readonly definition = {
    name: "github-openai-codex-releases",
    displayName: "OpenAI Codex Releases",
    kind: "github" as const,
    baseUrl: "https://github.com/openai/codex",
    trustTier: "A1" as const,
    pollIntervalSeconds: 900,
    enabled: true,
    configuration: {
      endpoint: "https://api.github.com/repos/openai/codex/releases?per_page=30",
      repository: "openai/codex",
      scope: "published releases only",
    },
  };

  constructor(private readonly token?: string) {}

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const headers = new Headers({
      Accept: "application/vnd.github+json",
      "User-Agent": "codex-reset-observatory/0.1",
      "X-GitHub-Api-Version": "2026-03-10",
    });
    if (this.token) headers.set("Authorization", `Bearer ${this.token}`);

    const response = await fetchJson<GitHubRelease[]>({
      url: "https://api.github.com/repos/openai/codex/releases?per_page=30",
      etag: context.etag,
      fetcher: context.fetcher,
      headers,
    });

    if (response.notModified) {
      return { posts: [], etag: response.etag, cursor: context.cursor, notModified: true };
    }

    if (!isReleaseList(response.data)) {
      throw new Error("GitHub Releases returned an unexpected payload");
    }

    const posts = response.data
      .map(toPost)
      .filter((post): post is CollectedPost => Boolean(post));
    const latestPublishedAt = posts.reduce<string | null>((latest, post) => {
      const value = post.publishedAt.toISOString();
      return !latest || value > latest ? value : latest;
    }, null);

    return {
      posts,
      etag: response.etag,
      cursor: latestPublishedAt ? { latestPublishedAt } : context.cursor,
      notModified: false,
    };
  }
}
