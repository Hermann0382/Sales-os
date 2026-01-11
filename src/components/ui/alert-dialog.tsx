'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { Button } from './button';

interface AlertDialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | undefined>(
  undefined
);

function useAlertDialogContext() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialog components must be used within an AlertDialog');
  }
  return context;
}

interface AlertDialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function AlertDialog({
  children,
  open: controlledOpen,
  onOpenChange,
}: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <AlertDialogContext.Provider value={{ open, setOpen }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

interface AlertDialogTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

function AlertDialogTrigger({ children, asChild }: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => setOpen(true),
    });
  }

  return <button onClick={() => setOpen(true)}>{children}</button>;
}

interface AlertDialogContentProps {
  children: React.ReactNode;
  className?: string;
}

function AlertDialogContent({ children, className }: AlertDialogContentProps) {
  const { open } = useAlertDialogContext();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/80" />

      {/* Content */}
      <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
        <div
          className={cn(
            'w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            className
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function AlertDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

function AlertDialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />;
}

function AlertDialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props} />
  );
}

function AlertDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
        className
      )}
      {...props}
    />
  );
}

interface AlertDialogActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

function AlertDialogAction({
  className,
  children,
  ...props
}: AlertDialogActionProps) {
  const { setOpen } = useAlertDialogContext();

  return (
    <Button
      className={className}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children}
    </Button>
  );
}

interface AlertDialogCancelProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

function AlertDialogCancel({
  className,
  children,
  ...props
}: AlertDialogCancelProps) {
  const { setOpen } = useAlertDialogContext();

  return (
    <Button
      variant="outline"
      className={cn('mt-2 sm:mt-0', className)}
      onClick={(e) => {
        props.onClick?.(e);
        setOpen(false);
      }}
      {...props}
    >
      {children || 'Cancel'}
    </Button>
  );
}

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
};
