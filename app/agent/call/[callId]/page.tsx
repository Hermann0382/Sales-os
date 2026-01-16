'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Milestone {
  id: string;
  milestoneNumber: number;
  title: string;
  objective: string;
  estimatedDurationMinutes: number | null;
  requiredQuestions: string | null;
  confirmations: string | null;
}

interface Objection {
  id: string;
  objectionType: string;
  diagnosticQuestions: string | null;
  allowedOutcomes: string | null;
}

interface DiagnosticQuestion {
  step: number;
  question: string;
  purpose: string;
}

export default function CallControlPage() {
  const params = useParams();
  const callId = params.callId as string;

  // Data state
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [currentMilestone, setCurrentMilestone] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  // Objection modal state
  const [selectedObjection, setSelectedObjection] = useState<Objection | null>(null);
  const [objectionStep, setObjectionStep] = useState(0);

  // Fetch milestones and objections
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [milestonesRes, objectionsRes] = await Promise.all([
          fetch('/api/milestones'),
          fetch('/api/objections'),
        ]);

        const milestonesData = await milestonesRes.json();
        const objectionsData = await objectionsRes.json();

        if (milestonesData.data) {
          setMilestones(milestonesData.data);
        }
        if (objectionsData.data) {
          setObjections(objectionsData.data);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load call data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Get current milestone data
  const currentMilestoneData = milestones.find((m) => m.milestoneNumber === currentMilestone);

  // Parse JSON fields
  const getRequiredQuestions = useCallback((milestone: Milestone | undefined): string[] => {
    if (!milestone?.requiredQuestions) return [];
    try {
      return JSON.parse(milestone.requiredQuestions);
    } catch {
      return [];
    }
  }, []);

  const getConfirmations = useCallback((milestone: Milestone | undefined): string[] => {
    if (!milestone?.confirmations) return [];
    try {
      return JSON.parse(milestone.confirmations);
    } catch {
      return [];
    }
  }, []);

  const getDiagnosticQuestions = useCallback((objection: Objection | null): DiagnosticQuestion[] => {
    if (!objection?.diagnosticQuestions) return [];
    try {
      return JSON.parse(objection.diagnosticQuestions);
    } catch {
      return [];
    }
  }, []);

  // Handle checkbox toggle
  const toggleCheckItem = (key: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle objection selection
  const handleObjectionSelect = (objection: Objection) => {
    setSelectedObjection(objection);
    setObjectionStep(0);
  };

  // Handle objection resolution
  const handleObjectionResolve = (outcome: string) => {
    console.log(`Objection ${selectedObjection?.objectionType} resolved with: ${outcome}`);
    setSelectedObjection(null);
    setObjectionStep(0);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading call data...</div>
      </div>
    );
  }

  if (error || milestones.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'No milestones found'}</p>
          <p className="text-sm text-muted-foreground">
            Make sure the database is seeded. Visit /api/seed (POST) to seed.
          </p>
        </div>
      </div>
    );
  }

  const requiredQuestions = getRequiredQuestions(currentMilestoneData);
  const confirmations = getConfirmations(currentMilestoneData);
  const diagnosticQuestions = getDiagnosticQuestions(selectedObjection);

  return (
    <div className="h-full flex relative">
      {/* Milestone Sidebar */}
      <div className="w-64 bg-white border-r border-border p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Milestones
        </h2>
        <div className="space-y-2">
          {milestones.map((m) => (
            <button
              key={m.id}
              onClick={() => setCurrentMilestone(m.milestoneNumber)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                currentMilestone === m.milestoneNumber
                  ? 'bg-primary/10'
                  : 'hover:bg-muted'
              }`}
            >
              <div
                className={`milestone-indicator ${
                  m.milestoneNumber < currentMilestone
                    ? 'milestone-indicator-completed'
                    : m.milestoneNumber === currentMilestone
                    ? 'milestone-indicator-active'
                    : 'milestone-indicator-pending'
                }`}
              >
                {m.milestoneNumber < currentMilestone ? (
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
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                ) : (
                  m.milestoneNumber
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    currentMilestone === m.milestoneNumber
                      ? 'text-primary'
                      : 'text-foreground'
                  }`}
                >
                  {m.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {m.estimatedDurationMinutes} min
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Call Control Panel
            </h1>
            <p className="text-sm text-muted-foreground">
              Call ID: {callId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`control-btn ${
                isRecording
                  ? 'control-btn-destructive'
                  : 'control-btn-outline'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecording ? 'bg-white animate-pulse' : 'bg-destructive'
                }`}
              />
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
            <button className="control-btn control-btn-primary">
              Open Presentation
            </button>
          </div>
        </div>

        {/* Current Milestone */}
        {currentMilestoneData && (
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="milestone-indicator milestone-indicator-active text-lg">
                {currentMilestone}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {currentMilestoneData.title}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Estimated: {currentMilestoneData.estimatedDurationMinutes} min
                </p>
              </div>
            </div>

            {/* Objective */}
            <div className="bg-surface rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Objective
              </h3>
              <p className="text-foreground">{currentMilestoneData.objective}</p>
            </div>

            {/* Required Questions */}
            {requiredQuestions.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Required Questions
                </h3>
                <div className="space-y-2">
                  {requiredQuestions.map((question, idx) => (
                    <label key={idx} className="checklist-item cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checkedItems[`q-${currentMilestone}-${idx}`] || false}
                        onChange={() => toggleCheckItem(`q-${currentMilestone}-${idx}`)}
                        className="w-5 h-5 rounded border-2 border-muted-foreground/30 text-primary focus:ring-primary"
                      />
                      <span>{question}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Confirmations */}
            {confirmations.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Confirmations Required
                </h3>
                {confirmations.map((confirmation, idx) => (
                  <label key={idx} className="checklist-item cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedItems[`c-${currentMilestone}-${idx}`] || false}
                      onChange={() => toggleCheckItem(`c-${currentMilestone}-${idx}`)}
                      className="w-5 h-5 rounded border-2 border-muted-foreground/30 text-success focus:ring-success"
                    />
                    <span>{confirmation}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        <div className="glass-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Notes
          </h3>
          <textarea
            className="notes-textarea"
            placeholder="Add notes for this milestone..."
            value={notes[currentMilestone] || ''}
            onChange={(e) =>
              setNotes((prev) => ({ ...prev, [currentMilestone]: e.target.value }))
            }
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => setCurrentMilestone(Math.max(1, currentMilestone - 1))}
            disabled={currentMilestone === 1}
            className="control-btn control-btn-ghost disabled:opacity-50"
          >
            Previous Milestone
          </button>
          <button
            onClick={() =>
              setCurrentMilestone(Math.min(milestones.length, currentMilestone + 1))
            }
            disabled={currentMilestone === milestones.length}
            className="control-btn control-btn-primary disabled:opacity-50"
          >
            Next Milestone
          </button>
        </div>
      </div>

      {/* Objection Panel (right sidebar) */}
      <div className="w-72 bg-white border-l border-border p-4 overflow-y-auto">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Objection Handler
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Click to trigger objection subflow
        </p>
        <div className="space-y-2">
          {objections.map((objection) => (
            <button
              key={objection.id}
              onClick={() => handleObjectionSelect(objection)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedObjection?.id === objection.id
                  ? 'border-warning bg-warning/10'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <span className="font-medium text-foreground">
                {objection.objectionType.replace('_', ' ')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Objection Modal */}
      {selectedObjection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Objection: {selectedObjection.objectionType.replace('_', ' ')}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Step {objectionStep + 1} of {diagnosticQuestions.length}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedObjection(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
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
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {diagnosticQuestions[objectionStep] && (
                <div className="space-y-4">
                  <div className="bg-primary/5 rounded-lg p-4">
                    <p className="font-medium text-lg text-foreground">
                      &ldquo;{diagnosticQuestions[objectionStep].question}&rdquo;
                    </p>
                  </div>
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold">Purpose:</span>{' '}
                      {diagnosticQuestions[objectionStep].purpose}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setObjectionStep(Math.max(0, objectionStep - 1))}
                  disabled={objectionStep === 0}
                  className="control-btn control-btn-ghost disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  {objectionStep === diagnosticQuestions.length - 1 ? (
                    <>
                      <button
                        onClick={() => handleObjectionResolve('Resolved')}
                        className="control-btn bg-success text-white hover:bg-success/90"
                      >
                        Resolved
                      </button>
                      <button
                        onClick={() => handleObjectionResolve('Deferred')}
                        className="control-btn control-btn-outline"
                      >
                        Deferred
                      </button>
                      <button
                        onClick={() => handleObjectionResolve('Disqualified')}
                        className="control-btn control-btn-destructive"
                      >
                        Disqualified
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() =>
                        setObjectionStep(
                          Math.min(diagnosticQuestions.length - 1, objectionStep + 1)
                        )
                      }
                      className="control-btn control-btn-primary"
                    >
                      Next Step
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
