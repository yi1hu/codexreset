CREATE TYPE "public"."collector_run_status" AS ENUM('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."confidence_level" AS ENUM('LOW', 'MEDIUM', 'HIGH');--> statement-breakpoint
CREATE TYPE "public"."confirmation_method" AS ENUM('FIRST_PARTY_AUTO', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."data_sufficiency" AS ENUM('INSUFFICIENT', 'LIMITED', 'SUFFICIENT');--> statement-breakpoint
CREATE TYPE "public"."evidence_basis" AS ENUM('TEXT_EXPLICIT', 'TEXT_IMPLIED', 'STRUCTURAL', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."evidence_role" AS ENUM('PRIMARY', 'CORROBORATING', 'CONTRADICTING');--> statement-breakpoint
CREATE TYPE "public"."forecast_outcome" AS ENUM('PENDING', 'OCCURRED', 'NOT_OCCURRED', 'INVALIDATED');--> statement-breakpoint
CREATE TYPE "public"."relation_type" AS ENUM('original', 'reply', 'quote', 'repost', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."reset_event_status" AS ENUM('CONFIRMED', 'CORRECTED', 'RETRACTED');--> statement-breakpoint
CREATE TYPE "public"."reset_event_type" AS ENUM('HARD_RESET', 'RESET_CARD', 'POLICY_CHANGE');--> statement-breakpoint
CREATE TYPE "public"."reset_mode" AS ENUM('HARD_RESET', 'BANKED_RESET', 'NONE', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."signal_classification" AS ENUM('USER_RUMOR', 'STAFF_HINT', 'STAFF_SCHEDULE', 'STAFF_COMPLETION', 'OFFICIAL_STATUS');--> statement-breakpoint
CREATE TYPE "public"."signal_phase" AS ENUM('HINT', 'SCHEDULED', 'COMPLETED', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('x_api', 'openai_status', 'github', 'aggregator', 'manual');--> statement-breakpoint
CREATE TYPE "public"."trust_tier" AS ENUM('A1', 'A2', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('AUTO_PENDING', 'AUTO_CONFIRMED', 'MANUAL_CONFIRMED', 'REJECTED');--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"reason" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collector_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"status" "collector_run_status" DEFAULT 'RUNNING' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"items_fetched" integer DEFAULT 0 NOT NULL,
	"items_inserted" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"checkpoint" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecast_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_version" text NOT NULL,
	"forecast_for" timestamp with time zone NOT NULL,
	"horizon_hours" integer NOT NULL,
	"probability" numeric(5, 4) NOT NULL,
	"confidence_level" "confidence_level" NOT NULL,
	"data_sufficiency" "data_sufficiency" NOT NULL,
	"feature_snapshot" jsonb NOT NULL,
	"explanation" text NOT NULL,
	"outcome" "forecast_outcome" DEFAULT 'PENDING' NOT NULL,
	"resolved_at" timestamp with time zone,
	"brier_score" numeric(8, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"author_handle" text,
	"author_display_name" text,
	"source_url" text NOT NULL,
	"relation_type" "relation_type" DEFAULT 'unknown' NOT NULL,
	"reply_target_id" uuid,
	"published_at" timestamp with time zone NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"content_text" text NOT NULL,
	"content_hash" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reset_event_evidence" (
	"reset_event_id" uuid NOT NULL,
	"signal_id" uuid NOT NULL,
	"role" "evidence_role" NOT NULL,
	"attached_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reset_event_evidence_reset_event_id_signal_id_pk" PRIMARY KEY("reset_event_id","signal_id")
);
--> statement-breakpoint
CREATE TABLE "reset_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "reset_event_type" NOT NULL,
	"status" "reset_event_status" DEFAULT 'CONFIRMED' NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmation_method" "confirmation_method" NOT NULL,
	"summary" text NOT NULL,
	"notes" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"raw_post_id" uuid NOT NULL,
	"classification" "signal_classification" NOT NULL,
	"reset_mode" "reset_mode" DEFAULT 'UNKNOWN' NOT NULL,
	"phase" "signal_phase" DEFAULT 'UNKNOWN' NOT NULL,
	"evidence_basis" "evidence_basis" NOT NULL,
	"verification_status" "verification_status" DEFAULT 'AUTO_PENDING' NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"classifier_version" text NOT NULL,
	"rationale" text NOT NULL,
	"labels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified_by" text,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" "source_kind" NOT NULL,
	"base_url" text,
	"trust_tier" "trust_tier" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"configuration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collector_runs" ADD CONSTRAINT "collector_runs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_posts" ADD CONSTRAINT "raw_posts_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_event_evidence" ADD CONSTRAINT "reset_event_evidence_reset_event_id_reset_events_id_fk" FOREIGN KEY ("reset_event_id") REFERENCES "public"."reset_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reset_event_evidence" ADD CONSTRAINT "reset_event_evidence_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_raw_post_id_raw_posts_id_fk" FOREIGN KEY ("raw_post_id") REFERENCES "public"."raw_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_logs_target_idx" ON "admin_audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "collector_runs_source_started_idx" ON "collector_runs" USING btree ("source_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "forecast_snapshots_model_time_horizon_unique" ON "forecast_snapshots" USING btree ("model_version","forecast_for","horizon_hours");--> statement-breakpoint
CREATE INDEX "forecast_snapshots_forecast_for_idx" ON "forecast_snapshots" USING btree ("forecast_for");--> statement-breakpoint
CREATE UNIQUE INDEX "raw_posts_source_external_hash_unique" ON "raw_posts" USING btree ("source_id","external_id","content_hash");--> statement-breakpoint
CREATE INDEX "raw_posts_published_at_idx" ON "raw_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "reset_event_evidence_signal_idx" ON "reset_event_evidence" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "reset_events_occurred_at_idx" ON "reset_events" USING btree ("occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "signals_raw_post_classifier_unique" ON "signals" USING btree ("raw_post_id","classifier_version");--> statement-breakpoint
CREATE INDEX "signals_classification_idx" ON "signals" USING btree ("classification");--> statement-breakpoint
CREATE UNIQUE INDEX "sources_name_unique" ON "sources" USING btree ("name");