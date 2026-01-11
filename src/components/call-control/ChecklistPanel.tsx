'use client';

import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface ChecklistItem {
  id: string;
  label: string;
  required: boolean;
  isGate?: boolean;
  checked: boolean;
  value?: string | number | boolean;
}

export interface ChecklistPanelProps {
  items: ChecklistItem[];
  onItemChange: (itemId: string, checked: boolean) => void;
  disabled?: boolean;
  title?: string;
}

export function ChecklistPanel({
  items,
  onItemChange,
  disabled = false,
  title = 'Required Items',
}: ChecklistPanelProps) {
  const completedCount = items.filter((item) => item.checked).length;
  const requiredCount = items.filter((item) => item.required).length;
  const requiredCompleted = items.filter((item) => item.required && item.checked).length;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium">{title}</h4>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{items.length} completed
        </span>
      </div>

      {requiredCompleted < requiredCount && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-yellow-50 p-2 text-sm text-yellow-700">
          <AlertCircle className="h-4 w-4" />
          <span>
            {requiredCount - requiredCompleted} required item(s) remaining
          </span>
        </div>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'flex items-start gap-3 p-2 rounded-md transition-colors',
              item.checked && 'bg-green-50',
              item.isGate && !item.checked && 'bg-red-50'
            )}
          >
            <Checkbox
              id={item.id}
              checked={item.checked}
              onCheckedChange={(checked) =>
                onItemChange(item.id, checked as boolean)
              }
              disabled={disabled}
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor={item.id}
                className={cn(
                  'cursor-pointer',
                  item.checked && 'line-through text-muted-foreground'
                )}
              >
                {item.label}
                {item.required && (
                  <span className="ml-1 text-red-500">*</span>
                )}
                {item.isGate && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                    Gate
                  </span>
                )}
              </Label>
              {item.value !== undefined && item.value !== true && item.value !== false && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Value: {String(item.value)}
                </p>
              )}
            </div>
            {item.checked ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
