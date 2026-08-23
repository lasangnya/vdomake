'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectLayout } from '@/components/shared/project-layout';
import { trpc } from '@/lib/trpc/client';
import {
  CodePreview,
  ErrorPanel,
  GenerateButton,
  PreviewPlayer,
  RenderProgress,
} from '@/components/generate';
import type { CodeReviewItem } from '@/lib/ai/code-reviewer';

type FileMap = Record<string, string>;

export default function ProjectGeneratePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const projectQuery = trpc.project.get.useQuery({ id: projectId });
  const storyboardQuery = trpc.storyboard.get.useQuery({ projectId });
  const generateCodeMutation = trpc.generate.generateCode.useMutation();
  const getCodeQuery = trpc.generate.getCode.useQuery({ projectId }, { enabled: false });
  const reviewMutation = trpc.generate.review.useMutation();

  const [files, setFiles] = useState<FileMap | null>(null);
  const [activeFile, setActiveFile] = useState('src/project.ts');
  const [renderJobId, setRenderJobId] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewItems, setReviewItems] = useState<CodeReviewItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const scenes = storyboardQuery.data?.scenes ?? [];
  const previewUrl = projectQuery.data?.previewUrl ?? null;

  useEffect(() => {
    if (getCodeQuery.data) {
      setFiles(getCodeQuery.data);
      if (getCodeQuery.data['src/project.ts']) setActiveFile('src/project.ts');
    }
  }, [getCodeQuery.data]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setReviewItems([]);
    try {
      await generateCodeMutation.mutateAsync({ projectId });
      await getCodeQuery.refetch();
      setRenderJobId(null);
      setRendered(false);
      // Kick off the render automatically after generating code.
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const body = (await res.json()) as {
        error: boolean;
        data?: { jobId: string };
        message?: string;
      };
      if (!res.ok || body.error)
        throw new Error(
          body.error ? (body.message ?? 'Render failed to start') : 'Render failed to start',
        );
      setRenderJobId(body.data?.jobId ?? null);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async () => {
    setError(null);
    try {
      const items = await reviewMutation.mutateAsync({ projectId });
      setReviewItems(items);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Review failed');
    }
  };

  const hasCode = files !== null && Object.keys(files).length > 0;

  return (
    <ProjectLayout projectName={projectQuery.data?.name ?? 'Loading project…'} currentPhase={3}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/projects/${projectId}/audio`}
              className="mb-1 flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to voiceover
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Generate</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              VDOMake writes Motion Canvas code from your timed storyboard, then renders a preview.
            </p>
          </div>
          <GenerateButton
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            sceneCount={scenes.length}
          />
        </div>

        <ErrorPanel message={error} />

        {!hasCode && !isGenerating && (
          <Card className="mx-auto max-w-xl">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <Sparkles className="h-8 w-8 text-violet-500" />
              <p className="text-sm text-zinc-600">
                Generate a Motion Canvas project from your {scenes.length} scenes, then render a
                preview video.
              </p>
            </CardContent>
          </Card>
        )}

        {renderJobId !== null && !rendered && (
          <RenderProgress
            jobId={renderJobId}
            onComplete={() => {
              setRendered(true);
              void projectQuery.refetch();
            }}
            onError={(message) => setError(message)}
          />
        )}

        {hasCode && (
          <Tabs defaultValue="code">
            <TabsList>
              <TabsTrigger value="code">Generated code</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">Editable Motion Canvas project</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReview}
                  disabled={reviewMutation.isPending}
                  className="gap-1.5 text-zinc-600"
                >
                  {reviewMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI code review
                </Button>
              </div>
              <CodePreview
                files={files}
                activeFile={activeFile}
                onFileChange={setActiveFile}
                onChange={(value) =>
                  setFiles((prev) => (prev ? { ...prev, [activeFile]: value } : prev))
                }
              />
              {reviewItems.length > 0 && (
                <div className="rounded-lg border border-zinc-200 bg-white p-4">
                  <p className="mb-2 text-sm font-medium text-zinc-800">Review findings</p>
                  <ul className="space-y-1.5">
                    {reviewItems.map((item, i) => (
                      <li
                        key={i}
                        className={`text-xs ${
                          item.severity === 'error'
                            ? 'text-red-600'
                            : item.severity === 'warning'
                              ? 'text-amber-600'
                              : 'text-zinc-600'
                        }`}
                      >
                        <span className="mr-1 font-medium uppercase">{item.severity}</span>
                        {item.sceneIndex !== undefined && `scene ${item.sceneIndex}: `}
                        {item.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              {previewUrl ? (
                <PreviewPlayer
                  videoUrl={previewUrl}
                  duration={scenes.reduce((acc, s) => acc + s.duration, 0)}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">No preview yet</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-zinc-500">
                      {renderJobId
                        ? 'Render in progress…'
                        : 'Render a video to see the preview here.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {hasCode && (
          <div className="flex justify-end">
            <Button
              render={<Link href={`/projects/${projectId}/timeline`} />}
              className="bg-violet-600 hover:bg-violet-500"
            >
              Continue to timeline <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </ProjectLayout>
  );
}
