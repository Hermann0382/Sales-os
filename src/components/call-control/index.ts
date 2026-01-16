export { ControlPanel } from './ControlPanel';
export type { ControlPanelProps } from './ControlPanel';

export { MilestoneDisplay } from './MilestoneDisplay';
export type { MilestoneDisplayProps } from './MilestoneDisplay';

export { ChecklistPanel } from './ChecklistPanel';
export type { ChecklistItem, ChecklistPanelProps } from './ChecklistPanel';

export { NotesEditor } from './NotesEditor';
export type { NotesEditorProps } from './NotesEditor';

export { ProgressIndicator } from './ProgressIndicator';
export type { MilestoneProgress, ProgressIndicatorProps } from './ProgressIndicator';

export { TimerDisplay } from './TimerDisplay';
export type { TimerDisplayProps } from './TimerDisplay';

export { ObjectionTrigger } from './ObjectionTrigger';
export type { Objection, ObjectionTriggerProps } from './ObjectionTrigger';

export { NavigationControls } from './NavigationControls';
export type { NavigationControlsProps } from './NavigationControls';

export { PreviousCallContext } from './PreviousCallContext';
export type {
  PreviousCallContextProps,
  PreviousCallSummary,
  UnresolvedObjection,
  QualificationFlags,
  LastMilestoneCompleted,
} from './PreviousCallContext';

export { ResumePointSelector } from './ResumePointSelector';
export type {
  SuggestedResumePoint,
  ResumePointSelection,
} from './ResumePointSelector';

export { FollowUpCallSetup } from './FollowUpCallSetup';
export type {
  ScheduledFollowUp,
  FollowUpContext,
} from './FollowUpCallSetup';

export { ObjectionSubflowModal } from './ObjectionSubflowModal';
export { ObjectionTypeSelector } from './ObjectionTypeSelector';
export { CallOutcomeModal } from './CallOutcomeModal';

// Slide presentation components
export { SlideNavigator } from './slide-navigator';
export type { SlideData, SlideNavigatorProps } from './slide-navigator';

export { SlidePreview } from './slide-preview';
export type { SlidePreviewData, SlidePreviewProps, RenderedSlideContent } from './slide-preview';

export { PresentationControls } from './presentation-controls';
export type {
  SyncMethod,
  ConnectionStatus,
  PresentationControlsProps,
} from './presentation-controls';
