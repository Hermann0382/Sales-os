'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Clock } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface NotesEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => Promise<void>;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export function NotesEditor({
  value,
  onChange,
  onSave,
  maxLength = 2000,
  placeholder = 'Add notes about this milestone...',
  disabled = false,
  autoSave = true,
  autoSaveDelay = 1000,
}: NotesEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const debouncedValue = useDebounce(localValue, autoSaveDelay);

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-save when debounced value changes
  useEffect(() => {
    if (autoSave && onSave && debouncedValue !== value) {
      handleSave(debouncedValue);
    }
  }, [debouncedValue, autoSave, onSave]);

  const handleSave = useCallback(
    async (content: string) => {
      if (!onSave) return;

      setIsSaving(true);
      try {
        await onSave(content);
        setLastSaved(new Date());
      } catch (error) {
        console.error('Failed to save notes:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [onSave]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const characterCount = localValue.length;
  const isNearLimit = characterCount > maxLength * 0.9;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="notes">Notes</Label>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving && (
            <span className="flex items-center gap-1">
              <Save className="h-3 w-3 animate-pulse" />
              Saving...
            </span>
          )}
          {lastSaved && !isSaving && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Saved {formatTimestamp(lastSaved)}
            </span>
          )}
        </div>
      </div>

      <Textarea
        id="notes"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'min-h-[120px] resize-y',
          isNearLimit && 'border-yellow-500'
        )}
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {autoSave ? 'Auto-saves as you type' : 'Remember to save your notes'}
        </span>
        <span
          className={cn(
            isNearLimit && 'text-yellow-600 font-medium',
            characterCount >= maxLength && 'text-red-600'
          )}
        >
          {characterCount}/{maxLength}
        </span>
      </div>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
