/**
 * Objection Flow Service exports
 */

// Service
export {
  ObjectionFlowService,
  objectionFlowService,
  type StartFlowResult,
  type AdvanceStepResult,
  type CompleteFlowResult,
} from './objection-flow-service';

// Flow types and definitions
export {
  type ObjectionType,
  type ObjectionOutcome,
  type ObjectionFlowState,
  type ObjectionFlowDefinition,
  type DiagnosticStep,
  type DiagnosticInputType,
  type AdvanceStepInput,
  type CompleteFlowInput,
  objectionFlows,
  getFlowDefinition,
  getAllFlowDefinitions,
  getAllObjectionTypes,
} from './flows';

// Individual flow definitions
export { priceFlow } from './flows/price-flow';
export { timingFlow } from './flows/timing-flow';
export { capacityFlow } from './flows/capacity-flow';
export { thinkFlow } from './flows/think-flow';
export { partnerFlow } from './flows/partner-flow';
export { skepticismFlow } from './flows/skepticism-flow';
