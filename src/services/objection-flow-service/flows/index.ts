/**
 * Objection Flow Definitions Index
 * Exports all flow definitions and types
 */

export * from './types';

export { priceFlow } from './price-flow';
export { timingFlow } from './timing-flow';
export { capacityFlow } from './capacity-flow';
export { thinkFlow } from './think-flow';
export { partnerFlow } from './partner-flow';
export { skepticismFlow } from './skepticism-flow';

import { ObjectionFlowDefinition, ObjectionType } from './types';
import { priceFlow } from './price-flow';
import { timingFlow } from './timing-flow';
import { capacityFlow } from './capacity-flow';
import { thinkFlow } from './think-flow';
import { partnerFlow } from './partner-flow';
import { skepticismFlow } from './skepticism-flow';

/**
 * Map of all objection flows by type
 */
export const objectionFlows: Record<ObjectionType, ObjectionFlowDefinition> = {
  Price: priceFlow,
  Timing: timingFlow,
  Capacity_Time: capacityFlow,
  Need_to_Think: thinkFlow,
  Partner_Team: partnerFlow,
  Skepticism: skepticismFlow,
};

/**
 * Get flow definition by type
 */
export function getFlowDefinition(type: ObjectionType): ObjectionFlowDefinition {
  const flow = objectionFlows[type];
  if (!flow) {
    throw new Error(`Unknown objection type: ${type}`);
  }
  return flow;
}

/**
 * Get all flow definitions as array
 */
export function getAllFlowDefinitions(): ObjectionFlowDefinition[] {
  return Object.values(objectionFlows);
}

/**
 * Get all objection types
 */
export function getAllObjectionTypes(): ObjectionType[] {
  return Object.keys(objectionFlows) as ObjectionType[];
}
