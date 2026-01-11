/**
 * Objection Flow Service - Manages objection diagnostic flows
 * Handles flow state, step progression, and answer tracking
 */

import { v4 as uuidv4 } from 'uuid';

import {
  ObjectionType,
  ObjectionOutcome,
  ObjectionFlowState,
  ObjectionFlowDefinition,
  DiagnosticStep,
  AdvanceStepInput,
  CompleteFlowInput,
  getFlowDefinition,
  getAllFlowDefinitions,
  getAllObjectionTypes,
} from './flows';

/**
 * Result of starting a new flow
 */
export interface StartFlowResult {
  flowState: ObjectionFlowState;
  currentStep: DiagnosticStep;
  flowDefinition: ObjectionFlowDefinition;
}

/**
 * Result of advancing to next step
 */
export interface AdvanceStepResult {
  flowState: ObjectionFlowState;
  currentStep: DiagnosticStep | null; // null if flow is complete
  isLastStep: boolean;
}

/**
 * Result of completing a flow
 */
export interface CompleteFlowResult {
  flowState: ObjectionFlowState;
  outcome: ObjectionOutcome;
  answers: Record<number, string>;
}

/**
 * ObjectionFlowService - Manages objection diagnostic flows
 * Note: This is a stateless service. Flow state is managed client-side.
 */
export class ObjectionFlowService {
  /**
   * Start a new objection flow
   */
  startFlow(objectionType: ObjectionType): StartFlowResult {
    const flowDefinition = getFlowDefinition(objectionType);

    const flowState: ObjectionFlowState = {
      flowId: uuidv4(),
      objectionType,
      currentStep: 1,
      totalSteps: flowDefinition.steps.length,
      answers: {},
      outcome: null,
      isComplete: false,
      startedAt: new Date(),
    };

    const currentStep = flowDefinition.steps[0];

    return {
      flowState,
      currentStep,
      flowDefinition,
    };
  }

  /**
   * Get current step details for a flow state
   */
  getCurrentStep(flowState: ObjectionFlowState): DiagnosticStep | null {
    if (flowState.isComplete) {
      return null;
    }

    const flowDefinition = getFlowDefinition(flowState.objectionType);
    return flowDefinition.steps[flowState.currentStep - 1] || null;
  }

  /**
   * Advance to next step in the flow
   */
  advanceStep(flowState: ObjectionFlowState, input: AdvanceStepInput): AdvanceStepResult {
    if (flowState.isComplete) {
      throw new Error('Flow is already complete');
    }

    const flowDefinition = getFlowDefinition(flowState.objectionType);
    const currentStepDef = flowDefinition.steps[flowState.currentStep - 1];

    // Store answer for current step (unless it's a statement)
    const updatedAnswers = { ...flowState.answers };
    if (!currentStepDef.isStatement) {
      updatedAnswers[flowState.currentStep] = input.answer;
    }

    const isLastStep = flowState.currentStep >= flowState.totalSteps;

    // Create updated flow state
    const updatedFlowState: ObjectionFlowState = {
      ...flowState,
      answers: updatedAnswers,
      currentStep: isLastStep ? flowState.currentStep : flowState.currentStep + 1,
    };

    // Get next step (null if this was the last step)
    const nextStep = isLastStep
      ? null
      : flowDefinition.steps[updatedFlowState.currentStep - 1];

    return {
      flowState: updatedFlowState,
      currentStep: nextStep,
      isLastStep,
    };
  }

  /**
   * Go back to previous step
   */
  goBackStep(flowState: ObjectionFlowState): AdvanceStepResult {
    if (flowState.currentStep <= 1) {
      throw new Error('Already at first step');
    }

    if (flowState.isComplete) {
      throw new Error('Cannot go back on completed flow');
    }

    const flowDefinition = getFlowDefinition(flowState.objectionType);

    const updatedFlowState: ObjectionFlowState = {
      ...flowState,
      currentStep: flowState.currentStep - 1,
    };

    const currentStep = flowDefinition.steps[updatedFlowState.currentStep - 1];

    return {
      flowState: updatedFlowState,
      currentStep,
      isLastStep: false,
    };
  }

  /**
   * Complete the flow with an outcome
   */
  completeFlow(flowState: ObjectionFlowState, input: CompleteFlowInput): CompleteFlowResult {
    const flowDefinition = getFlowDefinition(flowState.objectionType);

    // Validate outcome is allowed
    if (!flowDefinition.allowedOutcomes.includes(input.outcome)) {
      throw new Error(
        `Invalid outcome "${input.outcome}" for ${flowState.objectionType}. ` +
          `Allowed: ${flowDefinition.allowedOutcomes.join(', ')}`
      );
    }

    const completedFlowState: ObjectionFlowState = {
      ...flowState,
      outcome: input.outcome,
      isComplete: true,
    };

    return {
      flowState: completedFlowState,
      outcome: input.outcome,
      answers: completedFlowState.answers,
    };
  }

  /**
   * Validate that all required steps have answers
   */
  validateFlowCompletion(flowState: ObjectionFlowState): { isValid: boolean; missingSteps: number[] } {
    const flowDefinition = getFlowDefinition(flowState.objectionType);
    const missingSteps: number[] = [];

    for (const step of flowDefinition.steps) {
      // Skip statement steps (no input required)
      if (step.isStatement) continue;

      if (!flowState.answers[step.stepNumber]) {
        missingSteps.push(step.stepNumber);
      }
    }

    return {
      isValid: missingSteps.length === 0,
      missingSteps,
    };
  }

  /**
   * Get flow definition by type
   */
  getFlowDefinition(objectionType: ObjectionType): ObjectionFlowDefinition {
    return getFlowDefinition(objectionType);
  }

  /**
   * Get all available flow definitions
   */
  getAllFlowDefinitions(): ObjectionFlowDefinition[] {
    return getAllFlowDefinitions();
  }

  /**
   * Get all objection types
   */
  getAllObjectionTypes(): ObjectionType[] {
    return getAllObjectionTypes();
  }

  /**
   * Get suggested response based on diagnostic answers
   * Note: This is a placeholder for future AI integration
   */
  getSuggestedResponse(
    flowState: ObjectionFlowState
  ): string {
    const flowDef = getFlowDefinition(flowState.objectionType);

    // For now, return a generic acknowledgment
    // In future, this could use AI to generate context-aware responses
    return `Based on your diagnostic assessment, here's a suggested approach for the ${flowDef.displayName}...`;
  }

  /**
   * Get flow summary for logging/display
   */
  getFlowSummary(flowState: ObjectionFlowState): {
    type: ObjectionType;
    displayName: string;
    totalSteps: number;
    stepsCompleted: number;
    outcome: ObjectionOutcome | null;
    isComplete: boolean;
  } {
    const flowDef = getFlowDefinition(flowState.objectionType);
    const stepsCompleted = Object.keys(flowState.answers).length;

    return {
      type: flowState.objectionType,
      displayName: flowDef.displayName,
      totalSteps: flowState.totalSteps,
      stepsCompleted,
      outcome: flowState.outcome,
      isComplete: flowState.isComplete,
    };
  }
}

export const objectionFlowService = new ObjectionFlowService();
