'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronRight, Loader2, Phone, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import {
  PreviousCallContext,
  type LastMilestoneCompleted,
  type PreviousCallSummary,
  type QualificationFlags,
  type UnresolvedObjection,
} from './PreviousCallContext';
import {
  ResumePointSelector,
  type ResumePointSelection,
  type SuggestedResumePoint,
} from './ResumePointSelector';

export interface ScheduledFollowUp {
  callId: string;
  prospectId: string;
  prospectName: string;
  scheduledFor: Date;
  hasContext: boolean;
  previousCallCount: number;
  lastOutcome: string | null;
}

export interface FollowUpContext {
  callSessionId: string;
  prospectId: string;
  prospectName: string;
  previousCallSummary: PreviousCallSummary;
  lastMilestoneCompleted: LastMilestoneCompleted | null;
  unresolvedObjections: UnresolvedObjection[];
  qualificationFlags: QualificationFlags;
  suggestedResumePoints: SuggestedResumePoint[];
  languagePreference: string;
  callMode: string;
}

interface FollowUpCallSetupProps {
  followUps: ScheduledFollowUp[];
  onSelectFollowUp: (callId: string) => void;
  onStartCall: (callId: string, resumePoint: ResumePointSelection) => Promise<void>;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
}

function FollowUpCallSetup({
  followUps,
  onSelectFollowUp,
  onStartCall,
  onRefresh,
  isLoading = false,
  className,
}: FollowUpCallSetupProps) {
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [context, setContext] = useState<FollowUpContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [selectedResumePoint, setSelectedResumePoint] =
    useState<ResumePointSelection | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  // Fetch context when a follow-up is selected
  useEffect(() => {
    if (!selectedCallId) {
      setContext(null);
      setSelectedResumePoint(null);
      return;
    }

    const fetchContext = async () => {
      setContextLoading(true);
      try {
        const response = await fetch(`/api/calls/${selectedCallId}/context`);
        const data = await response.json();

        if (!data.isFirstCall && data.context) {
          setContext(data.context);
          // Auto-select first resume point if available
          if (data.context.suggestedResumePoints?.length > 0) {
            const firstPoint = data.context.suggestedResumePoints[0];
            setSelectedResumePoint({
              type:
                firstPoint.type === 'milestone'
                  ? 'from_milestone'
                  : firstPoint.type === 'decision'
                  ? 'jump_to_decision'
                  : 'address_objection',
              milestoneNumber: firstPoint.milestoneNumber,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching context:', error);
      } finally {
        setContextLoading(false);
      }
    };

    fetchContext();
    onSelectFollowUp(selectedCallId);
  }, [selectedCallId, onSelectFollowUp]);

  const handleStartCall = async () => {
    if (!selectedCallId || !selectedResumePoint) return;

    setStarting(true);
    try {
      await onStartCall(selectedCallId, selectedResumePoint);
      setConfirmDialogOpen(false);
    } catch (error) {
      console.error('Error starting call:', error);
    } finally {
      setStarting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOutcomeColor = (outcome: string | null) => {
    if (!outcome) return 'bg-gray-100 text-gray-800';
    switch (outcome.toLowerCase()) {
      case 'sold':
      case 'proceed':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
      case 'pause':
        return 'bg-yellow-100 text-yellow-800';
      case 'declined':
      case 'disqualified':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Follow-Up Calls</h2>
          <p className="text-sm text-muted-foreground">
            Select a scheduled follow-up to continue the conversation
          </p>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        )}
      </div>

      {/* Follow-Up List */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Follow-up selector */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Scheduled Follow-Ups ({followUps.length})
          </h3>

          {followUps.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Phone className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No follow-up calls scheduled
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {followUps.map((followUp) => (
                <button
                  key={followUp.callId}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors',
                    selectedCallId === followUp.callId
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedCallId(followUp.callId)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium">{followUp.prospectName}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(followUp.scheduledFor)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {followUp.lastOutcome && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            getOutcomeColor(followUp.lastOutcome)
                          )}
                        >
                          {followUp.lastOutcome}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {followUp.previousCallCount} previous call
                    {followUp.previousCallCount !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Context and resume point */}
        <div className="space-y-4">
          {!selectedCallId ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8">
              <p className="text-center text-sm text-muted-foreground">
                Select a follow-up call to view context
              </p>
            </div>
          ) : contextLoading ? (
            <div className="flex h-full items-center justify-center rounded-lg border p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : context ? (
            <>
              <PreviousCallContext
                previousCallSummary={context.previousCallSummary}
                lastMilestoneCompleted={context.lastMilestoneCompleted}
                unresolvedObjections={context.unresolvedObjections}
                qualificationFlags={context.qualificationFlags}
                prospectName={context.prospectName}
              />

              <ResumePointSelector
                suggestedResumePoints={context.suggestedResumePoints}
                selectedPoint={selectedResumePoint}
                onSelect={setSelectedResumePoint}
              />

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedResumePoint}
                onClick={() => setConfirmDialogOpen(true)}
              >
                <Phone className="mr-2 h-4 w-4" />
                Start Follow-Up Call
              </Button>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8">
              <p className="text-center text-sm text-muted-foreground">
                No previous call context available
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Follow-Up Call</DialogTitle>
            <DialogDescription>
              You are about to start a follow-up call with{' '}
              <strong>{context?.prospectName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-2 font-medium">Resume Point</h4>
              {selectedResumePoint?.type === 'from_milestone' && (
                <p className="text-sm text-muted-foreground">
                  Continue from Milestone {selectedResumePoint.milestoneNumber}
                </p>
              )}
              {selectedResumePoint?.type === 'jump_to_decision' && (
                <p className="text-sm text-muted-foreground">
                  Jump directly to Decision (M7)
                </p>
              )}
              {selectedResumePoint?.type === 'address_objection' && (
                <p className="text-sm text-muted-foreground">
                  Address unresolved objections first
                </p>
              )}
            </div>

            {context?.unresolvedObjections && context.unresolvedObjections.length > 0 && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> There are{' '}
                  {context.unresolvedObjections.length} unresolved objection(s)
                  from the previous call.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={starting}
            >
              Cancel
            </Button>
            <Button onClick={handleStartCall} disabled={starting}>
              {starting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Start
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { FollowUpCallSetup };
