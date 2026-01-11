'use client';

import * as React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  objectionFlowService,
  type ObjectionType,
  type ObjectionOutcome,
  type ObjectionFlowState,
  type DiagnosticStep,
  type ObjectionFlowDefinition,
} from '@/services/objection-flow-service';

interface ObjectionSubflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  objectionType: ObjectionType;
  onComplete: (outcome: ObjectionOutcome, answers: Record<number, string>) => void;
}

type FlowPhase = 'diagnostic' | 'outcome';

export function ObjectionSubflowModal({
  isOpen,
  onClose,
  objectionType,
  onComplete,
}: ObjectionSubflowModalProps) {
  const [flowState, setFlowState] = React.useState<ObjectionFlowState | null>(null);
  const [currentStep, setCurrentStep] = React.useState<DiagnosticStep | null>(null);
  const [flowDefinition, setFlowDefinition] = React.useState<ObjectionFlowDefinition | null>(null);
  const [currentAnswer, setCurrentAnswer] = React.useState<string>('');
  const [phase, setPhase] = React.useState<FlowPhase>('diagnostic');
  const [selectedOutcome, setSelectedOutcome] = React.useState<ObjectionOutcome | null>(null);

  // Initialize flow when modal opens
  React.useEffect(() => {
    if (isOpen && objectionType) {
      const result = objectionFlowService.startFlow(objectionType);
      setFlowState(result.flowState);
      setCurrentStep(result.currentStep);
      setFlowDefinition(result.flowDefinition);
      setPhase('diagnostic');
      setCurrentAnswer('');
      setSelectedOutcome(null);
    }
  }, [isOpen, objectionType]);

  // Handle advancing to next step
  const handleNext = () => {
    if (!flowState || !currentStep) return;

    // For statements, just advance without storing answer
    const answerToStore = currentStep.isStatement ? 'acknowledged' : currentAnswer;

    const result = objectionFlowService.advanceStep(flowState, {
      answer: answerToStore,
    });

    setFlowState(result.flowState);
    setCurrentAnswer('');

    if (result.isLastStep) {
      // Move to outcome selection
      setPhase('outcome');
      setCurrentStep(null);
    } else {
      setCurrentStep(result.currentStep);
    }
  };

  // Handle going back
  const handleBack = () => {
    if (!flowState) return;

    if (phase === 'outcome') {
      // Go back to last diagnostic step
      setPhase('diagnostic');
      const lastStep = flowDefinition?.steps[flowState.totalSteps - 1] || null;
      setCurrentStep(lastStep);
      return;
    }

    if (flowState.currentStep <= 1) return;

    const result = objectionFlowService.goBackStep(flowState);
    setFlowState(result.flowState);
    setCurrentStep(result.currentStep);
    setCurrentAnswer(result.flowState.answers[result.flowState.currentStep] || '');
  };

  // Handle completing the flow
  const handleComplete = () => {
    if (!flowState || !selectedOutcome) return;

    const result = objectionFlowService.completeFlow(flowState, {
      outcome: selectedOutcome,
    });

    onComplete(result.outcome, result.answers);
    onClose();
  };

  // Check if current step can advance
  const canAdvance = React.useMemo(() => {
    if (!currentStep) return false;
    if (currentStep.isStatement) return true;
    return currentAnswer.trim().length > 0;
  }, [currentStep, currentAnswer]);

  // Render the step input based on type
  const renderStepInput = () => {
    if (!currentStep) return null;

    // Statement type - just display, no input needed
    if (currentStep.isStatement) {
      return (
        <div className="bg-muted/50 rounded-lg p-4 border border-muted">
          <p className="text-sm text-muted-foreground italic">
            Read this statement to the prospect, then click Next.
          </p>
        </div>
      );
    }

    switch (currentStep.inputType) {
      case 'select':
      case 'multiselect':
        return (
          <Select value={currentAnswer} onValueChange={setCurrentAnswer}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option..." />
            </SelectTrigger>
            <SelectContent>
              {currentStep.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'text':
      default:
        return (
          <Input
            value={currentAnswer}
            onChange={(e) => setCurrentAnswer(e.target.value)}
            placeholder={currentStep.placeholder || 'Enter response...'}
          />
        );
    }
  };

  // Render outcome selection phase
  const renderOutcomeSelection = () => {
    if (!flowDefinition) return null;

    const outcomes: { value: ObjectionOutcome; label: string; icon: React.ReactNode; color: string }[] = [
      {
        value: 'Resolved',
        label: 'Resolved',
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'border-green-500 bg-green-500/10 hover:bg-green-500/20',
      },
      {
        value: 'Deferred',
        label: 'Deferred',
        icon: <Clock className="w-5 h-5" />,
        color: 'border-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20',
      },
      {
        value: 'Disqualified',
        label: 'Disqualified',
        icon: <XCircle className="w-5 h-5" />,
        color: 'border-red-500 bg-red-500/10 hover:bg-red-500/20',
      },
    ];

    const allowedOutcomes = flowDefinition.allowedOutcomes;

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Based on the diagnostic, what is the outcome of this objection?
        </p>
        <div className="grid grid-cols-3 gap-3">
          {outcomes
            .filter((o) => allowedOutcomes.includes(o.value))
            .map((outcome) => (
              <button
                key={outcome.value}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  outcome.color,
                  selectedOutcome === outcome.value && 'ring-2 ring-ring ring-offset-2'
                )}
                onClick={() => setSelectedOutcome(outcome.value)}
              >
                {outcome.icon}
                <span className="text-sm font-medium">{outcome.label}</span>
              </button>
            ))}
        </div>
      </div>
    );
  };

  if (!flowState || !flowDefinition) return null;

  const progressPercent =
    phase === 'outcome'
      ? 100
      : ((flowState.currentStep - 1) / flowState.totalSteps) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{flowDefinition.type}</Badge>
            <DialogTitle>{flowDefinition.displayName}</DialogTitle>
          </div>
          <DialogDescription>{flowDefinition.description}</DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {phase === 'outcome'
                ? 'Select Outcome'
                : `Step ${flowState.currentStep} of ${flowState.totalSteps}`}
            </span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step content */}
        <div className="py-4 space-y-4">
          {phase === 'diagnostic' && currentStep && (
            <>
              {/* Question */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">{currentStep.question}</h3>
                <p className="text-sm text-muted-foreground">{currentStep.purpose}</p>
              </div>

              {/* Input */}
              {renderStepInput()}
            </>
          )}

          {phase === 'outcome' && renderOutcomeSelection()}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={phase === 'diagnostic' && flowState.currentStep === 1}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {phase === 'diagnostic' ? (
            <Button onClick={handleNext} disabled={!canAdvance}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={handleComplete}
              disabled={!selectedOutcome}
            >
              Complete
              <CheckCircle className="w-4 h-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
