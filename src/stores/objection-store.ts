/**
 * Objection Store - Zustand store for objection handling state
 * Manages objection subflows, diagnostic questions, and outcomes
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  ActiveObjectionState,
  Objection,
  ObjectionOutcome,
  ObjectionResponse,
  ObjectionType,
} from '@/lib/types';

interface ObjectionStore {
  // State
  objectionTypes: Objection[];
  activeObjection: ActiveObjectionState | null;
  responses: ObjectionResponse[];
  isLoading: boolean;
  error: string | null;

  // Computed
  currentObjection: Objection | null;
  unresolvedObjections: ObjectionResponse[];

  // Actions
  setObjectionTypes: (types: Objection[]) => void;
  startObjection: (objectionType: ObjectionType, milestoneId: string) => void;
  answerDiagnostic: (questionId: string, answer: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  completeObjection: (
    outcome: ObjectionOutcome,
    callSessionId: string,
    notes?: string
  ) => void;
  cancelObjection: () => void;

  // Query
  getObjectionsByCall: (callSessionId: string) => ObjectionResponse[];
  getObjectionsByMilestone: (milestoneId: string) => ObjectionResponse[];

  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useObjectionStore = create<ObjectionStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      objectionTypes: [],
      activeObjection: null,
      responses: [],
      isLoading: false,
      error: null,

      // Computed
      get currentObjection() {
        const { objectionTypes, activeObjection } = get();
        if (!activeObjection) return null;
        return (
          objectionTypes.find((o) => o.id === activeObjection.objectionId) ||
          null
        );
      },

      get unresolvedObjections() {
        const { responses } = get();
        return responses.filter((r) => r.outcome !== 'Resolved');
      },

      // Actions
      setObjectionTypes: (types) => set({ objectionTypes: types }),

      startObjection: (objectionType, milestoneId) => {
        const { objectionTypes } = get();
        const objection = objectionTypes.find(
          (o) => o.objectionType === objectionType
        );

        if (!objection) {
          set({ error: `Objection type ${objectionType} not found` });
          return;
        }

        set({
          activeObjection: {
            objectionId: objection.id,
            objectionType,
            currentStep: 1,
            totalSteps: objection.diagnosticQuestions.length,
            answers: {},
            isComplete: false,
          },
          error: null,
        });
      },

      answerDiagnostic: (questionId, answer) => {
        set((state) => {
          if (!state.activeObjection) return state;

          return {
            activeObjection: {
              ...state.activeObjection,
              answers: {
                ...state.activeObjection.answers,
                [questionId]: answer,
              },
            },
          };
        });
      },

      nextStep: () => {
        set((state) => {
          if (!state.activeObjection) return state;

          const newStep = state.activeObjection.currentStep + 1;
          const isComplete = newStep > state.activeObjection.totalSteps;

          return {
            activeObjection: {
              ...state.activeObjection,
              currentStep: isComplete
                ? state.activeObjection.currentStep
                : newStep,
              isComplete,
            },
          };
        });
      },

      previousStep: () => {
        set((state) => {
          if (!state.activeObjection) return state;

          const newStep = Math.max(1, state.activeObjection.currentStep - 1);

          return {
            activeObjection: {
              ...state.activeObjection,
              currentStep: newStep,
              isComplete: false,
            },
          };
        });
      },

      completeObjection: (outcome, callSessionId, notes) => {
        const { activeObjection, responses, objectionTypes } = get();
        if (!activeObjection) return;

        const objection = objectionTypes.find(
          (o) => o.id === activeObjection.objectionId
        );
        if (!objection) return;

        const response: ObjectionResponse = {
          id: crypto.randomUUID(),
          callSessionId,
          objectionId: activeObjection.objectionId,
          milestoneId: '', // Will be set from context
          outcome,
          diagnosticAnswers: activeObjection.answers,
          notes: notes || null,
          createdAt: new Date(),
        };

        set({
          responses: [...responses, response],
          activeObjection: null,
        });
      },

      cancelObjection: () => {
        set({ activeObjection: null });
      },

      // Query
      getObjectionsByCall: (callSessionId) => {
        const { responses } = get();
        return responses.filter((r) => r.callSessionId === callSessionId);
      },

      getObjectionsByMilestone: (milestoneId) => {
        const { responses } = get();
        return responses.filter((r) => r.milestoneId === milestoneId);
      },

      // State management
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () =>
        set({
          objectionTypes: [],
          activeObjection: null,
          responses: [],
          isLoading: false,
          error: null,
        }),
    }),
    { name: 'ObjectionStore' }
  )
);
