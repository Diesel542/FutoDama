import { randomUUID } from "crypto";
import { storage } from "../storage";
import type { DecisionEventPayload, EventType } from "@shared/audit";
import type { DecisionEventDb } from "@shared/schema";

export interface AppendDecisionEventInput {
  tenantId: string;
  eventType: EventType;
  requestId?: string;
  payload: DecisionEventPayload;
}

export interface AppendDecisionEventResult {
  id: string;
}

export async function appendDecisionEvent(
  input: AppendDecisionEventInput
): Promise<AppendDecisionEventResult> {
  const id = randomUUID();
  
  await storage.createDecisionEvent({
    id,
    tenantId: input.tenantId,
    eventType: input.eventType,
    requestId: input.requestId,
    payload: input.payload,
  });
  
  return { id };
}

export async function listDecisionEvents(filters: {
  tenantId: string;
  from?: string;
  to?: string;
  eventType?: string;
  requestId?: string;
  limit?: number;
  offset?: number;
}): Promise<DecisionEventDb[]> {
  return storage.listDecisionEvents(filters);
}

export async function countDecisionEvents(filters: {
  tenantId: string;
  from?: string;
  to?: string;
  eventType?: string;
  requestId?: string;
}): Promise<number> {
  return storage.countDecisionEvents(filters);
}
