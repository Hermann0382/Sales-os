'use client';

/**
 * SlidePreview Component
 *
 * Displays the current slide content with rendered parameters.
 * Shows title, core message, visualization, and agent notes.
 */

import * as React from 'react';
import {
  FileText,
  MessageSquare,
  BarChart3,
  StickyNote,
  Tag,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { GlassCard } from '@/components/ui/glass-card';

export interface RenderedSlideContent {
  title: string;
  coreMessage: string | null;
  visualization: string | null;
  parameters: Record<string, string>;
}

export interface SlidePreviewData {
  id: string;
  slideTemplateId: string;
  title: string;
  coreMessage: string | null;
  visualizationTemplate: string | null;
  orderIndex: number;
  milestoneId: string | null;
  milestoneName: string | null;
  instanceId: string | null;
  renderedContent: RenderedSlideContent | null;
  agentNotes: string | null;
  outcomeTag: 'positive' | 'neutral' | 'negative' | null;
}

export interface SlidePreviewProps {
  slide: SlidePreviewData | null;
  onNotesChange?: (notes: string) => void;
  onOutcomeChange?: (outcome: 'positive' | 'neutral' | 'negative') => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * Get outcome badge variant
 */
function getOutcomeBadgeVariant(
  outcome: SlidePreviewData['outcomeTag']
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (outcome) {
    case 'positive':
      return 'success';
    case 'neutral':
      return 'warning';
    case 'negative':
      return 'destructive';
    default:
      return 'secondary';
  }
}

/**
 * Outcome tag selector buttons
 */
function OutcomeSelector({
  currentOutcome,
  onChange,
  disabled,
}: {
  currentOutcome: SlidePreviewData['outcomeTag'];
  onChange?: (outcome: 'positive' | 'neutral' | 'negative') => void;
  disabled?: boolean;
}) {
  const outcomes: Array<{
    value: 'positive' | 'neutral' | 'negative';
    label: string;
  }> = [
    { value: 'positive', label: 'Positive' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'negative', label: 'Negative' },
  ];

  return (
    <div className="flex items-center gap-1">
      <Tag className="h-3 w-3 text-muted-foreground mr-1" />
      {outcomes.map((outcome) => (
        <button
          key={outcome.value}
          type="button"
          onClick={() => onChange?.(outcome.value)}
          disabled={disabled || !onChange}
          className={cn(
            'px-2 py-0.5 rounded text-xs font-medium transition-colors',
            currentOutcome === outcome.value
              ? outcome.value === 'positive'
                ? 'bg-success/20 text-success'
                : outcome.value === 'neutral'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-destructive/20 text-destructive'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted',
            (disabled || !onChange) && 'opacity-50 cursor-not-allowed'
          )}
        >
          {outcome.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Loading skeleton
 */
function SlidePreviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/4" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
      <div className="h-20 bg-muted rounded" />
    </div>
  );
}

/**
 * Empty state
 */
function EmptySlideState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <FileText className="h-12 w-12 mb-2 opacity-50" />
      <p className="text-sm">No slide selected</p>
      <p className="text-xs">Select a slide to view its content</p>
    </div>
  );
}

export function SlidePreview({
  slide,
  onNotesChange,
  onOutcomeChange,
  isLoading = false,
  className,
}: SlidePreviewProps) {
  const [localNotes, setLocalNotes] = React.useState(slide?.agentNotes ?? '');
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync local notes with slide data
  React.useEffect(() => {
    setLocalNotes(slide?.agentNotes ?? '');
  }, [slide?.agentNotes, slide?.id]);

  // Debounced notes change handler
  const handleNotesChange = React.useCallback(
    (value: string) => {
      setLocalNotes(value);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onNotesChange?.(value);
      }, 500);
    },
    [onNotesChange]
  );

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <GlassCard className={cn('p-4', className)}>
        <SlidePreviewSkeleton />
      </GlassCard>
    );
  }

  if (!slide) {
    return (
      <GlassCard className={cn('p-4', className)}>
        <EmptySlideState />
      </GlassCard>
    );
  }

  const content = slide.renderedContent;
  const displayTitle = content?.title ?? slide.title;
  const displayMessage = content?.coreMessage ?? slide.coreMessage;
  const displayVisualization =
    content?.visualization ?? slide.visualizationTemplate;

  return (
    <GlassCard className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground leading-tight">
            {displayTitle}
          </h3>
          {slide.milestoneName && (
            <Badge variant="secondary" className="mt-1 text-xs">
              {slide.milestoneName}
            </Badge>
          )}
        </div>
        <div className="flex-shrink-0 text-sm text-muted-foreground">
          #{slide.orderIndex + 1}
        </div>
      </div>

      {/* Core Message */}
      {displayMessage && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageSquare className="h-3 w-3" />
            <span>Core Message</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {displayMessage}
          </p>
        </div>
      )}

      {/* Visualization */}
      {displayVisualization && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BarChart3 className="h-3 w-3" />
            <span>Visualization</span>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {displayVisualization}
            </p>
          </div>
        </div>
      )}

      {/* Parameters used */}
      {content?.parameters && Object.keys(content.parameters).length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Parameters</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(content.parameters).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-xs">
                {key}: {value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Outcome Tag */}
      <div className="pt-2 border-t border-border/50">
        <OutcomeSelector
          currentOutcome={slide.outcomeTag}
          onChange={onOutcomeChange}
          disabled={!slide.instanceId}
        />
      </div>

      {/* Agent Notes */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <StickyNote className="h-3 w-3" />
          <span>Agent Notes</span>
        </div>
        <Textarea
          value={localNotes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add notes about this slide..."
          className="min-h-[60px] text-sm resize-none"
          disabled={!slide.instanceId && !onNotesChange}
        />
      </div>
    </GlassCard>
  );
}
