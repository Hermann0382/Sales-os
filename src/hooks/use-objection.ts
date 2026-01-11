/**
 * useObjection Hook - Manages objection handling subflows
 * Provides unified interface for objection operations
 */

import { useCallback, useMemo } from 'react';

import { useObjectionStore, useCallStore, useMilestoneStore } from '@/stores';
import {
  ActiveObjectionState,
  DiagnosticQuestion,
  Objection,
  ObjectionOutcome,
  ObjectionResponse,
  ObjectionType,
  getObjectionLabel,
} from '@/lib/types';

interface UseObjectionReturn {
  // State
  objectionTypes: Objection[];
  activeObjection: ActiveObjectionState | null;
  responses: ObjectionResponse[];
  isLoading: boolean;
  error: string | null;

  // Current objection state
  currentObjection: Objection | null;
  currentQuestion: DiagnosticQuestion | null;
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  answers: Record<string, string>;

  // Unresolved tracking
  unresolvedObjections: ObjectionResponse[];
  unresolvedCount: number;

  // Actions
  loadObjectionTypes: (types: Objection[]) => void;
  startObjection: (type: ObjectionType) => void;
  answerQuestion: (answer: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeObjection: (outcome: ObjectionOutcome, notes?: string) => void;
  cancelObjection: () => void;

  // Query helpers
  getObjectionLabel: (type: ObjectionType) => string;
  getObjectionsByOutcome: (outcome: ObjectionOutcome) => ObjectionResponse[];

  // Utils
  reset: () => void;
}

export function useObjection(): UseObjectionReturn {
  const {
    objectionTypes,
    activeObjection,
    responses,
    isLoading,
    error,
    setObjectionTypes,
    startObjection: storeStartObjection,
    answerDiagnostic,
    nextStep: storeNextStep,
    previousStep: storePreviousStep,
    completeObjection: storeCompleteObjection,
    cancelObjection,
    reset,
  } = useObjectionStore();

  const { activeCall } = useCallStore();
  const { currentMilestoneId } = useMilestoneStore();

  // Current objection details
  const currentObjection = useMemo(() => {
    if (!activeObjection) return null;
    return objectionTypes.find((o) => o.id === activeObjection.objectionId) || null;
  }, [activeObjection, objectionTypes]);

  // Current question
  const currentQuestion = useMemo(() => {
    if (!currentObjection || !activeObjection) return null;
    return (
      currentObjection.diagnosticQuestions.find(
        (q) => q.step === activeObjection.currentStep
      ) || null
    );
  }, [currentObjection, activeObjection]);

  // Unresolved objections
  const unresolvedObjections = useMemo(() => {
    return responses.filter((r) => r.outcome !== 'Resolved');
  }, [responses]);

  // Load objection types
  const loadObjectionTypes = useCallback(
    (types: Objection[]) => {
      setObjectionTypes(types);
    },
    [setObjectionTypes]
  );

  // Start objection
  const startObjection = useCallback(
    (type: ObjectionType) => {
      if (!currentMilestoneId) {
        console.warn('Cannot start objection without active milestone');
        return;
      }
      storeStartObjection(type, currentMilestoneId);
    },
    [currentMilestoneId, storeStartObjection]
  );

  // Answer current question
  const answerQuestion = useCallback(
    (answer: string) => {
      if (!currentQuestion) return;
      answerDiagnostic(currentQuestion.id, answer);
    },
    [currentQuestion, answerDiagnostic]
  );

  // Complete objection
  const completeObjection = useCallback(
    (outcome: ObjectionOutcome, notes?: string) => {
      if (!activeCall) {
        console.warn('Cannot complete objection without active call');
        return;
      }
      storeCompleteObjection(outcome, activeCall.callSessionId, notes);
    },
    [activeCall, storeCompleteObjection]
  );

  // Get objections by outcome
  const getObjectionsByOutcome = useCallback(
    (outcome: ObjectionOutcome) => {
      return responses.filter((r) => r.outcome === outcome);
    },
    [responses]
  );

  return {
    objectionTypes,
    activeObjection,
    responses,
    isLoading,
    error,
    currentObjection,
    currentQuestion,
    currentStep: activeObjection?.currentStep ?? 0,
    totalSteps: activeObjection?.totalSteps ?? 0,
    isComplete: activeObjection?.isComplete ?? false,
    answers: activeObjection?.answers ?? {},
    unresolvedObjections,
    unresolvedCount: unresolvedObjections.length,
    loadObjectionTypes,
    startObjection,
    answerQuestion,
    nextStep: storeNextStep,
    previousStep: storePreviousStep,
    completeObjection,
    cancelObjection,
    getObjectionLabel,
    getObjectionsByOutcome,
    reset,
  };
}
