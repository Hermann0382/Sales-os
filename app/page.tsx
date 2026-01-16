import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    // User is logged in, redirect to dashboard
    redirect('/agent/dashboard');
  }

  // Public landing page for non-authenticated users
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-8">
        <h1 className="text-5xl font-bold text-foreground">
          CallOS
        </h1>
        <p className="text-xl text-muted-foreground">
          Sales Call Orchestration & Objection Flow App
        </p>
        <p className="text-lg text-muted-foreground">
          A standardized, integrity-based sales call operating system that
          guides execution, records reality, and learns over time.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/sign-in"
            className="control-btn control-btn-primary"
          >
            Sign In
          </a>
          <a
            href="/sign-up"
            className="control-btn control-btn-outline"
          >
            Get Started
          </a>
        </div>
      </div>
    </main>
  );
}
