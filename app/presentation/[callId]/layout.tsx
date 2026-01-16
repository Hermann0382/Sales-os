/**
 * Presentation Layout
 *
 * Minimal layout for the presentation view - no navigation or sidebars.
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Presentation | CallOS',
  description: 'Full-screen presentation view for screen sharing',
};

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900">{children}</body>
    </html>
  );
}
