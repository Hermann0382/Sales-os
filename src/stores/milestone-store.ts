/**
 * Milestone Store - Zustand store for milestone execution state
 * Manages current milestone, responses, and progression logic
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  Milestone,
  MilestoneProgress,
  MilestoneResponse,
  MilestoneResponseStatus,
} from '@/lib/types';

interface MilestoneStore {
  // State
  milestones: Milestone[];
  currentMilestoneId: string | null;
  responses: Record<string, MilestoneResponse>;
  progress: MilestoneProgress[];
  isLoading: boolean;
  error: string | null;

  // Computed
  currentMilestone: Milestone | null;
  currentResponse: MilestoneResponse | null;
  canProceedToNext: boolean;
  completedCount: number;
  totalCount: number;

  // Actions
  setMilestones: (milestones: Milestone[]) => void;
  setCurrentMilestone: (milestoneId: string | null) => void;
  startMilestone: (milestoneId: string, callSessionId: string) => void;
  updateResponse: (
    milestoneId: string,
    updates: Partial<MilestoneResponse>
  ) => void;
  completeMilestone: (milestoneId: string) => void;
  skipMilestone: (milestoneId: string, reason: string) => void;
  checkItem: (milestoneId: string, itemId: string, value: boolean | string | number) => void;
  addNote: (milestoneId: string, note: string) => void;

  // Navigation
  goToNextMilestone: () => void;
  goToPreviousMilestone: () => void;
  goToMilestone: (milestoneNumber: number) => void;

  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useMilestoneStore = create<MilestoneStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      milestones: [],
      currentMilestoneId: null,
      responses: {},
      progress: [],
      isLoading: false,
      error: null,

      // Computed getters
      get currentMilestone() {
        const { milestones, currentMilestoneId } = get();
        return milestones.find((m) => m.id === currentMilestoneId) || null;
      },

      get currentResponse() {
        const { responses, currentMilestoneId } = get();
        return currentMilestoneId ? responses[currentMilestoneId] || null : null;
      },

      get canProceedToNext() {
        const { currentMilestone, currentResponse } = get();
        if (!currentMilestone || !currentResponse) return false;

        // Check if all required items are checked
        const requiredQuestions = currentMilestone.requiredQuestions || [];
        const confirmations = currentMilestone.confirmations || [];
        const checkedItems = currentResponse.requiredItemsChecked || {};

        const allRequiredComplete = [
          ...requiredQuestions.filter((q) => q.required),
          ...confirmations.filter((c) => c.required),
        ].every((item) => checkedItems[item.id]);

        return allRequiredComplete;
      },

      get completedCount() {
        const { progress } = get();
        return progress.filter((p) => p.status === 'completed').length;
      },

      get totalCount() {
        const { milestones } = get();
        return milestones.length;
      },

      // Actions
      setMilestones: (milestones) => {
        const progress: MilestoneProgress[] = milestones.map((m) => ({
          milestoneId: m.id,
          milestoneNumber: m.milestoneNumber,
          title: m.title,
          status: 'in_progress' as MilestoneResponseStatus,
          progress: 0,
          isActive: false,
          canProceed: false,
          requiredItemsComplete: 0,
          requiredItemsTotal:
            (m.requiredQuestions?.filter((q) => q.required).length || 0) +
            (m.confirmations?.filter((c) => c.required).length || 0),
        }));
        set({ milestones, progress });
      },

      setCurrentMilestone: (milestoneId) => {
        set({ currentMilestoneId: milestoneId });
        // Update progress to mark active
        set((state) => ({
          progress: state.progress.map((p) => ({
            ...p,
            isActive: p.milestoneId === milestoneId,
          })),
        }));
      },

      startMilestone: (milestoneId, callSessionId) => {
        const { responses, milestones } = get();
        const milestone = milestones.find((m) => m.id === milestoneId);
        if (!milestone) return;

        const newResponse: MilestoneResponse = {
          id: crypto.randomUUID(),
          callSessionId,
          milestoneId,
          status: 'in_progress',
          requiredItemsChecked: {},
          notes: null,
          overrideReason: null,
          startedAt: new Date(),
          completedAt: null,
          createdAt: new Date(),
        };

        set({
          responses: { ...responses, [milestoneId]: newResponse },
          currentMilestoneId: milestoneId,
        });
      },

      updateResponse: (milestoneId, updates) => {
        set((state) => ({
          responses: {
            ...state.responses,
            [milestoneId]: {
              ...state.responses[milestoneId],
              ...updates,
            },
          },
        }));
      },

      completeMilestone: (milestoneId) => {
        set((state) => ({
          responses: {
            ...state.responses,
            [milestoneId]: {
              ...state.responses[milestoneId],
              status: 'completed',
              completedAt: new Date(),
            },
          },
          progress: state.progress.map((p) =>
            p.milestoneId === milestoneId
              ? { ...p, status: 'completed' as MilestoneResponseStatus, progress: 100 }
              : p
          ),
        }));
      },

      skipMilestone: (milestoneId, reason) => {
        set((state) => ({
          responses: {
            ...state.responses,
            [milestoneId]: {
              ...state.responses[milestoneId],
              status: 'skipped',
              overrideReason: reason,
              completedAt: new Date(),
            },
          },
          progress: state.progress.map((p) =>
            p.milestoneId === milestoneId
              ? { ...p, status: 'skipped' as MilestoneResponseStatus }
              : p
          ),
        }));
      },

      checkItem: (milestoneId, itemId, value) => {
        set((state) => {
          const response = state.responses[milestoneId];
          if (!response) return state;

          const checkedItems = { ...response.requiredItemsChecked, [itemId]: value };
          const milestone = state.milestones.find((m) => m.id === milestoneId);

          // Calculate progress
          let complete = 0;
          let total = 0;
          if (milestone) {
            const required = [
              ...(milestone.requiredQuestions?.filter((q) => q.required) || []),
              ...(milestone.confirmations?.filter((c) => c.required) || []),
            ];
            total = required.length;
            complete = required.filter((item) => checkedItems[item.id]).length;
          }

          return {
            responses: {
              ...state.responses,
              [milestoneId]: {
                ...response,
                requiredItemsChecked: checkedItems,
              },
            },
            progress: state.progress.map((p) =>
              p.milestoneId === milestoneId
                ? {
                    ...p,
                    requiredItemsComplete: complete,
                    progress: total > 0 ? (complete / total) * 100 : 0,
                    canProceed: complete === total,
                  }
                : p
            ),
          };
        });
      },

      addNote: (milestoneId, note) => {
        set((state) => {
          const response = state.responses[milestoneId];
          if (!response) return state;

          const existingNotes = response.notes || '';
          const newNotes = existingNotes
            ? `${existingNotes}\n${note}`
            : note;

          return {
            responses: {
              ...state.responses,
              [milestoneId]: {
                ...response,
                notes: newNotes,
              },
            },
          };
        });
      },

      // Navigation
      goToNextMilestone: () => {
        const { milestones, currentMilestoneId } = get();
        const currentIndex = milestones.findIndex(
          (m) => m.id === currentMilestoneId
        );
        if (currentIndex < milestones.length - 1) {
          const nextMilestone = milestones[currentIndex + 1];
          set({ currentMilestoneId: nextMilestone.id });
        }
      },

      goToPreviousMilestone: () => {
        const { milestones, currentMilestoneId } = get();
        const currentIndex = milestones.findIndex(
          (m) => m.id === currentMilestoneId
        );
        if (currentIndex > 0) {
          const prevMilestone = milestones[currentIndex - 1];
          set({ currentMilestoneId: prevMilestone.id });
        }
      },

      goToMilestone: (milestoneNumber) => {
        const { milestones } = get();
        const milestone = milestones.find(
          (m) => m.milestoneNumber === milestoneNumber
        );
        if (milestone) {
          set({ currentMilestoneId: milestone.id });
        }
      },

      // State management
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () =>
        set({
          milestones: [],
          currentMilestoneId: null,
          responses: {},
          progress: [],
          isLoading: false,
          error: null,
        }),
    }),
    { name: 'MilestoneStore' }
  )
);
