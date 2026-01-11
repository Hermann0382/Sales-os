/**
 * useCall Hook - Manages current call session and state syncing
 * Provides unified interface for call operations
 */

import { useCallback, useEffect } from 'react';

import { useCallStore, useMilestoneStore, useObjectionStore, useSlideStore } from '@/stores';
import { CallMode, CallSession, Language, PreCallChecklist } from '@/lib/types';

interface UseCallOptions {
  autoSync?: boolean;
  syncInterval?: number;
}

interface UseCallReturn {
  // State
  activeCall: ReturnType<typeof useCallStore.getState>['activeCall'];
  isLoading: boolean;
  error: string | null;
  preCallChecklist: PreCallChecklist;
  isChecklistComplete: boolean;

  // Actions
  startCall: (params: {
    callSessionId: string;
    callThreadId: string;
    prospectId: string;
    agentId: string;
    mode: CallMode;
    language: Language;
  }) => void;
  endCall: () => Promise<void>;
  pauseCall: () => void;
  resumeCall: () => void;

  // Checklist
  updateChecklistItem: (key: keyof PreCallChecklist, value: boolean) => void;
  resetChecklist: () => void;

  // Recording
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;

  // Presentation
  startPresentation: () => void;
  endPresentation: () => void;
  isPresentationMode: boolean;

  // Utils
  reset: () => void;
}

export function useCall(_options: UseCallOptions = {}): UseCallReturn {
  const {
    activeCall,
    preCallChecklist,
    isLoading,
    error,
    startCall: storeStartCall,
    endCall: storeEndCall,
    updateChecklistItem,
    resetChecklist,
    isChecklistComplete,
    toggleRecording,
    togglePresentationMode,
    setLoading,
    setError,
    reset: resetCallStore,
  } = useCallStore();

  const { reset: resetMilestoneStore } = useMilestoneStore();
  const { reset: resetObjectionStore } = useObjectionStore();
  const { reset: resetSlideStore, startPresentation: slideStartPresentation, endPresentation: slideEndPresentation } = useSlideStore();

  // Start call with full initialization
  const startCall = useCallback(
    (params: Parameters<typeof storeStartCall>[0]) => {
      setLoading(true);
      try {
        storeStartCall(params);
        // Additional initialization can be added here
        // e.g., fetch milestones, load objection types, etc.
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start call');
      } finally {
        setLoading(false);
      }
    },
    [storeStartCall, setLoading, setError]
  );

  // End call with cleanup
  const endCall = useCallback(async () => {
    setLoading(true);
    try {
      storeEndCall();
      // Trigger AI analysis here
      // await triggerAIAnalysis(activeCall?.callSessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end call');
    } finally {
      setLoading(false);
    }
  }, [storeEndCall, setLoading, setError]);

  // Pause call (keep state but mark as paused)
  const pauseCall = useCallback(() => {
    if (activeCall) {
      useCallStore.getState().updateCallStatus('scheduled');
    }
  }, [activeCall]);

  // Resume call
  const resumeCall = useCallback(() => {
    if (activeCall) {
      useCallStore.getState().updateCallStatus('in_progress');
    }
  }, [activeCall]);

  // Recording controls
  const startRecording = useCallback(() => {
    toggleRecording(true);
    // Integration with Zoom recording API would go here
  }, [toggleRecording]);

  const stopRecording = useCallback(() => {
    toggleRecording(false);
  }, [toggleRecording]);

  // Presentation controls
  const startPresentation = useCallback(() => {
    togglePresentationMode(true);
    slideStartPresentation();
  }, [togglePresentationMode, slideStartPresentation]);

  const endPresentation = useCallback(() => {
    togglePresentationMode(false);
    slideEndPresentation();
  }, [togglePresentationMode, slideEndPresentation]);

  // Full reset
  const reset = useCallback(() => {
    resetCallStore();
    resetMilestoneStore();
    resetObjectionStore();
    resetSlideStore();
  }, [resetCallStore, resetMilestoneStore, resetObjectionStore, resetSlideStore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Optionally save state or perform cleanup
    };
  }, []);

  return {
    activeCall,
    isLoading,
    error,
    preCallChecklist,
    isChecklistComplete: isChecklistComplete(),
    startCall,
    endCall,
    pauseCall,
    resumeCall,
    updateChecklistItem,
    resetChecklist,
    startRecording,
    stopRecording,
    isRecording: activeCall?.isRecording ?? false,
    startPresentation,
    endPresentation,
    isPresentationMode: activeCall?.isPresentationMode ?? false,
    reset,
  };
}
