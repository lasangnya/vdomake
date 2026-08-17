'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectLayout } from '@/components/shared/project-layout';
import {
  CaptureProgress,
  CaptureReview,
  UrlInput,
  type CaptureViewportInput,
} from '@/components/capture';
import type { ThemeManifest } from '@/types/theme';
import type { ApiResponse } from '@/types/api';
import type { CaptureJobResult } from '@/lib/queue';

interface ProjectWithCaptures {
  id: string;
  name: string;
  url: string;
  status: string;
  themeManifest: ThemeManifest | null;
  createdAt: string;
  captures: Array<{
    screenshotUrl: string;
    scrollPosition: number;
    order: number;
    viewport: { width: number; height: number; deviceScaleFactor: number; isMobile: boolean };
  }>;
}

async function fetchProjectData(id: string): Promise<ProjectWithCaptures | null> {
  const res = await fetch(`/api/projects/${id}`);
  const body = (await res.json()) as ApiResponse<ProjectWithCaptures>;
  if (!res.ok || body.error) return null;
  return body.data;
}

export default function ProjectCapturePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = params.id;

  const [project, setProject] = useState<ProjectWithCaptures | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(() => searchParams.get('job'));
  const [result, setResult] = useState<CaptureJobResult | null>(null);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [isRecapturing, setIsRecapturing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchProjectData(projectId).then((data) => {
      if (!cancelled && data !== null) setProject(data);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const refreshProject = useCallback(() => {
    void fetchProjectData(projectId).then((data) => {
      if (data !== null) setProject(data);
    });
  }, [projectId]);

  const handleCaptureComplete = (captureResult: CaptureJobResult) => {
    setResult(captureResult);
    setActiveJobId(null);
    refreshProject();
  };

  const handleCaptureError = (message: string) => {
    setCaptureError(message);
    setActiveJobId(null);
    refreshProject();
  };

  const handleCapture = async (url: string, viewports: CaptureViewportInput[]) => {
    setIsRecapturing(true);
    setCaptureError(null);
    setResult(null);
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, viewports, projectId }),
      });
      const body = (await res.json()) as ApiResponse<{ projectId: string; jobId: string }>;
      if (!res.ok || body.error) throw new Error('Failed to start capture');
      setActiveJobId(body.data.jobId);
      window.history.replaceState({}, '', `/projects/${projectId}/capture?job=${body.data.jobId}`);
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : 'Failed to start capture');
    } finally {
      setIsRecapturing(false);
    }
  };

  const frames = result?.frames ?? project?.captures ?? [];
  const manifest = (result?.manifest ?? project?.themeManifest) as ThemeManifest | null;

  const isCapturing = activeJobId !== null && result === null;
  const hasContent = frames.length > 0 && manifest !== null && !isCapturing;

  return (
    <ProjectLayout projectName={project?.name} currentPhase={0}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/projects"
              className="mb-1 flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Projects
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {project?.name ?? 'Loading project…'}
            </h1>
            <p className="mt-0.5 truncate text-sm text-zinc-500">{project?.url ?? ''}</p>
          </div>
          {hasContent && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCaptureError('recapture')}
              className="text-zinc-600"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Re-capture
            </Button>
          )}
        </div>

        {isCapturing && activeJobId !== null && (
          <CaptureProgress
            jobId={activeJobId}
            onComplete={handleCaptureComplete}
            onError={handleCaptureError}
          />
        )}

        {hasContent && <CaptureReview frames={frames} manifest={manifest} />}

        {!isCapturing && !hasContent && (
          <div className="max-w-xl space-y-3">
            {captureError !== null && <p className="text-sm text-red-600">{captureError}</p>}
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <UrlInput
                onSubmit={handleCapture}
                isSubmitting={isRecapturing}
                defaultUrl={project?.url ?? ''}
              />
            </div>
          </div>
        )}

        {hasContent && (
          <div className="flex justify-end">
            <Button
              render={<Link href={`/projects/${projectId}/storyboard`} />}
              nativeButton={false}
              className="bg-violet-600 hover:bg-violet-500"
            >
              Continue to storyboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </ProjectLayout>
  );
}
