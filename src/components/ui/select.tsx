'use client';

import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';

import { cn } from '@/lib/utils';

interface SelectContextValue {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextValue | undefined>(
  undefined
);

function useSelectContext() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select components must be used within a Select');
  }
  return context;
}

interface SelectProps {
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

function Select({
  children,
  value: controlledValue,
  onValueChange,
  defaultValue,
}: SelectProps) {
  const [open, setOpen] = React.useState(false);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (onValueChange) {
        onValueChange(newValue);
      } else {
        setUncontrolledValue(newValue);
      }
      setOpen(false);
    },
    [onValueChange]
  );

  return (
    <SelectContext.Provider
      value={{ value, onValueChange: handleValueChange, open, setOpen }}
    >
      <div className="relative">{children}</div>
    </SelectContext.Provider>
  );
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

function SelectTrigger({ children, className }: SelectTriggerProps) {
  const { open, setOpen } = useSelectContext();

  return (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-1 focus:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={() => setOpen(!open)}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

interface SelectValueProps {
  placeholder?: string;
}

function SelectValue({ placeholder }: SelectValueProps) {
  const { value } = useSelectContext();

  return (
    <span className={cn(!value && 'text-muted-foreground')}>
      {value || placeholder}
    </span>
  );
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

function SelectContent({ children, className }: SelectContentProps) {
  const { open, setOpen } = useSelectContext();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      <div
        className={cn(
          'absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md',
          'animate-in fade-in-0 zoom-in-95',
          className
        )}
      >
        <div className="p-1">{children}</div>
      </div>
    </>
  );
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

function SelectItem({ children, value, className }: SelectItemProps) {
  const { value: selectedValue, onValueChange } = useSelectContext();
  const isSelected = selectedValue === value;

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none',
        'hover:bg-accent hover:text-accent-foreground',
        'focus:bg-accent focus:text-accent-foreground',
        isSelected && 'bg-accent',
        className
      )}
      onClick={() => onValueChange?.(value)}
    >
      {children}
      {isSelected && (
        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
