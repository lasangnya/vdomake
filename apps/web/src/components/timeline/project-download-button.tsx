'use client';

import { useState } from 'react';
import { ExportProgress } from './export-progress';

/** Zips the generated Motion Canvas project via the export API (format=project). */
export function ProjectDownloadButton({ projectId }: { projectId: string }) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const downloadProject = async () => {
    setBusy(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          config: {
            mode: 'single',
            format: 'project',
            codec: 'h264',
            resolution: { width: 1920, height: 1080 },
            frameRate: 30,
            batchResolutions: [],
          },
        }),
      });
      if (!response.ok) return;
      const body = await response.json();
      setJobId(body.data.jobId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        onClick={downloadProject}
        disabled={busy}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-zinc-300 px-3 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        type="button"
      >
        {busy ? 'Packaging…' : '⬇ Download Motion Canvas project (zip)'}
      </button>
      <div className="mt-2">
        <ExportProgress jobId={jobId} />
      </div>
    </div>
  );
}
