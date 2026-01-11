'use client';

import * as React from 'react';
import {
  Trophy,
  Calendar,
  Wrench,
  XCircle,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  type CallOutcomeType,
  type DisqualificationReason,
  type QualificationFlags,
} from '@/services/call-outcome-service';

interface OutcomeOption {
  type: CallOutcomeType;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const outcomeOptions: OutcomeOption[] = [
  {
    type: 'Coaching_Client',
    displayName: 'Coaching Client',
    description: 'Closed deal - client is moving forward',
    icon: <Trophy className="w-6 h-6" />,
    color: 'border-green-500 bg-green-500/10 hover:bg-green-500/20',
  },
  {
    type: 'Follow_up_Scheduled',
    displayName: 'Follow-up Scheduled',
    description: 'Qualified, but needs another conversation',
    icon: <Calendar className="w-6 h-6" />,
    color: 'border-blue-500 bg-blue-500/10 hover:bg-blue-500/20',
  },
  {
    type: 'Implementation_Only',
    displayName: 'Implementation Only',
    description: 'One-time implementation without ongoing coaching',
    icon: <Wrench className="w-6 h-6" />,
    color: 'border-purple-500 bg-purple-500/10 hover:bg-purple-500/20',
  },
  {
    type: 'Disqualified',
    displayName: 'Disqualified',
    description: 'Not a fit for the program',
    icon: <XCircle className="w-6 h-6" />,
    color: 'border-red-500 bg-red-500/10 hover:bg-red-500/20',
  },
];

const disqualificationReasons: { value: DisqualificationReason; label: string }[] = [
  { value: 'Under_500_Clients', label: 'Under 500 clients' },
  { value: 'Cashflow_Mismatch', label: 'Cashflow mismatch' },
  { value: 'Misaligned_Expectations', label: 'Misaligned expectations' },
  { value: 'Capacity_Constraint', label: 'Capacity constraint' },
  { value: 'Authority_Issue', label: 'Authority issue' },
];

interface CallOutcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    outcomeType: CallOutcomeType,
    disqualificationReason?: DisqualificationReason,
    qualificationFlags?: QualificationFlags
  ) => void;
  allowedOutcomes?: CallOutcomeType[];
  isAdvisoryMode?: boolean;
  warnings?: string[];
}

export function CallOutcomeModal({
  isOpen,
  onClose,
  onSubmit,
  allowedOutcomes,
  isAdvisoryMode = false,
  warnings = [],
}: CallOutcomeModalProps) {
  const [selectedOutcome, setSelectedOutcome] = React.useState<CallOutcomeType | null>(null);
  const [disqualificationReason, setDisqualificationReason] = React.useState<DisqualificationReason | undefined>();
  const [qualificationFlags, setQualificationFlags] = React.useState<QualificationFlags>({
    has500Clients: true,
    financialCapacity: true,
    strategicAlignment: true,
  });

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedOutcome(null);
      setDisqualificationReason(undefined);
      setQualificationFlags({
        has500Clients: !isAdvisoryMode,
        financialCapacity: true,
        strategicAlignment: true,
      });
    }
  }, [isOpen, isAdvisoryMode]);

  const handleSubmit = () => {
    if (!selectedOutcome) return;

    if (selectedOutcome === 'Disqualified' && !disqualificationReason) {
      return; // Reason required
    }

    onSubmit(selectedOutcome, disqualificationReason, qualificationFlags);
    onClose();
  };

  // Filter outcomes if allowedOutcomes is provided
  const availableOutcomes = allowedOutcomes
    ? outcomeOptions.filter((o) => allowedOutcomes.includes(o.type))
    : outcomeOptions;

  const canSubmit =
    selectedOutcome &&
    (selectedOutcome !== 'Disqualified' || disqualificationReason);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {isAdvisoryMode && (
              <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500">
                Advisory Mode
              </Badge>
            )}
            <DialogTitle>End Call - Select Outcome</DialogTitle>
          </div>
          <DialogDescription>
            How did this call conclude? This will mark the call as completed.
          </DialogDescription>
        </DialogHeader>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                {warnings.map((warning, index) => (
                  <p key={index} className="text-sm text-yellow-600 dark:text-yellow-400">
                    {warning}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Outcome selection */}
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            {availableOutcomes.map((option) => (
              <button
                key={option.type}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                  option.color,
                  selectedOutcome === option.type && 'ring-2 ring-ring ring-offset-2'
                )}
                onClick={() => {
                  setSelectedOutcome(option.type);
                  if (option.type !== 'Disqualified') {
                    setDisqualificationReason(undefined);
                  }
                }}
              >
                {option.icon}
                <span className="font-medium text-sm">{option.displayName}</span>
                <span className="text-xs text-muted-foreground text-center">
                  {option.description}
                </span>
              </button>
            ))}
          </div>

          {/* Disqualification reason selector */}
          {selectedOutcome === 'Disqualified' && (
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">
                Disqualification Reason <span className="text-red-500">*</span>
              </label>
              <Select
                value={disqualificationReason}
                onValueChange={(value) =>
                  setDisqualificationReason(value as DisqualificationReason)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {disqualificationReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Qualification flags for successful outcomes */}
          {selectedOutcome &&
            selectedOutcome !== 'Disqualified' &&
            !isAdvisoryMode && (
              <div className="space-y-3 pt-2 border-t">
                <label className="text-sm font-medium">Qualification Flags</label>
                <div className="space-y-2">
                  {[
                    { key: 'has500Clients', label: 'Has 500+ clients' },
                    { key: 'financialCapacity', label: 'Has financial capacity' },
                    { key: 'strategicAlignment', label: 'Strategic alignment confirmed' },
                  ].map((flag) => (
                    <label
                      key={flag.key}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={qualificationFlags[flag.key as keyof QualificationFlags]}
                        onChange={(e) =>
                          setQualificationFlags((prev) => ({
                            ...prev,
                            [flag.key]: e.target.checked,
                          }))
                        }
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{flag.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={selectedOutcome === 'Disqualified' ? 'destructive' : 'success'}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Complete Call
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
