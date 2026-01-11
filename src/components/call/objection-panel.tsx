'use client';

import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';

export interface ObjectionType {
  id: string;
  type: string;
  name: string;
  description?: string;
  diagnosticQuestions?: string[];
  handlingStrategies?: string[];
}

interface ObjectionPanelProps {
  objections: ObjectionType[];
  onObjectionSelect: (objection: ObjectionType) => void;
  activeObjection?: ObjectionType | null;
  onDismiss?: () => void;
  className?: string;
}

const objectionColors: Record<string, string> = {
  PRICE: 'bg-red-500/10 text-red-600 border-red-200',
  TIMING: 'bg-orange-500/10 text-orange-600 border-orange-200',
  CAPACITY_TIME: 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  NEED_TO_THINK: 'bg-blue-500/10 text-blue-600 border-blue-200',
  PARTNER_TEAM: 'bg-purple-500/10 text-purple-600 border-purple-200',
  SKEPTICISM: 'bg-gray-500/10 text-gray-600 border-gray-200',
};

export function ObjectionPanel({
  objections,
  onObjectionSelect,
  activeObjection,
  onDismiss,
  className,
}: ObjectionPanelProps) {
  const [step, setStep] = React.useState<'select' | 'diagnose' | 'handle'>(
    'select'
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    if (!activeObjection) {
      setStep('select');
      setCurrentQuestionIndex(0);
      setAnswers({});
    }
  }, [activeObjection]);

  if (activeObjection && step === 'diagnose') {
    const questions = activeObjection.diagnosticQuestions || [];
    const currentQuestion = questions[currentQuestionIndex];

    return (
      <GlassCard className={cn('p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <Badge className={objectionColors[activeObjection.type] || ''}>
            {activeObjection.name}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Cancel
          </Button>
        </div>

        <h4 className="font-medium text-foreground mb-2">Diagnostic Question</h4>
        <p className="text-sm text-muted-foreground mb-4">
          {currentQuestion || 'No diagnostic questions configured'}
        </p>

        <div className="flex gap-2">
          {currentQuestionIndex > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentQuestionIndex((i) => i - 1)}
            >
              Previous
            </Button>
          )}
          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentQuestionIndex((i) => i + 1)}
            >
              Next Question
            </Button>
          ) : (
            <Button size="sm" onClick={() => setStep('handle')}>
              View Strategies
            </Button>
          )}
        </div>
      </GlassCard>
    );
  }

  if (activeObjection && step === 'handle') {
    const strategies = activeObjection.handlingStrategies || [];

    return (
      <GlassCard className={cn('p-6', className)}>
        <div className="flex items-center justify-between mb-4">
          <Badge className={objectionColors[activeObjection.type] || ''}>
            {activeObjection.name}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Done
          </Button>
        </div>

        <h4 className="font-medium text-foreground mb-2">Handling Strategies</h4>
        <ul className="space-y-2">
          {strategies.map((strategy, index) => (
            <li
              key={index}
              className="text-sm text-muted-foreground flex items-start gap-2"
            >
              <span className="text-primary font-medium">{index + 1}.</span>
              {strategy}
            </li>
          ))}
          {strategies.length === 0 && (
            <li className="text-sm text-muted-foreground">
              No handling strategies configured
            </li>
          )}
        </ul>

        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setStep('diagnose')}>
            Back to Questions
          </Button>
          <Button size="sm" variant="success" onClick={onDismiss}>
            Mark Resolved
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className={cn('p-6', className)}>
      <h4 className="font-medium text-foreground mb-4">Objection Detected?</h4>
      <div className="grid grid-cols-2 gap-2">
        {objections.map((objection) => (
          <Button
            key={objection.id}
            variant="outline"
            size="sm"
            className={cn('justify-start', objectionColors[objection.type])}
            onClick={() => {
              onObjectionSelect(objection);
              setStep('diagnose');
            }}
          >
            {objection.name}
          </Button>
        ))}
      </div>
    </GlassCard>
  );
}
