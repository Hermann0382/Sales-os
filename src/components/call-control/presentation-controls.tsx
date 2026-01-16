'use client';

/**
 * PresentationControls Component
 *
 * Controls for managing the presentation window and sync status.
 * Allows agents to open/close presentation view and see sync status.
 */

import * as React from 'react';
import {
  Monitor,
  MonitorOff,
  Radio,
  Wifi,
  WifiOff,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type SyncMethod = 'broadcast' | 'websocket' | 'none';
export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error';

export interface PresentationControlsProps {
  isPresenting: boolean;
  onTogglePresentation: () => void;
  syncMethod: SyncMethod;
  connectionStatus: ConnectionStatus;
  onReconnect?: () => void;
  presentationUrl?: string;
  className?: string;
}

/**
 * Get sync method display info
 */
function getSyncMethodInfo(method: SyncMethod): {
  label: string;
  icon: React.ReactNode;
} {
  switch (method) {
    case 'broadcast':
      return {
        label: 'Local Sync',
        icon: <Radio className="h-3 w-3" />,
      };
    case 'websocket':
      return {
        label: 'Network Sync',
        icon: <Wifi className="h-3 w-3" />,
      };
    case 'none':
      return {
        label: 'Not Synced',
        icon: <WifiOff className="h-3 w-3" />,
      };
  }
}

/**
 * Get connection status display info
 */
function getStatusInfo(status: ConnectionStatus): {
  label: string;
  variant: 'success' | 'warning' | 'destructive' | 'secondary';
} {
  switch (status) {
    case 'connected':
      return { label: 'Connected', variant: 'success' };
    case 'connecting':
      return { label: 'Connecting...', variant: 'warning' };
    case 'disconnected':
      return { label: 'Disconnected', variant: 'secondary' };
    case 'error':
      return { label: 'Error', variant: 'destructive' };
  }
}

/**
 * Connection status indicator
 */
function ConnectionIndicator({
  syncMethod,
  connectionStatus,
  onReconnect,
}: {
  syncMethod: SyncMethod;
  connectionStatus: ConnectionStatus;
  onReconnect?: () => void;
}) {
  const methodInfo = getSyncMethodInfo(syncMethod);
  const statusInfo = getStatusInfo(connectionStatus);

  const showReconnect =
    onReconnect &&
    (connectionStatus === 'disconnected' || connectionStatus === 'error');

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Sync method badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-xs">
              {methodInfo.icon}
              {methodInfo.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {syncMethod === 'broadcast'
                ? 'Using BroadcastChannel for fast local sync'
                : syncMethod === 'websocket'
                  ? 'Using WebSocket for network sync'
                  : 'No sync connection active'}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Connection status */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  connectionStatus === 'connected' && 'bg-success',
                  connectionStatus === 'connecting' &&
                    'bg-warning animate-pulse',
                  connectionStatus === 'disconnected' && 'bg-muted-foreground',
                  connectionStatus === 'error' && 'bg-destructive'
                )}
              />
              <span className="text-xs text-muted-foreground">
                {statusInfo.label}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Presentation sync status: {statusInfo.label}</p>
          </TooltipContent>
        </Tooltip>

        {/* Reconnect button */}
        {showReconnect && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onReconnect}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Reconnect sync</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

export function PresentationControls({
  isPresenting,
  onTogglePresentation,
  syncMethod,
  connectionStatus,
  onReconnect,
  presentationUrl,
  className,
}: PresentationControlsProps) {
  const [isOpening, setIsOpening] = React.useState(false);

  // Handle opening presentation in new window
  const handleOpenPresentation = React.useCallback(() => {
    if (!presentationUrl) return;

    setIsOpening(true);

    // Open in new window with specific dimensions
    const width = 1280;
    const height = 720;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const newWindow = window.open(
      presentationUrl,
      'presentation',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    );

    if (newWindow) {
      newWindow.focus();
    }

    // Reset opening state after a brief delay
    setTimeout(() => setIsOpening(false), 500);

    // Trigger toggle callback
    onTogglePresentation();
  }, [presentationUrl, onTogglePresentation]);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* Main presentation toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant={isPresenting ? 'default' : 'outline'}
          className="flex-1 gap-2"
          onClick={
            presentationUrl ? handleOpenPresentation : onTogglePresentation
          }
          disabled={isOpening}
        >
          {isPresenting ? (
            <>
              <Monitor className="h-4 w-4" />
              Presenting
              {presentationUrl && <ExternalLink className="h-3 w-3 ml-1" />}
            </>
          ) : (
            <>
              <MonitorOff className="h-4 w-4" />
              Start Presentation
            </>
          )}
        </Button>

        {isPresenting && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePresentation}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <MonitorOff className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Connection status */}
      {isPresenting && (
        <ConnectionIndicator
          syncMethod={syncMethod}
          connectionStatus={connectionStatus}
          onReconnect={onReconnect}
        />
      )}

      {/* Presentation tips */}
      {!isPresenting && (
        <p className="text-xs text-muted-foreground text-center">
          Opens presentation in a new window for screen sharing
        </p>
      )}
    </div>
  );
}
