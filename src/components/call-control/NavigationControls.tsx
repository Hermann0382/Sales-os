'use client';

import {
  ChevronLeft,
  ChevronRight,
  SkipForward,
  CheckCircle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';

export interface NavigationControlsProps {
  canGoBack: boolean;
  canGoNext: boolean;
  canComplete: boolean;
  canSkip: boolean;
  isFirstMilestone: boolean;
  isLastMilestone: boolean;
  mode: 'strict' | 'flexible';
  onBack: () => void;
  onNext: () => void;
  onComplete: () => void;
  onSkip: (reason: string) => void;
  disabled?: boolean;
}

export function NavigationControls({
  canGoBack,
  canGoNext,
  canComplete,
  canSkip,
  isFirstMilestone,
  isLastMilestone,
  mode,
  onBack,
  onNext,
  onComplete,
  onSkip,
  disabled = false,
}: NavigationControlsProps) {
  const [skipReason, setSkipReason] = useState('');

  const handleSkip = () => {
    if (skipReason.trim()) {
      onSkip(skipReason);
      setSkipReason('');
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={onBack}
        disabled={disabled || !canGoBack || isFirstMilestone}
        className="flex-shrink-0"
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        Previous
      </Button>

      {/* Center Actions */}
      <div className="flex items-center gap-2">
        {/* Skip Button (only in flexible mode) */}
        {mode === 'flexible' && canSkip && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                className="text-yellow-600 hover:text-yellow-700"
                disabled={disabled}
              >
                <SkipForward className="mr-1 h-4 w-4" />
                Skip
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Skip this milestone?</AlertDialogTitle>
                <AlertDialogDescription>
                  Skipping a milestone requires a reason for audit purposes. This
                  action will be logged.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <Textarea
                  placeholder="Enter reason for skipping..."
                  value={skipReason}
                  onChange={(e) => setSkipReason(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSkipReason('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSkip}
                  disabled={!skipReason.trim()}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  Skip Milestone
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Complete Button */}
        <Button
          variant="default"
          onClick={onComplete}
          disabled={disabled || !canComplete}
          className={cn(
            'bg-green-600 hover:bg-green-700',
            !canComplete && 'opacity-50'
          )}
        >
          <CheckCircle className="mr-1 h-4 w-4" />
          Complete
        </Button>
      </div>

      {/* Next/Finish Button */}
      <Button
        variant={isLastMilestone ? 'default' : 'outline'}
        onClick={onNext}
        disabled={disabled || (!canGoNext && !isLastMilestone)}
        className={cn(
          'flex-shrink-0',
          isLastMilestone && 'bg-primary hover:bg-primary/90'
        )}
      >
        {isLastMilestone ? 'Finish Call' : 'Next'}
        {!isLastMilestone && <ChevronRight className="ml-1 h-4 w-4" />}
      </Button>
    </div>
  );
}
