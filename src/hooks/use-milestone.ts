/**
 * useMilestone Hook - Manages milestone progression and responses
 * Provides unified interface for milestone operations
 */

import { useCallback, useMemo } from 'react';

import { useMilestoneStore, useCallStore } from '@/stores';
import { Milestone, MilestoneProgress, MilestoneResponseStatus } from '@/lib/types';

interface UseMilestoneReturn {
  // State
  milestones: Milestone[];
  currentMilestone: Milestone | null;
  currentMilestoneId: string | null;
  progress: MilestoneProgress[];
  isLoading: boolean;
  error: string | null;

  // Current milestone state
  currentProgress: MilestoneProgress | null;
  requiredItemsChecked: Record<string, boolean | string | number>;
  notes: string | null;
  canProceed: boolean;

  // Progress info
  completedCount: number;
  totalCount: number;
  progressPercentage: number;

  // Actions
  loadMilestones: (milestones: Milestone[]) => void;
  startMilestone: (milestoneId: string) => void;
  checkItem: (itemId: string, value: boolean | string | number) => void;
  addNote: (note: string) => void;
  completeMilestone: () => void;
  skipMilestone: (reason: string) => void;

  // Navigation
  goToNext: () => void;
  goToPrevious: () => void;
  goToMilestone: (milestoneNumber: number) => void;

  // Utils
  getMilestoneByNumber: (number: number) => Milestone | undefined;
  getMilestoneStatus: (milestoneId: string) => MilestoneResponseStatus | null;
  reset: () => void;
}

export function useMilestone(): UseMilestoneReturn {
  const {
    milestones,
    currentMilestoneId,
    responses,
    progress,
    isLoading,
    error,
    setMilestones,
    setCurrentMilestone,
    startMilestone: storeStartMilestone,
    checkItem: storeCheckItem,
    addNote: storeAddNote,
    completeMilestone: storeCompleteMilestone,
    skipMilestone: storeSkipMilestone,
    goToNextMilestone,
    goToPreviousMilestone,
    goToMilestone: storeGoToMilestone,
    reset,
  } = useMilestoneStore();

  const { activeCall } = useCallStore();

  // Current milestone
  const currentMilestone = useMemo(() => {
    return milestones.find((m) => m.id === currentMilestoneId) || null;
  }, [milestones, currentMilestoneId]);

  // Current progress
  const currentProgress = useMemo(() => {
    return progress.find((p) => p.milestoneId === currentMilestoneId) || null;
  }, [progress, currentMilestoneId]);

  // Current response data
  const currentResponse = currentMilestoneId ? responses[currentMilestoneId] : null;
  const requiredItemsChecked = currentResponse?.requiredItemsChecked || {};
  const notes = currentResponse?.notes || null;

  // Can proceed check
  const canProceed = useMemo(() => {
    if (!currentMilestone || !currentProgress) return false;
    return currentProgress.canProceed;
  }, [currentMilestone, currentProgress]);

  // Progress stats
  const completedCount = progress.filter((p) => p.status === 'completed').length;
  const totalCount = milestones.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // Load milestones
  const loadMilestones = useCallback(
    (newMilestones: Milestone[]) => {
      setMilestones(newMilestones);
      if (newMilestones.length > 0 && !currentMilestoneId) {
        setCurrentMilestone(newMilestones[0].id);
      }
    },
    [setMilestones, setCurrentMilestone, currentMilestoneId]
  );

  // Start milestone
  const startMilestone = useCallback(
    (milestoneId: string) => {
      if (!activeCall) {
        console.warn('Cannot start milestone without active call');
        return;
      }
      storeStartMilestone(milestoneId, activeCall.callSessionId);
    },
    [activeCall, storeStartMilestone]
  );

  // Check item
  const checkItem = useCallback(
    (itemId: string, value: boolean | string | number) => {
      if (!currentMilestoneId) return;
      storeCheckItem(currentMilestoneId, itemId, value);
    },
    [currentMilestoneId, storeCheckItem]
  );

  // Add note
  const addNote = useCallback(
    (note: string) => {
      if (!currentMilestoneId) return;
      storeAddNote(currentMilestoneId, note);
    },
    [currentMilestoneId, storeAddNote]
  );

  // Complete current milestone
  const completeMilestone = useCallback(() => {
    if (!currentMilestoneId) return;
    storeCompleteMilestone(currentMilestoneId);
  }, [currentMilestoneId, storeCompleteMilestone]);

  // Skip current milestone
  const skipMilestone = useCallback(
    (reason: string) => {
      if (!currentMilestoneId) return;
      storeSkipMilestone(currentMilestoneId, reason);
    },
    [currentMilestoneId, storeSkipMilestone]
  );

  // Get milestone by number
  const getMilestoneByNumber = useCallback(
    (number: number) => {
      return milestones.find((m) => m.milestoneNumber === number);
    },
    [milestones]
  );

  // Get milestone status
  const getMilestoneStatus = useCallback(
    (milestoneId: string): MilestoneResponseStatus | null => {
      const response = responses[milestoneId];
      return response?.status || null;
    },
    [responses]
  );

  return {
    milestones,
    currentMilestone,
    currentMilestoneId,
    progress,
    isLoading,
    error,
    currentProgress,
    requiredItemsChecked,
    notes,
    canProceed,
    completedCount,
    totalCount,
    progressPercentage,
    loadMilestones,
    startMilestone,
    checkItem,
    addNote,
    completeMilestone,
    skipMilestone,
    goToNext: goToNextMilestone,
    goToPrevious: goToPreviousMilestone,
    goToMilestone: storeGoToMilestone,
    getMilestoneByNumber,
    getMilestoneStatus,
    reset,
  };
}
