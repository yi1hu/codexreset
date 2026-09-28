import { GitHubCodexReleasesCollector } from "./github-releases";
import { OpenAIStatusCollector } from "./openai-status";
import type { SourceCollector } from "./types";

export interface DefaultCollectorOptions {
  githubToken?: string;
}

export function createDefaultCollectors(options: DefaultCollectorOptions = {}): SourceCollector[] {
  return [new OpenAIStatusCollector(), new GitHubCodexReleasesCollector(options.githubToken)];
}
