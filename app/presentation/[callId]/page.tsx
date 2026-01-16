'use client';

/**
 * Presentation View Page
 *
 * Full-screen presentation view for screen sharing during calls.
 * Receives slide navigation commands via BroadcastChannel from the control panel.
 */

import * as React from 'react';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Monitor,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PresentationBroadcastChannel } from '@/lib/realtime/broadcast-channel';

interface RenderedSlideContent {
  title: string;
  coreMessage: string | null;
  visualization: string | null;
  parameters: Record<string, string>;
}

interface SlideData {
  id: string;
  slideTemplateId: string;
  title: string;
  coreMessage: string | null;
  visualizationTemplate: string | null;
  orderIndex: number;
  milestoneId: string | null;
  milestoneName: string | null;
  renderedContent: RenderedSlideContent | null;
}

export default function PresentationViewPage() {
  const params = useParams();
  const callId = params.callId as string;

  // State
  const [slides, setSlides] = React.useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState(0);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Refs
  const broadcastRef = React.useRef<PresentationBroadcastChannel | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Fetch slides on mount
  React.useEffect(() => {
    async function fetchSlides() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/calls/${callId}/slides`, {
          method: 'POST', // POST renders with parameters
        });

        if (!response.ok) {
          throw new Error('Failed to fetch slides');
        }

        const { data } = await response.json();
        setSlides(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load slides');
      } finally {
        setIsLoading(false);
      }
    }

    if (callId) {
      fetchSlides();
    }
  }, [callId]);

  // Connect to BroadcastChannel for sync
  React.useEffect(() => {
    if (!callId) return;

    const broadcast = new PresentationBroadcastChannel(callId);
    broadcastRef.current = broadcast;

    const connected = broadcast.connect();
    setIsConnected(connected);

    // Listen for slide change events
    const unsubSlide = broadcast.on<{ slideIndex: number }>(
      'slide_change',
      (message) => {
        setCurrentSlideIndex(message.payload.slideIndex);
      }
    );

    // Listen for presentation end
    const unsubEnd = broadcast.on('presentation_end', () => {
      // Close the window when presentation ends
      window.close();
    });

    return () => {
      unsubSlide();
      unsubEnd();
      broadcast.disconnect();
    };
  }, [callId]);

  // Keyboard navigation
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' && currentSlideIndex > 0) {
        setCurrentSlideIndex((prev) => prev - 1);
        broadcastRef.current?.broadcastSlideChange(currentSlideIndex - 1);
      } else if (
        event.key === 'ArrowRight' &&
        currentSlideIndex < slides.length - 1
      ) {
        setCurrentSlideIndex((prev) => prev + 1);
        broadcastRef.current?.broadcastSlideChange(currentSlideIndex + 1);
      } else if (event.key === 'f' || event.key === 'F') {
        toggleFullscreen();
      } else if (event.key === 'Escape' && isFullscreen) {
        exitFullscreen();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSlideIndex, slides.length, isFullscreen]);

  // Fullscreen handling
  const toggleFullscreen = React.useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const exitFullscreen = React.useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  React.useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Navigation handlers
  const goToPrevious = () => {
    if (currentSlideIndex > 0) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      broadcastRef.current?.broadcastSlideChange(newIndex);
    }
  };

  const goToNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      broadcastRef.current?.broadcastSlideChange(newIndex);
    }
  };

  // Current slide data
  const currentSlide = slides[currentSlideIndex];
  const content = currentSlide?.renderedContent;
  const displayTitle = content?.title ?? currentSlide?.title ?? '';
  const displayMessage = content?.coreMessage ?? currentSlide?.coreMessage;
  const displayVisualization =
    content?.visualization ?? currentSlide?.visualizationTemplate;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white">
          <Monitor className="h-12 w-12 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading presentation...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white">
          <p className="text-lg text-red-400 mb-4">{error}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (slides.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center text-white">
          <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No slides available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-black/20">
        <div className="flex items-center gap-3">
          <Badge
            variant={isConnected ? 'success' : 'secondary'}
            className="gap-1"
          >
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                isConnected ? 'bg-green-400' : 'bg-gray-400'
              )}
            />
            {isConnected ? 'Synced' : 'Local Only'}
          </Badge>
          {currentSlide?.milestoneName && (
            <Badge variant="outline" className="text-white/70">
              {currentSlide.milestoneName}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/70 text-sm">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:text-white"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      {/* Main slide content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-5xl">
          {/* Slide title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center mb-8 leading-tight">
            {displayTitle}
          </h1>

          {/* Core message */}
          {displayMessage && (
            <p className="text-xl md:text-2xl text-white/80 text-center mb-12 max-w-3xl mx-auto leading-relaxed">
              {displayMessage}
            </p>
          )}

          {/* Visualization */}
          {displayVisualization && (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mx-auto max-w-4xl">
              <p className="text-lg text-white/90 whitespace-pre-wrap leading-relaxed">
                {displayVisualization}
              </p>
            </div>
          )}

          {/* Parameters display (small badges) */}
          {content?.parameters &&
            Object.keys(content.parameters).length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {Object.entries(content.parameters).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant="outline"
                    className="text-white/60 border-white/20 text-xs"
                  >
                    {key}: {value}
                  </Badge>
                ))}
              </div>
            )}
        </div>
      </main>

      {/* Footer with navigation */}
      <footer className="flex items-center justify-center gap-4 px-6 py-4 bg-black/20">
        <Button
          variant="ghost"
          size="lg"
          className="text-white/70 hover:text-white"
          onClick={goToPrevious}
          disabled={currentSlideIndex === 0}
        >
          <ChevronLeft className="h-6 w-6 mr-2" />
          Previous
        </Button>

        {/* Slide indicators */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentSlideIndex(index);
                broadcastRef.current?.broadcastSlideChange(index);
              }}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                index === currentSlideIndex
                  ? 'bg-primary w-8'
                  : 'bg-white/30 hover:bg-white/50'
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="lg"
          className="text-white/70 hover:text-white"
          onClick={goToNext}
          disabled={currentSlideIndex === slides.length - 1}
        >
          Next
          <ChevronRight className="h-6 w-6 ml-2" />
        </Button>
      </footer>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/40 text-xs">
        Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded">F</kbd> for
        fullscreen &nbsp;&bull;&nbsp;
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded">←</kbd>
        <kbd className="px-1.5 py-0.5 bg-white/10 rounded">→</kbd> to navigate
      </div>
    </div>
  );
}
