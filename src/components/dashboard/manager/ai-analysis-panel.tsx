'use client';

import { cn } from '@/lib/utils';

interface RiskFlag {
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  timestamp?: number;
  quote?: string;
  recommendation: string;
}

interface AIAnalysisPanelProps {
  analysis?: {
    summary?: string;
    riskFlags?: RiskFlag[];
    feedback?: {
      strengths?: string[];
      improvements?: string[];
      overallScore?: number;
    };
    emailDraft?: string;
  };
  isLoading?: boolean;
}

export function AIAnalysisPanel({ analysis, isLoading }: AIAnalysisPanelProps) {
  if (isLoading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-6 bg-muted rounded w-1/4" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">AI Analysis</h3>
        <div className="text-center py-8 text-muted-foreground">
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
            className="mx-auto mb-4 opacity-50"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
          <p>AI analysis not yet available for this call</p>
          <p className="text-sm mt-1">Analysis is generated after the call ends</p>
        </div>
      </div>
    );
  }

  const severityColors = {
    high: 'border-error bg-error/5',
    medium: 'border-warning bg-warning/5',
    low: 'border-muted-foreground bg-muted/50',
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      {analysis.summary && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Call Summary</h3>
          <p className="text-muted-foreground leading-relaxed">{analysis.summary}</p>
        </div>
      )}

      {/* Risk Flags */}
      {analysis.riskFlags && analysis.riskFlags.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-warning"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
            <h3 className="text-lg font-semibold text-foreground">
              Risk Flags ({analysis.riskFlags.length})
            </h3>
          </div>
          <div className="space-y-3">
            {analysis.riskFlags.map((flag, index) => (
              <div
                key={index}
                className={cn(
                  'border-l-4 rounded-r-lg p-4',
                  severityColors[flag.severity]
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground capitalize">
                      {flag.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {flag.description}
                    </p>
                    {flag.quote && (
                      <blockquote className="mt-2 pl-3 border-l-2 border-muted text-sm italic text-muted-foreground">
                        &quot;{flag.quote}&quot;
                      </blockquote>
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded uppercase',
                      flag.severity === 'high' && 'bg-error/10 text-error',
                      flag.severity === 'medium' && 'bg-warning/10 text-warning',
                      flag.severity === 'low' && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {flag.severity}
                  </span>
                </div>
                <p className="text-sm text-primary mt-2">
                  <strong>Recommendation:</strong> {flag.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Feedback */}
      {analysis.feedback && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Agent Feedback</h3>
            {analysis.feedback.overallScore !== undefined && (
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold',
                  analysis.feedback.overallScore >= 80 && 'bg-success/10 text-success',
                  analysis.feedback.overallScore >= 60 &&
                    analysis.feedback.overallScore < 80 &&
                    'bg-warning/10 text-warning',
                  analysis.feedback.overallScore < 60 && 'bg-error/10 text-error'
                )}
              >
                {analysis.feedback.overallScore}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            {analysis.feedback.strengths && analysis.feedback.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-success mb-2">Strengths</h4>
                <ul className="space-y-2">
                  {analysis.feedback.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
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
                        className="text-success flex-shrink-0 mt-0.5"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {analysis.feedback.improvements && analysis.feedback.improvements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-warning mb-2">Areas for Improvement</h4>
                <ul className="space-y-2">
                  {analysis.feedback.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
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
                        className="text-warning flex-shrink-0 mt-0.5"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" x2="12" y1="8" y2="12" />
                        <line x1="12" x2="12.01" y1="16" y2="16" />
                      </svg>
                      {improvement}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Email Draft */}
      {analysis.emailDraft && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Follow-up Email Draft</h3>
            <button
              onClick={() => navigator.clipboard.writeText(analysis.emailDraft || '')}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Copy
            </button>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
              {analysis.emailDraft}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
