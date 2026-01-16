'use client';

import { useParams } from 'next/navigation';

export default function PresentationPage() {
  const params = useParams();
  const callId = params.callId as string;

  // This is the client-facing presentation view
  // It shows only slides, no controls or notes
  // Synced via WebSocket with the control panel

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Slide Container */}
        <div className="aspect-video bg-white rounded-2xl shadow-glass-lg p-12 flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold text-foreground text-center mb-4">
            Presentation Mode
          </h1>
          <p className="text-xl text-muted-foreground text-center">
            Waiting for call to start...
          </p>
          <p className="text-sm text-muted-foreground mt-8">
            Call ID: {callId}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => (
              <div
                key={num}
                className={`w-3 h-3 rounded-full ${
                  num === 1 ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
