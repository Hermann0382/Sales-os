/**
 * Call Store - Zustand store for call session state management
 * Manages current call session, status, and real-time updates
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import {
  ActiveCallState,
  CallMode,
  CallStatus,
  Language,
  MilestoneProgress,
  PreCallChecklist,
} from '@/lib/types';

interface CallStore {
  // Current call state
  activeCall: ActiveCallState | null;
  preCallChecklist: PreCallChecklist;
  isLoading: boolean;
  error: string | null;

  // Actions
  startCall: (params: {
    callSessionId: string;
    callThreadId: string;
    prospectId: string;
    agentId: string;
    mode: CallMode;
    language: Language;
  }) => void;
  endCall: () => void;
  updateCallStatus: (status: CallStatus) => void;
  setCurrentMilestone: (milestoneId: string | null) => void;
  updateMilestoneProgress: (progress: MilestoneProgress[]) => void;
  setActiveObjection: (objectionId: string | null) => void;
  toggleRecording: (isRecording: boolean) => void;
  togglePresentationMode: (isPresentationMode: boolean) => void;

  // Pre-call checklist actions
  updateChecklistItem: (
    key: keyof PreCallChecklist,
    value: boolean
  ) => void;
  resetChecklist: () => void;
  isChecklistComplete: () => boolean;

  // Error handling
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  reset: () => void;
}

const initialChecklist: PreCallChecklist = {
  qualificationFormReviewed: false,
  clientCountConfirmed: false,
  businessTypeConfirmed: false,
  revenueRangeNoted: false,
  mainPainIdentified: false,
  toolStackNoted: false,
  roiToolReady: false,
  timeBlockClear: false,
};

export const useCallStore = create<CallStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activeCall: null,
        preCallChecklist: initialChecklist,
        isLoading: false,
        error: null,

        // Actions
        startCall: (params) => {
          set({
            activeCall: {
              ...params,
              status: 'in_progress',
              startedAt: new Date(),
              currentMilestoneId: null,
              milestoneProgress: [],
              activeObjectionId: null,
              isRecording: false,
              isPresentationMode: false,
            },
            error: null,
          });
        },

        endCall: () => {
          const { activeCall } = get();
          if (activeCall) {
            set({
              activeCall: {
                ...activeCall,
                status: 'completed',
              },
            });
          }
        },

        updateCallStatus: (status) => {
          const { activeCall } = get();
          if (activeCall) {
            set({
              activeCall: {
                ...activeCall,
                status,
              },
            });
          }
        },

        setCurrentMilestone: (milestoneId) => {
          const { activeCall } = get();
          if (activeCall) {
            set({
              activeCall: {
                ...activeCall,
                currentMilestoneId: milestoneId,
              },
            });
          }
        },

        updateMilestoneProgress: (progress) => {
          const { activeCall } = get();
          if (activeCall) {
            set({
              activeCall: {
                ...activeCall,
                milestoneProgress: progress,
              },
            });
          }
        },

        setActiveObjection: (objectionId) => {
          const { activeCall } = get();
          if (activeCall) {
            set({
              activeCall: {
                ...activeCall,
                activeObjectionId: objectionId,
              },
            });
          }
        },

        toggleRecording: (isRecording) => {
          const { activeCall } = get();
          if (activeCall) {
            set({
              activeCall: {
                ...activeCall,
                isRecording,
              },
            });
          }
        },

        togglePresentationMode: (isPresentationMode) => {
          const { activeCall } = get();
          if (activeCall) {
            set({
              activeCall: {
                ...activeCall,
                isPresentationMode,
              },
            });
          }
        },

        // Pre-call checklist
        updateChecklistItem: (key, value) => {
          set((state) => ({
            preCallChecklist: {
              ...state.preCallChecklist,
              [key]: value,
            },
          }));
        },

        resetChecklist: () => {
          set({ preCallChecklist: initialChecklist });
        },

        isChecklistComplete: () => {
          const { preCallChecklist } = get();
          return Object.values(preCallChecklist).every(Boolean);
        },

        // Error handling
        setError: (error) => set({ error }),
        setLoading: (isLoading) => set({ isLoading }),
        reset: () =>
          set({
            activeCall: null,
            preCallChecklist: initialChecklist,
            isLoading: false,
            error: null,
          }),
      }),
      {
        name: 'callos-call-store',
        partialize: (state) => ({
          preCallChecklist: state.preCallChecklist,
        }),
      }
    ),
    { name: 'CallStore' }
  )
);
