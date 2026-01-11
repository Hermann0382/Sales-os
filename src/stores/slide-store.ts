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

interface SlideStore {
  // State
  templates: SlideTemplate[];
  instances: SlideInstance[];
  presentation: PresentationState;
  isLoading: boolean;
  error: string | null;

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
      reset: () =>
        set({
          templates: [],
          instances: [],
          presentation: initialPresentationState,
          isLoading: false,
          error: null,
        }),
    }),
    { name: 'SlideStore' }
  )
);
