export interface CollectorDefinition {
  id: string;
  displayName: string;
  enabled: boolean;
}

export const collectorPackageStatus = "foundation-only" as const;
