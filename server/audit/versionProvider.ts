import type { VersionsBlock } from "@shared/audit";

export function getAuditVersions(): VersionsBlock {
  const versions: VersionsBlock = {
    matchingLogicVersion: process.env.MATCHING_LOGIC_VERSION || "mlogic_1.0.0",
    modelVersion: process.env.MODEL_VERSION || "model_unknown",
    featureConfigVersion: process.env.FEATURE_CONFIG_VERSION || "ff_000",
  };

  if (process.env.PROMPT_VERSION) {
    versions.promptVersion = process.env.PROMPT_VERSION;
  }

  if (process.env.EXPLAIN_SCHEMA_VERSION) {
    versions.explainabilitySchemaVersion = process.env.EXPLAIN_SCHEMA_VERSION;
  }

  if (process.env.BIASCFG_VERSION) {
    versions.biasTestConfigVersion = process.env.BIASCFG_VERSION;
  }

  return versions;
}
