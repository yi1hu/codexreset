import { createHash } from "node:crypto";

export function contentHash(content: string): string {
  const normalized = content.replaceAll("\r\n", "\n").trim();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}
