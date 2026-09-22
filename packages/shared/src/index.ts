import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z.url().default("http://localhost:3000"),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(600_000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(input: NodeJS.ProcessEnv = process.env): ServerEnv {
  return serverEnvSchema.parse(input);
}
