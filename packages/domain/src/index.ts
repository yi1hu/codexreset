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

export const confidenceLevels = ["LOW", "MEDIUM", "HIGH"] as const;

export type SignalClassification = (typeof signalClassifications)[number];
export type ResetMode = (typeof resetModes)[number];
export type SignalPhase = (typeof signalPhases)[number];
export type TrustTier = (typeof trustTiers)[number];
export type ConfidenceLevel = (typeof confidenceLevels)[number];

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
