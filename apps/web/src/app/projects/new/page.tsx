'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UrlInput, type CaptureViewportInput } from '@/components/capture';
import { TopNav } from '@/components/shared/top-nav';
import type { ApiResponse } from '@/types/api';

export default function NewProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (url: string, viewports: CaptureViewportInput[]) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, viewports }),
      });
      const body = (await res.json()) as ApiResponse<{ projectId: string; jobId: string }>;
      if (!res.ok || body.error) {
        throw new Error(body.error ? body.message : 'Capture failed to start');
      }
      router.push(`/projects/${body.data.projectId}/capture?job=${body.data.jobId}`);
    } catch (captureError) {
      setError(captureError instanceof Error ? captureError.message : 'Capture failed to start');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <button
          type="button"
          onClick={() => router.push('/projects')}
          className="mb-6 flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">New project</CardTitle>
            <CardDescription>
              Paste a website URL — VDOMake will capture high-DPI screenshots and extract its theme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UrlInput onSubmit={handleCapture} isSubmitting={isSubmitting} />
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
