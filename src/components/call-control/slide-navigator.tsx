'use client';

/**
 * SlideNavigator Component
 *
 * Displays a thumbnail strip of all slides with navigation controls.
 * Allows agents to quickly navigate between slides during a call.
 */

import * as React from 'react';
import { ChevronLeft, ChevronRight, Presentation } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export interface SlideData {
  id: string;
  slideTemplateId: string;
  title: string;
  orderIndex: number;
  milestoneId: string | null;
  milestoneName: string | null;
  instanceId: string | null;
  outcomeTag: 'positive' | 'neutral' | 'negative' | null;
}

export interface SlideNavigatorProps {
  slides: SlideData[];
  currentSlideIndex: number;
  onSlideSelect: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Get outcome tag color classes
 */
function getOutcomeColor(outcomeTag: SlideData['outcomeTag']): string {
  switch (outcomeTag) {
    case 'positive':
      return 'ring-2 ring-success';
    case 'neutral':
      return 'ring-2 ring-warning';
    case 'negative':
      return 'ring-2 ring-destructive';
    default:
      return '';
  }
}

/**
 * Individual slide thumbnail
 */
function SlideThumbnail({
  slide,
  index,
  isActive,
  onClick,
  disabled,
}: {
  slide: SlideData;
  index: number;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex-shrink-0 w-24 h-16 rounded-lg border-2 transition-all duration-200',
        'flex flex-col items-center justify-center p-1 text-center',
        'hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        isActive
          ? 'border-primary bg-primary/10 shadow-sm'
          : 'border-border bg-surface/50 hover:bg-surface',
        disabled && 'opacity-50 cursor-not-allowed',
        getOutcomeColor(slide.outcomeTag)
      )}
      aria-label={`Go to slide ${index + 1}: ${slide.title}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <span className="text-[10px] font-medium text-muted-foreground mb-0.5">
        {index + 1}
      </span>
      <span
        className={cn(
          'text-xs font-medium line-clamp-2 leading-tight',
          isActive ? 'text-primary' : 'text-foreground'
        )}
      >
        {slide.title}
      </span>
      {slide.milestoneName && (
        <span className="text-[8px] text-muted-foreground mt-0.5 truncate max-w-full">
          {slide.milestoneName}
        </span>
      )}
    </button>
  );
}

export function SlideNavigator({
  slides,
  currentSlideIndex,
  onSlideSelect,
  onPrevious,
  onNext,
  className,
  disabled = false,
}: SlideNavigatorProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const thumbnailRefs = React.useRef<Map<number, HTMLButtonElement>>(new Map());

  // Scroll active thumbnail into view when it changes
  React.useEffect(() => {
    const thumbnail = thumbnailRefs.current.get(currentSlideIndex);
    if (thumbnail && scrollRef.current) {
      thumbnail.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentSlideIndex]);

  // Keyboard navigation
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (disabled) return;

      // Only handle if no input/textarea is focused
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onPrevious, onNext]);

  const canGoPrevious = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < slides.length - 1;

  if (slides.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center p-4 text-muted-foreground',
          className
        )}
      >
        <Presentation className="h-4 w-4 mr-2" />
        <span className="text-sm">No slides available</span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Header with slide count */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Presentation className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Slide {currentSlideIndex + 1} of {slides.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPrevious}
            disabled={disabled || !canGoPrevious}
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNext}
            disabled={disabled || !canGoNext}
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Thumbnail strip */}
      <ScrollArea className="w-full" ref={scrollRef}>
        <div className="flex gap-2 pb-2">
          {slides.map((slide, index) => (
            <SlideThumbnail
              key={slide.id}
              slide={slide}
              index={index}
              isActive={index === currentSlideIndex}
              onClick={() => onSlideSelect(index)}
              disabled={disabled}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Keyboard hint */}
      <p className="text-[10px] text-muted-foreground text-center">
        Use <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">←</kbd>{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">→</kbd> keys to
        navigate
      </p>
    </div>
  );
}
