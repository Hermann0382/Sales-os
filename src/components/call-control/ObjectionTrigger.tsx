'use client';

import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface Objection {
  id: string;
  type: string;
  diagnosticQuestions: string[];
}

export interface ObjectionTriggerProps {
  objections: Objection[];
  onObjectionSelect: (objectionId: string) => void;
  disabled?: boolean;
  currentObjectionId?: string | null;
}

export function ObjectionTrigger({
  objections,
  onObjectionSelect,
  disabled = false,
  currentObjectionId,
}: ObjectionTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedObjection, setSelectedObjection] = useState<string | null>(null);

  const handleSelect = (objectionId: string) => {
    setSelectedObjection(objectionId);
    onObjectionSelect(objectionId);
    setIsOpen(false);
  };

  const currentObjection = currentObjectionId
    ? objections.find((o) => o.id === currentObjectionId)
    : null;

  return (
    <div className="space-y-2">
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant={currentObjection ? 'default' : 'outline'}
            className={cn(
              'w-full',
              currentObjection && 'bg-orange-500 hover:bg-orange-600'
            )}
            disabled={disabled}
          >
            <AlertCircle className="mr-2 h-4 w-4" />
            {currentObjection
              ? `Active: ${currentObjection.type}`
              : 'Handle Objection'}
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Objection Type</DialogTitle>
            <DialogDescription>
              Choose the type of objection the prospect has raised.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Select onValueChange={handleSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select objection type..." />
              </SelectTrigger>
              <SelectContent>
                {objections.map((objection) => (
                  <SelectItem key={objection.id} value={objection.id}>
                    {objection.type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedObjection && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Diagnostic Questions:</h4>
                <ul className="space-y-2 text-sm">
                  {objections
                    .find((o) => o.id === selectedObjection)
                    ?.diagnosticQuestions.map((question, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2"
                      >
                        <span className="text-muted-foreground">
                          {index + 1}.
                        </span>
                        <span>{question}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {currentObjection && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-orange-700">
              Handling: {currentObjection.type}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onObjectionSelect('')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ul className="space-y-1 text-sm text-orange-600">
            {currentObjection.diagnosticQuestions.map((question, index) => (
              <li key={index} className="flex items-start gap-2">
                <span>{index + 1}.</span>
                <span>{question}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
