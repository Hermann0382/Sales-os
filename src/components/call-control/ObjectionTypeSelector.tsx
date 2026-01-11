'use client';

import * as React from 'react';
import {
  DollarSign,
  Clock,
  Users,
  HelpCircle,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { type ObjectionType } from '@/services/objection-flow-service';

interface ObjectionTypeOption {
  type: ObjectionType;
  displayName: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const objectionTypes: ObjectionTypeOption[] = [
  {
    type: 'Price',
    displayName: 'Price',
    description: 'Cost, investment, or value concerns',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'border-green-500/50 hover:border-green-500 hover:bg-green-500/10',
  },
  {
    type: 'Timing',
    displayName: 'Timing',
    description: 'Not the right time, busy season',
    icon: <Clock className="w-6 h-6" />,
    color: 'border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/10',
  },
  {
    type: 'Capacity_Time',
    displayName: 'Capacity/Time',
    description: 'Lack of time or resources to implement',
    icon: <Users className="w-6 h-6" />,
    color: 'border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10',
  },
  {
    type: 'Need_to_Think',
    displayName: 'Need to Think',
    description: 'Wants time to consider, not ready to decide',
    icon: <HelpCircle className="w-6 h-6" />,
    color: 'border-yellow-500/50 hover:border-yellow-500 hover:bg-yellow-500/10',
  },
  {
    type: 'Partner_Team',
    displayName: 'Partner/Team',
    description: 'Needs to consult partner, team, or advisor',
    icon: <UserCheck className="w-6 h-6" />,
    color: 'border-cyan-500/50 hover:border-cyan-500 hover:bg-cyan-500/10',
  },
  {
    type: 'Skepticism',
    displayName: 'Skepticism',
    description: 'Doubts about effectiveness or fit',
    icon: <AlertTriangle className="w-6 h-6" />,
    color: 'border-red-500/50 hover:border-red-500 hover:bg-red-500/10',
  },
];

interface ObjectionTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (type: ObjectionType) => void;
  currentMilestone?: number;
}

export function ObjectionTypeSelector({
  isOpen,
  onClose,
  onSelect,
  currentMilestone,
}: ObjectionTypeSelectorProps) {
  const handleSelect = (type: ObjectionType) => {
    onSelect(type);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select Objection Type</DialogTitle>
          <DialogDescription>
            {currentMilestone && (
              <span className="text-xs bg-muted px-2 py-0.5 rounded mr-2">
                M{currentMilestone}
              </span>
            )}
            What type of objection is the prospect raising?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4">
          {objectionTypes.map((option) => (
            <button
              key={option.type}
              className={cn(
                'flex items-start gap-4 p-4 rounded-lg border-2 transition-all text-left',
                option.color
              )}
              onClick={() => handleSelect(option.type)}
            >
              <div className="flex-shrink-0 mt-0.5">{option.icon}</div>
              <div className="space-y-1">
                <h3 className="font-semibold">{option.displayName}</h3>
                <p className="text-sm text-muted-foreground">
                  {option.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
