'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';

import {
  CallSummary,
  AIAnalysisPanel,
  MilestoneProgress,
  ObjectionHistory,
} from '@/components/dashboard/manager';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CallDetailData {
  id: string;
  prospectName: string;
  prospectEmail?: string;
  prospectCompany?: string;
  agentId: string;
  agentName: string;
  date: string;
  duration: number;
  status: string;
  outcome?: string;
  zoomLink?: string;
  hasRecording: boolean;
  recordingUrl?: string;
  milestones: Array<{
    id: string;
    title: string;
    status: 'pending' | 'active' | 'completed' | 'skipped';
    startedAt?: string;
    completedAt?: string;
    skippedAt?: string;
    duration?: number;
  }>;
  objections: Array<{
    id: string;
    type: string;
    status: 'raised' | 'resolved' | 'deferred' | 'disqualified';
    raisedAt: string;
    resolvedAt?: string;
    response?: string;
    duration?: number;
  }>;
  analysis?: {
    summary?: string;
    riskFlags?: Array<{
      type: string;
      severity: 'high' | 'medium' | 'low';
      description: string;
      timestamp?: number;
      quote?: string;
      recommendation: string;
    }>;
    feedback?: {
      strengths?: string[];
      improvements?: string[];
      overallScore?: number;
    };
    emailDraft?: string;
  };
}

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const callId = params.callId as string;

  const { data, error, isLoading } = useSWR<{ data: CallDetailData }>(
    callId ? `/api/analytics/calls/${callId}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const call = data?.data;

  if (error) {
    return (
      <div className="p-8">
        <div className="glass-card p-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-error"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Failed to load call details
          </h2>
          <p className="text-muted-foreground mb-4">
            The call might not exist or you don&apos;t have permission to view it.
          </p>
          <button
            onClick={() => router.back()}
            className="text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/manager/dashboard" className="hover:text-foreground">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/manager/analytics" className="hover:text-foreground">
          Analytics
        </Link>
        <span>/</span>
        <span className="text-foreground">Call Details</span>
      </nav>

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Back to calls
      </button>

      {/* Call Summary */}
      <div className="mb-8">
        <CallSummary
          call={{
            id: call?.id ?? '',
            prospectName: call?.prospectName ?? 'Loading...',
            agentName: call?.agentName ?? '',
            date: call?.date ? new Date(call.date) : new Date(),
            duration: call?.duration ?? 0,
            outcome: call?.outcome,
            status: call?.status ?? 'unknown',
            zoomLink: call?.zoomLink,
          }}
          isLoading={isLoading}
        />
      </div>

      {/* Recording Player (if available) */}
      {call?.hasRecording && call.recordingUrl && (
        <div className="glass-card p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Recording</h3>
          <audio controls className="w-full">
            <source src={call.recordingUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Milestones and Objections */}
        <div className="lg:col-span-1 space-y-6">
          <MilestoneProgress
            milestones={
              call?.milestones?.map((m) => ({
                ...m,
                startedAt: m.startedAt ? new Date(m.startedAt) : undefined,
                completedAt: m.completedAt ? new Date(m.completedAt) : undefined,
                skippedAt: m.skippedAt ? new Date(m.skippedAt) : undefined,
              })) ?? []
            }
            isLoading={isLoading}
          />

          <ObjectionHistory
            objections={
              call?.objections?.map((o) => ({
                ...o,
                raisedAt: new Date(o.raisedAt),
                resolvedAt: o.resolvedAt ? new Date(o.resolvedAt) : undefined,
              })) ?? []
            }
            isLoading={isLoading}
          />
        </div>

        {/* Right Column - AI Analysis */}
        <div className="lg:col-span-2">
          <AIAnalysisPanel
            analysis={call?.analysis}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
