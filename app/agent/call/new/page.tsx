'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useCall } from '@/hooks';
import { PreCallChecklist } from '@/lib/types';

const checklistItems: { key: keyof PreCallChecklist; label: string }[] = [
  { key: 'qualificationFormReviewed', label: 'Qualification form reviewed' },
  { key: 'clientCountConfirmed', label: 'Client count confirmed (>= 500)' },
  { key: 'businessTypeConfirmed', label: 'Business type confirmed (Financial Advisor)' },
  { key: 'revenueRangeNoted', label: 'Revenue range noted' },
  { key: 'mainPainIdentified', label: 'Main pain identified' },
  { key: 'toolStackNoted', label: 'Current tool stack noted' },
  { key: 'roiToolReady', label: 'ROI tool ready' },
  { key: 'timeBlockClear', label: 'Time block is clear (80+ min)' },
];

export default function NewCallPage() {
  const router = useRouter();
  const { preCallChecklist, updateChecklistItem, isChecklistComplete } = useCall();
  const [prospectName, setProspectName] = useState('');
  const [zoomLink, setZoomLink] = useState('');

  const handleStartCall = () => {
    if (!isChecklistComplete) {
      return;
    }

    // In production, this would create the call session via API
    // and redirect to the call control panel
    router.push('/call/preview-call-id');
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">New Call</h1>
        <p className="text-muted-foreground mt-1">
          Complete the pre-call checklist before starting
        </p>
      </div>

      {/* Prospect Selection */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Prospect Information
        </h2>
        <div className="space-y-4">
          <div>
            <label
              htmlFor="prospectName"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Prospect Name
            </label>
            <input
              id="prospectName"
              type="text"
              value={prospectName}
              onChange={(e) => setProspectName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter prospect name or search..."
            />
          </div>
          <div>
            <label
              htmlFor="zoomLink"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Zoom Link (optional)
            </label>
            <input
              id="zoomLink"
              type="url"
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="https://zoom.us/j/..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste Zoom link to enable call recording
            </p>
          </div>
        </div>
      </div>

      {/* Pre-Call Checklist */}
      <div className="glass-card p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Pre-Call Checklist
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          All items must be checked before starting the call
        </p>
        <div className="space-y-2">
          {checklistItems.map((item) => {
            const isChecked = preCallChecklist[item.key];
            return (
              <label
                key={item.key}
                className={`checklist-item cursor-pointer ${
                  isChecked ? 'checklist-item-checked' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) =>
                    updateChecklistItem(item.key, e.target.checked)
                  }
                  className="w-5 h-5 rounded border-2 border-muted-foreground/30 text-primary focus:ring-primary"
                />
                <span
                  className={`flex-1 ${
                    isChecked ? 'line-through' : ''
                  }`}
                >
                  {item.label}
                </span>
                {isChecked && (
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
                  >
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Qualification Warning */}
      {preCallChecklist.clientCountConfirmed === false && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
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
              className="text-warning flex-shrink-0 mt-0.5"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
            <div>
              <h3 className="font-medium text-warning">Qualification Gate</h3>
              <p className="text-sm text-muted-foreground mt-1">
                If the prospect has fewer than 500 clients, this will be an
                advisory call only. Coaching pitch is not allowed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="control-btn control-btn-ghost"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleStartCall}
          disabled={!isChecklistComplete || !prospectName}
          className="control-btn control-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Call
        </button>
      </div>
    </div>
  );
}
