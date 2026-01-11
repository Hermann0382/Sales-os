'use client';

import Link from 'next/link';

import { useAuth } from '@/hooks';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your call activity overview
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/call/new"
          className="glass-card p-6 hover:shadow-glass-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                <line x1="12" x2="12" y1="2" y2="6" />
                <line x1="14" x2="10" y1="4" y2="4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">New Call</h3>
              <p className="text-sm text-muted-foreground">
                Start a new sales call
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/calls/history"
          className="glass-card p-6 hover:shadow-glass-lg transition-shadow group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-secondary"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Call History</h3>
              <p className="text-sm text-muted-foreground">
                Review past calls
              </p>
            </div>
          </div>
        </Link>

        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-accent"
              >
                <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
                <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">AI Feedback</h3>
              <p className="text-sm text-muted-foreground">
                Review AI insights
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Calls Today</p>
          <p className="text-2xl font-bold text-foreground mt-1">0</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">This Week</p>
          <p className="text-2xl font-bold text-foreground mt-1">0</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Coaching Clients</p>
          <p className="text-2xl font-bold text-success mt-1">0</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Follow-ups Pending</p>
          <p className="text-2xl font-bold text-warning mt-1">0</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Recent Activity
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          <p>No recent calls</p>
          <Link
            href="/call/new"
            className="text-primary hover:underline mt-2 inline-block"
          >
            Start your first call
          </Link>
        </div>
      </div>
    </div>
  );
}
