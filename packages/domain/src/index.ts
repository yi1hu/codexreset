export const signalClassifications = [
  "USER_RUMOR",
  "STAFF_HINT",
  "STAFF_SCHEDULE",
  "STAFF_COMPLETION",
  "OFFICIAL_STATUS",
] as const;

export const resetModes = ["HARD_RESET", "BANKED_RESET", "NONE", "UNKNOWN"] as const;

export const signalPhases = ["HINT", "SCHEDULED", "COMPLETED", "UNKNOWN"] as const;

export const trustTiers = ["A1", "A2", "B", "C", "D"] as const;

export const sourceKinds = [
  "x_api",
  "openai_status",
  "github",
  "aggregator",
  "manual",
] as const;

export const relationTypes = ["original", "reply", "quote", "repost", "unknown"] as const;

export const confidenceLevels = ["LOW", "MEDIUM", "HIGH"] as const;

export type SignalClassification = (typeof signalClassifications)[number];
export type ResetMode = (typeof resetModes)[number];
export type SignalPhase = (typeof signalPhases)[number];
export type TrustTier = (typeof trustTiers)[number];
export type ConfidenceLevel = (typeof confidenceLevels)[number];
export type SourceKind = (typeof sourceKinds)[number];
export type RelationType = (typeof relationTypes)[number];

export interface CollectorSourceSeed {
  name: string;
  displayName: string;
  kind: SourceKind;
  baseUrl: string;
  trustTier: TrustTier;
  pollIntervalSeconds: number;
  enabled: boolean;
  configuration: Record<string, unknown>;
}

export interface CollectedPost {
  externalId: string;
  authorHandle: string | null;
  authorDisplayName: string | null;
  sourceUrl: string;
  relationType: RelationType;
  publishedAt: Date;
  contentText: string;
  contentHash: string;
  rawPayload: Record<string, unknown>;
}

export interface EvidenceReference {
  rawPostId: string;
  sourceName: string;
  sourceUrl: string;
  trustTier: TrustTier;
  publishedAt: Date;
}

export interface ForecastProbability {
  horizonHours: 24 | 72 | 168;
  probability: number;
  confidence: ConfidenceLevel;
}
