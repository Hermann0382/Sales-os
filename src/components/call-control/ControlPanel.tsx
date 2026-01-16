'use client';

import { useState } from 'react';
import { Phone } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MilestoneDisplay, MilestoneDisplayProps } from './MilestoneDisplay';
import { ChecklistPanel, ChecklistItem } from './ChecklistPanel';
import { NotesEditor } from './NotesEditor';
import { ProgressIndicator, MilestoneProgress } from './ProgressIndicator';
import { TimerDisplay } from './TimerDisplay';
import { ObjectionTrigger, Objection } from './ObjectionTrigger';
import { NavigationControls } from './NavigationControls';
import { ObjectionTypeSelector } from './ObjectionTypeSelector';
import { ObjectionSubflowModal } from './ObjectionSubflowModal';
import { CallOutcomeModal } from './CallOutcomeModal';
import { SlideNavigator, SlideData } from './slide-navigator';
import { SlidePreview, SlidePreviewData } from './slide-preview';
import { PresentationControls, SyncMethod, ConnectionStatus } from './presentation-controls';
import type { ObjectionType, ObjectionOutcome } from '@/services/objection-flow-service';
import type {
  CallOutcomeType,
  DisqualificationReason,
  QualificationFlags,
} from '@/services/call-outcome-service';

export interface ControlPanelProps {
  // Call info
  callId: string;
  callMode: 'strict' | 'flexible';
  callStatus: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  startedAt?: Date | null;

  // Current milestone
  currentMilestone: MilestoneDisplayProps & { id: string };
  milestoneStartedAt?: Date | null;

  // Checklist
  checklistItems: ChecklistItem[];
  onChecklistChange: (itemId: string, checked: boolean) => void;

  // Notes
  notes: string;
  onNotesChange: (notes: string) => void;
  onNotesSave?: (notes: string) => Promise<void>;

  // Progress
  milestoneProgress: MilestoneProgress[];

  // Objections
  objections: Objection[];
  currentObjectionId?: string | null;
  onObjectionSelect: (objectionId: string) => void;

  // Navigation
  onPreviousMilestone: () => void;
  onNextMilestone: () => void;
  onCompleteMilestone: () => void;
  onSkipMilestone: (reason: string) => void;

  // Enhanced objection handling
  onObjectionStart?: (type: ObjectionType) => void;
  onObjectionComplete?: (
    type: ObjectionType,
    outcome: ObjectionOutcome,
    answers: Record<number, string>
  ) => void;

  // Call completion
  onEndCall?: (
    outcomeType: CallOutcomeType,
    disqualificationReason?: DisqualificationReason,
    qualificationFlags?: QualificationFlags
  ) => void;
  isAdvisoryMode?: boolean;
  allowedOutcomes?: CallOutcomeType[];
  completionWarnings?: string[];

  // State
  isLoading?: boolean;
  disabled?: boolean;

  // Slide presentation (optional)
  slides?: SlideData[];
  currentSlideIndex?: number;
  currentSlideData?: SlidePreviewData | null;
  onSlideSelect?: (index: number) => void;
  onSlideNavigate?: (direction: 'previous' | 'next') => void;
  onSlideNotesChange?: (notes: string) => void;
  onSlideOutcomeChange?: (outcome: 'positive' | 'neutral' | 'negative') => void;
  isPresenting?: boolean;
  onTogglePresentation?: () => void;
  syncMethod?: SyncMethod;
  connectionStatus?: ConnectionStatus;
  onReconnect?: () => void;
  presentationUrl?: string;
  slidesLoading?: boolean;
}

export function ControlPanel({
  callId,
  callMode,
  callStatus,
  startedAt,
  currentMilestone,
  milestoneStartedAt,
  checklistItems,
  onChecklistChange,
  notes,
  onNotesChange,
  onNotesSave,
  milestoneProgress,
  objections,
  currentObjectionId,
  onObjectionSelect,
  onPreviousMilestone,
  onNextMilestone,
  onCompleteMilestone,
  onSkipMilestone,
  onObjectionStart,
  onObjectionComplete,
  onEndCall,
  isAdvisoryMode = false,
  allowedOutcomes,
  completionWarnings = [],
  isLoading = false,
  disabled = false,
  // Slide presentation props
  slides = [],
  currentSlideIndex = 0,
  currentSlideData = null,
  onSlideSelect,
  onSlideNavigate,
  onSlideNotesChange,
  onSlideOutcomeChange,
  isPresenting = false,
  onTogglePresentation,
  syncMethod = 'none',
  connectionStatus = 'disconnected',
  onReconnect,
  presentationUrl,
  slidesLoading = false,
}: ControlPanelProps) {
  const isCallActive = callStatus === 'in_progress';
  const hasSlides = slides.length > 0;

  // Tab and modal state
  const [activeTab, setActiveTab] = useState<'script' | 'slides'>(hasSlides ? 'slides' : 'script');
  const [showObjectionTypeSelector, setShowObjectionTypeSelector] = useState(false);
  const [showObjectionSubflow, setShowObjectionSubflow] = useState(false);
  const [activeObjectionType, setActiveObjectionType] = useState<ObjectionType | null>(null);
  const [showCallOutcomeModal, setShowCallOutcomeModal] = useState(false);

  // Handle objection type selection
  const handleObjectionTypeSelect = (type: ObjectionType) => {
    setActiveObjectionType(type);
    setShowObjectionTypeSelector(false);
    setShowObjectionSubflow(true);
    onObjectionStart?.(type);
  };

  // Handle objection flow completion
  const handleObjectionComplete = (outcome: ObjectionOutcome, answers: Record<number, string>) => {
    if (activeObjectionType) {
      onObjectionComplete?.(activeObjectionType, outcome, answers);
    }
    setShowObjectionSubflow(false);
    setActiveObjectionType(null);
  };

  // Handle call outcome submission
  const handleEndCall = (
    outcomeType: CallOutcomeType,
    disqualificationReason?: DisqualificationReason,
    qualificationFlags?: QualificationFlags
  ) => {
    onEndCall?.(outcomeType, disqualificationReason, qualificationFlags);
  };
  const currentIndex = milestoneProgress.findIndex(
    (m) => m.milestoneId === currentMilestone.id
  );
  const isFirstMilestone = currentIndex === 0;
  const isLastMilestone = currentIndex === milestoneProgress.length - 1;

  // Check if all required items are checked
  const requiredItems = checklistItems.filter((item) => item.required);
  const allRequiredChecked = requiredItems.every((item) => item.checked);

  // Determine what actions are available
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < milestoneProgress.length - 1;
  const canComplete = allRequiredChecked;
  const canSkip = callMode === 'flexible' && !isLastMilestone;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with progress and timer */}
      <div className="flex-shrink-0 border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                callMode === 'strict'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-blue-100 text-blue-700'
              )}
            >
              {callMode.toUpperCase()} MODE
            </span>
            <span
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                isCallActive
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              )}
            >
              {callStatus.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <TimerDisplay
            startTime={milestoneStartedAt || startedAt}
            estimatedMinutes={currentMilestone.estimatedMinutes}
          />
        </div>

        <ProgressIndicator
          milestones={milestoneProgress}
          currentMilestoneId={currentMilestone.id}
        />
      </div>

      {/* Main content area - scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {hasSlides ? (
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'script' | 'slides')} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="slides">Slides</TabsTrigger>
              <TabsTrigger value="script">Script</TabsTrigger>
            </TabsList>

            {/* Slides Tab */}
            <TabsContent value="slides" className="flex-1 space-y-4 mt-0">
              {/* Presentation Controls */}
              {onTogglePresentation && (
                <PresentationControls
                  isPresenting={isPresenting}
                  onTogglePresentation={onTogglePresentation}
                  syncMethod={syncMethod}
                  connectionStatus={connectionStatus}
                  onReconnect={onReconnect}
                  presentationUrl={presentationUrl}
                />
              )}

              {/* Slide Navigator */}
              <SlideNavigator
                slides={slides}
                currentSlideIndex={currentSlideIndex}
                onSlideSelect={onSlideSelect || (() => {})}
                onPrevious={() => onSlideNavigate?.('previous')}
                onNext={() => onSlideNavigate?.('next')}
                disabled={disabled || !isCallActive}
              />

              {/* Slide Preview */}
              <SlidePreview
                slide={currentSlideData}
                onNotesChange={onSlideNotesChange}
                onOutcomeChange={onSlideOutcomeChange}
                isLoading={slidesLoading}
              />
            </TabsContent>

            {/* Script Tab */}
            <TabsContent value="script" className="flex-1 space-y-6 mt-0">
              {/* Current Milestone */}
              <MilestoneDisplay {...currentMilestone} isActive status="in_progress" />

              {/* Checklist */}
              <ChecklistPanel
                items={checklistItems}
                onItemChange={onChecklistChange}
                disabled={disabled || !isCallActive}
                title="Required Items"
              />

              {/* Notes */}
              <NotesEditor
                value={notes}
                onChange={onNotesChange}
                onSave={onNotesSave}
                disabled={disabled || !isCallActive}
                placeholder="Add notes about this milestone conversation..."
              />

              {/* Objection Handler */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">
                  Objection Handling
                </h4>
                <ObjectionTrigger
                  objections={objections}
                  onObjectionSelect={onObjectionSelect}
                  currentObjectionId={currentObjectionId}
                  disabled={disabled || !isCallActive}
                />
                {/* Enhanced objection flow button */}
                {onObjectionComplete && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowObjectionTypeSelector(true)}
                    disabled={disabled || !isCallActive}
                  >
                    Start Objection Flow
                  </Button>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Original layout when no slides */
          <div className="space-y-6">
            {/* Current Milestone */}
            <MilestoneDisplay {...currentMilestone} isActive status="in_progress" />

            {/* Checklist */}
            <ChecklistPanel
              items={checklistItems}
              onItemChange={onChecklistChange}
              disabled={disabled || !isCallActive}
              title="Required Items"
            />

            {/* Notes */}
            <NotesEditor
              value={notes}
              onChange={onNotesChange}
              onSave={onNotesSave}
              disabled={disabled || !isCallActive}
              placeholder="Add notes about this milestone conversation..."
            />

            {/* Objection Handler */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                Objection Handling
              </h4>
              <ObjectionTrigger
                objections={objections}
                onObjectionSelect={onObjectionSelect}
                currentObjectionId={currentObjectionId}
                disabled={disabled || !isCallActive}
              />
              {/* Enhanced objection flow button */}
              {onObjectionComplete && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowObjectionTypeSelector(true)}
                  disabled={disabled || !isCallActive}
                >
                  Start Objection Flow
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer with navigation */}
      <div className="flex-shrink-0 border-t p-4 bg-muted/30 space-y-3">
        <NavigationControls
          canGoBack={canGoBack}
          canGoNext={canGoNext}
          canComplete={canComplete}
          canSkip={canSkip}
          isFirstMilestone={isFirstMilestone}
          isLastMilestone={isLastMilestone}
          mode={callMode}
          onBack={onPreviousMilestone}
          onNext={onNextMilestone}
          onComplete={onCompleteMilestone}
          onSkip={onSkipMilestone}
          disabled={disabled || isLoading || !isCallActive}
        />

        {/* End Call Button */}
        {onEndCall && isCallActive && (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setShowCallOutcomeModal(true)}
            disabled={disabled || isLoading}
          >
            <Phone className="w-4 h-4 mr-2" />
            End Call
          </Button>
        )}
      </div>

      {/* Modals */}
      <ObjectionTypeSelector
        isOpen={showObjectionTypeSelector}
        onClose={() => setShowObjectionTypeSelector(false)}
        onSelect={handleObjectionTypeSelect}
        currentMilestone={currentMilestone.milestoneNumber}
      />

      {activeObjectionType && (
        <ObjectionSubflowModal
          isOpen={showObjectionSubflow}
          onClose={() => {
            setShowObjectionSubflow(false);
            setActiveObjectionType(null);
          }}
          objectionType={activeObjectionType}
          onComplete={handleObjectionComplete}
        />
      )}

      <CallOutcomeModal
        isOpen={showCallOutcomeModal}
        onClose={() => setShowCallOutcomeModal(false)}
        onSubmit={handleEndCall}
        allowedOutcomes={allowedOutcomes}
        isAdvisoryMode={isAdvisoryMode}
        warnings={completionWarnings}
      />
    </div>
  );
}
