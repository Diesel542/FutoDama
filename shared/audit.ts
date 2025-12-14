import { z } from "zod";

export const EventType = z.enum([
  "MATCHING_RECOMMENDATION",
  "MATCHING_STEP1",
  "MATCHING_STEP2",
  "TAILORING",
  "EXPORT",
]);
export type EventType = z.infer<typeof EventType>;

export const HumanActionType = z.enum([
  "OVERRIDE",
  "APPROVE",
  "REJECT",
  "EDIT",
]);
export type HumanActionType = z.infer<typeof HumanActionType>;

export const HumanActionReasonCode = z.enum([
  "MISSING_CONTEXT",
  "INCORRECT_EXTRACTION",
  "BUSINESS_RULE",
  "OTHER",
]);
export type HumanActionReasonCode = z.infer<typeof HumanActionReasonCode>;

export const VersionsBlock = z.object({
  matchingLogicVersion: z.string(),
  modelVersion: z.string(),
  featureConfigVersion: z.string(),
  promptVersion: z.string().optional(),
  explainabilitySchemaVersion: z.string().optional(),
  biasTestConfigVersion: z.string().optional(),
});
export type VersionsBlock = z.infer<typeof VersionsBlock>;

export const HumanAction = z.object({
  actionType: HumanActionType,
  reasonCode: HumanActionReasonCode.optional(),
  reasonText: z.string().optional(),
  userId: z.string().optional(),
  timestamp: z.string().optional(),
});
export type HumanAction = z.infer<typeof HumanAction>;

export const MatchingContext = z.object({
  jobId: z.string().optional(),
  profileIds: z.array(z.string()).optional(),
  sessionId: z.string().optional(),
  step: z.enum(["step1", "step2"]).optional(),
});
export type MatchingContext = z.infer<typeof MatchingContext>;

export const TailoringContext = z.object({
  jobId: z.string().optional(),
  profileId: z.string().optional(),
  tailoringOptions: z.record(z.unknown()).optional(),
});
export type TailoringContext = z.infer<typeof TailoringContext>;

export const ExportContext = z.object({
  format: z.enum(["pdf", "docx", "csv", "jsonl"]).optional(),
  templateId: z.string().optional(),
  exportedFields: z.array(z.string()).optional(),
});
export type ExportContext = z.infer<typeof ExportContext>;

export const DecisionEventPayload = z.object({
  versions: VersionsBlock,
  
  context: z.union([
    MatchingContext,
    TailoringContext,
    ExportContext,
  ]).optional(),
  
  contextExt: z.record(z.unknown()).optional(),
  
  input: z.object({
    jobIdRef: z.string().optional(),
    profileIdRefs: z.array(z.string()).optional(),
    queryHash: z.string().optional(),
  }).optional(),
  
  output: z.object({
    recommendations: z.array(z.object({
      profileId: z.string(),
      score: z.number().optional(),
      rank: z.number().optional(),
      reasoning: z.string().optional(),
    })).optional(),
    tailoredResumeHash: z.string().optional(),
    exportFileHash: z.string().optional(),
    warnings: z.array(z.string()).optional(),
  }).optional(),
  
  humanAction: HumanAction.optional(),
  
  metadata: z.record(z.unknown()).optional(),
});
export type DecisionEventPayload = z.infer<typeof DecisionEventPayload>;

export const DecisionEvent = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventType: EventType,
  requestId: z.string().optional(),
  createdAt: z.string().optional(),
  payload: DecisionEventPayload,
});
export type DecisionEvent = z.infer<typeof DecisionEvent>;

export const InsertDecisionEvent = DecisionEvent.omit({ id: true, createdAt: true });
export type InsertDecisionEvent = z.infer<typeof InsertDecisionEvent>;
