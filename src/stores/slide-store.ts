/**
 * Slide Store - Zustand store for slide presentation state
 * Manages presentation mode, slide navigation, and real-time sync
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  PresentationState,
  SlideInstance,
  SlideOutcomeTag,
  SlideTemplate,
} from '@/lib/types';

// Sync method and connection status types
export type SyncMethod = 'broadcast' | 'websocket' | 'none';
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

interface SlideStore {
  // State
  templates: SlideTemplate[];
  instances: SlideInstance[];
  presentation: PresentationState;
  isLoading: boolean;
  error: string | null;

  // Presentation window state
  presentationWindowRef: Window | null;
  presentationUrl: string | null;
  syncMethod: SyncMethod;
  connectionStatus: ConnectionStatus;

  // Computed
  currentSlide: SlideTemplate | null;
  currentInstance: SlideInstance | null;

  // Template actions
  setTemplates: (templates: SlideTemplate[]) => void;

  // Presentation actions
  startPresentation: () => void;
  endPresentation: () => void;
  goToSlide: (index: number) => void;
  nextSlide: () => void;
  previousSlide: () => void;

  // Presentation window actions
  openPresentationWindow: (url: string) => Window | null;
  closePresentationWindow: () => void;
  setPresentationWindow: (windowRef: Window | null) => void;

  // Sync actions
  setSyncMethod: (method: SyncMethod) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;

  // Instance actions
  createInstance: (
    templateId: string,
    callSessionId: string,
    prospectId: string,
    renderedContent: SlideInstance['renderedContent']
  ) => SlideInstance;
  updateInstanceNotes: (instanceId: string, notes: string) => void;
  tagInstance: (instanceId: string, tag: SlideOutcomeTag) => void;
  recordSlideStart: (instanceId: string) => void;
  recordSlideEnd: (instanceId: string) => void;

  // State management
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialPresentationState: PresentationState = {
  isActive: false,
  currentSlideIndex: 0,
  totalSlides: 0,
  currentSlideId: null,
  slideHistory: [],
};

export const useSlideStore = create<SlideStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      templates: [],
      instances: [],
      presentation: initialPresentationState,
      isLoading: false,
      error: null,
      presentationWindowRef: null,
      presentationUrl: null,
      syncMethod: 'none' as SyncMethod,
      connectionStatus: 'disconnected' as ConnectionStatus,

      // Computed
      get currentSlide() {
        const { templates, presentation } = get();
        if (!presentation.isActive) return null;
        return templates[presentation.currentSlideIndex] || null;
      },

      get currentInstance() {
        const { instances, presentation } = get();
        if (!presentation.currentSlideId) return null;
        return (
          instances.find((i) => i.id === presentation.currentSlideId) || null
        );
      },

      // Template actions
      setTemplates: (templates) => {
        set({
          templates: templates.sort((a, b) => a.orderIndex - b.orderIndex),
          presentation: {
            ...initialPresentationState,
            totalSlides: templates.length,
          },
        });
      },

      // Presentation actions
      startPresentation: () => {
        const { templates } = get();
        if (templates.length === 0) {
          set({ error: 'No slides available' });
          return;
        }

        set({
          presentation: {
            isActive: true,
            currentSlideIndex: 0,
            totalSlides: templates.length,
            currentSlideId: null,
            slideHistory: [],
          },
          error: null,
        });
      },

      endPresentation: () => {
        set({
          presentation: {
            ...get().presentation,
            isActive: false,
          },
        });
      },

      goToSlide: (index) => {
        const { templates, presentation } = get();
        if (index < 0 || index >= templates.length) return;

        set({
          presentation: {
            ...presentation,
            currentSlideIndex: index,
          },
        });
      },

      nextSlide: () => {
        const { presentation, templates } = get();
        if (presentation.currentSlideIndex < templates.length - 1) {
          set({
            presentation: {
              ...presentation,
              currentSlideIndex: presentation.currentSlideIndex + 1,
            },
          });
        }
      },

      previousSlide: () => {
        const { presentation } = get();
        if (presentation.currentSlideIndex > 0) {
          set({
            presentation: {
              ...presentation,
              currentSlideIndex: presentation.currentSlideIndex - 1,
            },
          });
        }
      },

      // Presentation window actions
      openPresentationWindow: (url: string) => {
        const width = 1280;
        const height = 720;
        const left = (typeof window !== 'undefined' ? window.screen.width : 1920) / 2 - width / 2;
        const top = (typeof window !== 'undefined' ? window.screen.height : 1080) / 2 - height / 2;

        const newWindow = window.open(
          url,
          'presentation',
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
        );

        if (newWindow) {
          newWindow.focus();
          set({
            presentationWindowRef: newWindow,
            presentationUrl: url,
          });
        }

        return newWindow;
      },

      closePresentationWindow: () => {
        const { presentationWindowRef } = get();
        if (presentationWindowRef && !presentationWindowRef.closed) {
          presentationWindowRef.close();
        }
        set({
          presentationWindowRef: null,
        });
      },

      setPresentationWindow: (windowRef: Window | null) => {
        set({ presentationWindowRef: windowRef });
      },

      // Sync actions
      setSyncMethod: (method: SyncMethod) => {
        set({ syncMethod: method });
      },

      setConnectionStatus: (status: ConnectionStatus) => {
        set({ connectionStatus: status });
      },

      // Instance actions
      createInstance: (templateId, callSessionId, prospectId, renderedContent) => {
        const newInstance: SlideInstance = {
          id: crypto.randomUUID(),
          callSessionId,
          slideTemplateId: templateId,
          prospectId,
          renderedContent,
          agentNotes: null,
          outcomeTag: null,
          startedAt: null,
          endedAt: null,
          createdAt: new Date(),
        };

        set((state) => ({
          instances: [...state.instances, newInstance],
          presentation: {
            ...state.presentation,
            currentSlideId: newInstance.id,
            slideHistory: [...state.presentation.slideHistory, newInstance.id],
          },
        }));

        return newInstance;
      },

      updateInstanceNotes: (instanceId, notes) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, agentNotes: notes } : i
          ),
        }));
      },

      tagInstance: (instanceId, tag) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, outcomeTag: tag } : i
          ),
        }));
      },

      recordSlideStart: (instanceId) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, startedAt: new Date() } : i
          ),
        }));
      },

      recordSlideEnd: (instanceId) => {
        set((state) => ({
          instances: state.instances.map((i) =>
            i.id === instanceId ? { ...i, endedAt: new Date() } : i
          ),
        }));
      },

      // State management
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () => {
        // Close presentation window if open
        const { presentationWindowRef } = get();
        if (presentationWindowRef && !presentationWindowRef.closed) {
          presentationWindowRef.close();
        }

        set({
          templates: [],
          instances: [],
          presentation: initialPresentationState,
          isLoading: false,
          error: null,
          presentationWindowRef: null,
          presentationUrl: null,
          syncMethod: 'none' as SyncMethod,
          connectionStatus: 'disconnected' as ConnectionStatus,
        });
      },
    }),
    { name: 'SlideStore' }
  )
);

// Selectors for common derived state
export const selectCurrentSlideIndex = (state: SlideStore) =>
  state.presentation.currentSlideIndex;

export const selectIsPresenting = (state: SlideStore) =>
  state.presentation.isActive;

export const selectSlideCount = (state: SlideStore) =>
  state.templates.length;

export const selectCanNavigate = (state: SlideStore) => ({
  previous: state.presentation.currentSlideIndex > 0,
  next: state.presentation.currentSlideIndex < state.templates.length - 1,
});

export const selectSyncStatus = (state: SlideStore) => ({
  method: state.syncMethod,
  status: state.connectionStatus,
});
