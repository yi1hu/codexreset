import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const sourceKindEnum = pgEnum("source_kind", [
  "x_api",
  "openai_status",
  "github",
  "aggregator",
  "manual",
]);
export const trustTierEnum = pgEnum("trust_tier", ["A1", "A2", "B", "C", "D"]);
export const relationTypeEnum = pgEnum("relation_type", [
  "original",
  "reply",
  "quote",
  "repost",
  "unknown",
]);
export const signalClassificationEnum = pgEnum("signal_classification", [
  "USER_RUMOR",
  "STAFF_HINT",
  "STAFF_SCHEDULE",
  "STAFF_COMPLETION",
  "OFFICIAL_STATUS",
]);
export const resetModeEnum = pgEnum("reset_mode", [
  "HARD_RESET",
  "BANKED_RESET",
  "NONE",
  "UNKNOWN",
]);
export const signalPhaseEnum = pgEnum("signal_phase", [
  "HINT",
  "SCHEDULED",
  "COMPLETED",
  "UNKNOWN",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "AUTO_PENDING",
  "AUTO_CONFIRMED",
  "MANUAL_CONFIRMED",
  "REJECTED",
]);
export const evidenceBasisEnum = pgEnum("evidence_basis", [
  "TEXT_EXPLICIT",
  "TEXT_IMPLIED",
  "STRUCTURAL",
  "MANUAL",
]);
export const resetEventTypeEnum = pgEnum("reset_event_type", [
  "HARD_RESET",
  "RESET_CARD",
  "POLICY_CHANGE",
]);
export const resetEventStatusEnum = pgEnum("reset_event_status", [
  "CONFIRMED",
  "CORRECTED",
  "RETRACTED",
]);
export const confirmationMethodEnum = pgEnum("confirmation_method", [
  "FIRST_PARTY_AUTO",
  "MANUAL",
]);
export const evidenceRoleEnum = pgEnum("evidence_role", [
  "PRIMARY",
  "CORROBORATING",
  "CONTRADICTING",
]);
export const collectorRunStatusEnum = pgEnum("collector_run_status", [
  "RUNNING",
  "SUCCEEDED",
  "PARTIAL",
  "FAILED",
]);
export const forecastOutcomeEnum = pgEnum("forecast_outcome", [
  "PENDING",
  "OCCURRED",
  "NOT_OCCURRED",
  "INVALIDATED",
]);
export const dataSufficiencyEnum = pgEnum("data_sufficiency", [
  "INSUFFICIENT",
  "LIMITED",
  "SUFFICIENT",
]);
export const confidenceLevelEnum = pgEnum("confidence_level", ["LOW", "MEDIUM", "HIGH"]);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: sourceKindEnum("kind").notNull(),
    baseUrl: text("base_url"),
    trustTier: trustTierEnum("trust_tier").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    pollIntervalSeconds: integer("poll_interval_seconds").notNull().default(600),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastErrorAt: timestamp("last_error_at", { withTimezone: true }),
    lastError: text("last_error"),
    cursor: jsonb("cursor").$type<Record<string, unknown>>().notNull().default({}),
    etag: text("etag"),
    configuration: jsonb("configuration").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [uniqueIndex("sources_name_unique").on(table.name)],
);

export const rawPosts = pgTable(
  "raw_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    externalId: text("external_id").notNull(),
    authorHandle: text("author_handle"),
    authorDisplayName: text("author_display_name"),
    sourceUrl: text("source_url").notNull(),
    relationType: relationTypeEnum("relation_type").notNull().default("unknown"),
    replyTargetId: uuid("reply_target_id"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    collectedAt: timestamp("collected_at", { withTimezone: true }).notNull().defaultNow(),
    contentText: text("content_text").notNull(),
    contentHash: text("content_hash").notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("raw_posts_source_external_hash_unique").on(
      table.sourceId,
      table.externalId,
      table.contentHash,
    ),
    index("raw_posts_published_at_idx").on(table.publishedAt),
  ],
);

export const signals = pgTable(
  "signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rawPostId: uuid("raw_post_id")
      .notNull()
      .references(() => rawPosts.id, { onDelete: "cascade" }),
    classification: signalClassificationEnum("classification").notNull(),
    resetMode: resetModeEnum("reset_mode").notNull().default("UNKNOWN"),
    phase: signalPhaseEnum("phase").notNull().default("UNKNOWN"),
    evidenceBasis: evidenceBasisEnum("evidence_basis").notNull(),
    verificationStatus: verificationStatusEnum("verification_status")
      .notNull()
      .default("AUTO_PENDING"),
    confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
    classifierVersion: text("classifier_version").notNull(),
    rationale: text("rationale").notNull(),
    labels: jsonb("labels").$type<string[]>().notNull().default([]),
    verifiedBy: text("verified_by"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("signals_raw_post_classifier_unique").on(
      table.rawPostId,
      table.classifierVersion,
    ),
    index("signals_classification_idx").on(table.classification),
  ],
);

export const resetEvents = pgTable(
  "reset_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: resetEventTypeEnum("event_type").notNull(),
    status: resetEventStatusEnum("status").notNull().default("CONFIRMED"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    confirmationMethod: confirmationMethodEnum("confirmation_method").notNull(),
    summary: text("summary").notNull(),
    notes: text("notes"),
    createdBy: text("created_by").notNull(),
    ...timestamps,
  },
  (table) => [index("reset_events_occurred_at_idx").on(table.occurredAt)],
);

export const resetEventEvidence = pgTable(
  "reset_event_evidence",
  {
    resetEventId: uuid("reset_event_id")
      .notNull()
      .references(() => resetEvents.id, { onDelete: "cascade" }),
    signalId: uuid("signal_id")
      .notNull()
      .references(() => signals.id, { onDelete: "restrict" }),
    role: evidenceRoleEnum("role").notNull(),
    attachedAt: timestamp("attached_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.resetEventId, table.signalId] }),
    index("reset_event_evidence_signal_idx").on(table.signalId),
  ],
);

export const forecastSnapshots = pgTable(
  "forecast_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    modelVersion: text("model_version").notNull(),
    forecastFor: timestamp("forecast_for", { withTimezone: true }).notNull(),
    horizonHours: integer("horizon_hours").notNull(),
    probability: numeric("probability", { precision: 5, scale: 4 }).notNull(),
    confidenceLevel: confidenceLevelEnum("confidence_level").notNull(),
    dataSufficiency: dataSufficiencyEnum("data_sufficiency").notNull(),
    featureSnapshot: jsonb("feature_snapshot").$type<Record<string, unknown>>().notNull(),
    explanation: text("explanation").notNull(),
    outcome: forecastOutcomeEnum("outcome").notNull().default("PENDING"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    brierScore: numeric("brier_score", { precision: 8, scale: 6 }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("forecast_snapshots_model_time_horizon_unique").on(
      table.modelVersion,
      table.forecastFor,
      table.horizonHours,
    ),
    index("forecast_snapshots_forecast_for_idx").on(table.forecastFor),
  ],
);

export const collectorRuns = pgTable(
  "collector_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    status: collectorRunStatusEnum("status").notNull().default("RUNNING"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    itemsFetched: integer("items_fetched").notNull().default(0),
    itemsInserted: integer("items_inserted").notNull().default(0),
    errorMessage: text("error_message"),
    checkpoint: jsonb("checkpoint").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("collector_runs_source_started_idx").on(table.sourceId, table.startedAt)],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor: text("actor").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason"),
    beforeState: jsonb("before_state").$type<Record<string, unknown>>(),
    afterState: jsonb("after_state").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admin_audit_logs_target_idx").on(table.targetType, table.targetId)],
);
