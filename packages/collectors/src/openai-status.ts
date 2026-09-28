import type { CollectedPost } from "@codexreset/domain";

import { contentHash } from "./hash";
import { fetchJson } from "./http";
import type { CollectorContext, CollectorResult, SourceCollector } from "./types";

interface StatusUpdate {
  id: string;
  body: string;
  created_at: string;
  display_at?: string;
  status?: string;
  updated_at?: string;
  [key: string]: unknown;
}

interface StatusIncident {
  id: string;
  name: string;
  status?: string;
  impact?: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string | null;
  incident_updates: StatusUpdate[];
  [key: string]: unknown;
}

interface StatusPayload {
  incidents: StatusIncident[];
  [key: string]: unknown;
}

const relevantTerms = ["codex", "work mode", "chatgpt work"];

function isStatusPayload(value: unknown): value is StatusPayload {
  if (!value || typeof value !== "object") return false;
  return Array.isArray((value as { incidents?: unknown }).incidents);
}

function isRelevantIncident(incident: StatusIncident): boolean {
  const searchable = [incident.name, ...incident.incident_updates.map((update) => update.body)]
    .join("\n")
    .toLowerCase();
  return relevantTerms.some((term) => searchable.includes(term));
}

function toPost(incident: StatusIncident, update: StatusUpdate): CollectedPost | undefined {
  if (!update.id || !update.body) return undefined;

  const publishedAt = new Date(update.display_at ?? update.created_at);
  if (Number.isNaN(publishedAt.getTime())) return undefined;

  const contentText = `${incident.name}\n\n${update.body}`.trim();

  return {
    externalId: update.id,
    authorHandle: "openai-status",
    authorDisplayName: "OpenAI Status",
    sourceUrl: `https://status.openai.com/incidents/${incident.id}`,
    relationType: "original",
    publishedAt,
    contentText,
    contentHash: contentHash(contentText),
    rawPayload: {
      incident: {
        id: incident.id,
        name: incident.name,
        status: incident.status,
        impact: incident.impact,
        created_at: incident.created_at,
        updated_at: incident.updated_at,
        resolved_at: incident.resolved_at,
      },
      update,
    },
  };
}

export class OpenAIStatusCollector implements SourceCollector {
  readonly definition = {
    name: "openai-status-codex",
    displayName: "OpenAI Status — Codex",
    kind: "openai_status" as const,
    baseUrl: "https://status.openai.com",
    trustTier: "A1" as const,
    pollIntervalSeconds: 300,
    enabled: true,
    configuration: {
      endpoint: "/api/v2/incidents.json",
      relevantTerms,
      scope: "Codex and Work incidents only",
    },
  };

  async collect(context: CollectorContext): Promise<CollectorResult> {
    const response = await fetchJson<StatusPayload>({
      url: `${this.definition.baseUrl}/api/v2/incidents.json`,
      etag: context.etag,
      fetcher: context.fetcher,
      headers: { Accept: "application/json" },
    });

    if (response.notModified) {
      return { posts: [], etag: response.etag, cursor: context.cursor, notModified: true };
    }

    if (!isStatusPayload(response.data)) {
      throw new Error("OpenAI Status returned an unexpected payload");
    }

    const posts = response.data.incidents
      .filter(isRelevantIncident)
      .flatMap((incident) => incident.incident_updates.map((update) => toPost(incident, update)))
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
