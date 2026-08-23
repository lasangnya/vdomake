'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, Save, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectLayout } from '@/components/shared/project-layout';
import { ProviderGate } from '@/components/shared/provider-gate';
import { useProviderStore } from '@/stores/provider-store';
import { useStoryboardStore } from '@/stores/storyboard-store';
import { trpc } from '@/lib/trpc/client';
import {
  AiSuggestionsPanel,
  SceneEditor,
  SceneTemplates,
  StoryboardGrid,
  StoryboardPreview,
} from '@/components/storyboard';
import type { Scene } from '@/types/scene';

export default function ProjectStoryboardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const { storyboard, setStoryboard, reorderScenes, updateScene, addScene, removeScene } =
    useStoryboardStore();
  const providers = useProviderStore((s) => s.providers);
  const hasProvider = Object.values(providers).some((p) => p.status === 'connected');

  const projectQuery = trpc.project.get.useQuery({ id: projectId });
  const storyboardQuery = trpc.storyboard.get.useQuery({ projectId });
  const generateMutation = trpc.storyboard.generate.useMutation();
  const saveMutation = trpc.storyboard.save.useMutation();

  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const screenshotUrls = useMemo(() => {
    const map: Record<string, string> = {};
    for (const capture of projectQuery.data?.captures ?? []) {
      map[capture.id] = capture.screenshotUrl;
    }
    return map;
  }, [projectQuery.data?.captures]);

  useEffect(() => {
    if (storyboardQuery.data) {
      setStoryboard(storyboardQuery.data);
    }
  }, [storyboardQuery.data, setStoryboard]);

  const scenes = storyboard?.scenes ?? [];
  const projectName = projectQuery.data?.name ?? 'Loading project…';

  const handleGenerate = async () => {
    setGenerateError(null);
    try {
      const result = await generateMutation.mutateAsync({ projectId });
      setStoryboard(result);
      void storyboardQuery.refetch();
    } catch (error) {
      setGenerateError(
        error instanceof Error
          ? error.message
          : 'Storyboard generation failed. Check that a provider with vision is configured.',
      );
    }
  };

  const handleSave = async () => {
    if (!storyboard) return;
    setSaved(false);
    await saveMutation.mutateAsync({
      projectId,
      storyboard: {
        projectId,
        scenes: storyboard.scenes,
        version: storyboard.version + 1,
        status: 'draft',
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleEdit = (scene: Scene) => {
    setEditingScene(scene);
    setEditorOpen(true);
  };

  const handleSceneChange = (updated: Scene) => {
    updateScene(updated.id, updated);
  };

  const isLoading = projectQuery.isLoading || storyboardQuery.isLoading;

  return (
    <ProjectLayout projectName={projectName} currentPhase={1}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/projects/${projectId}/capture`}
              className="mb-1 flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to capture
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Storyboard</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              AI proposes scenes from your screenshots — reorder, edit, and refine them here.
            </p>
          </div>
          {scenes.length > 0 && (
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {saveMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {saved ? 'Saved' : 'Save'}
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="flex h-48 items-center justify-center text-sm text-zinc-400">
            Loading…
          </div>
        )}

        {!isLoading && scenes.length === 0 && (
          <div className="mx-auto max-w-xl space-y-4">
            {!hasProvider && <ProviderGate />}
            <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
              <Sparkles className="mx-auto mb-3 h-8 w-8 text-violet-500" />
              <h2 className="text-lg font-semibold text-zinc-900">
                Generate a storyboard from your screenshots
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
                {projectQuery.data?.captures.length
                  ? `${projectQuery.data.captures.length} screenshots and a theme are ready. The AI will propose scenes with transitions, durations, and camera moves.`
                  : 'Capture the site first to have screenshots for the storyboard.'}
              </p>
              {generateError && <p className="mt-3 text-sm text-red-600">{generateError}</p>}
              <Button
                onClick={handleGenerate}
                disabled={
                  generateMutation.isPending ||
                  !hasProvider ||
                  projectQuery.data?.captures.length === 0
                }
                className="mt-4 bg-violet-600 hover:bg-violet-500"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating storyboard…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate storyboard
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {!isLoading && scenes.length > 0 && (
          <>
            <StoryboardPreview scenes={scenes} screenshotUrls={screenshotUrls} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SceneTemplates
                firstScreenshotId={projectQuery.data?.captures[0]?.id}
                order={scenes.length}
                onAdd={addScene}
              />
              <span className="text-xs text-zinc-400">
                {scenes.length} scenes · drag to reorder
              </span>
            </div>
            <StoryboardGrid
              scenes={scenes}
              screenshotUrls={screenshotUrls}
              onReorder={(next) => reorderScenes(next.map((s) => s.id))}
              onEdit={handleEdit}
              onDelete={removeScene}
            />
            <AiSuggestionsPanel scenes={scenes} />
            <div className="flex justify-end">
              <Button
                render={<Link href={`/projects/${projectId}/audio`} />}
                className="bg-violet-600 hover:bg-violet-500"
              >
                Continue to voiceover <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        <SceneEditor
          scene={editingScene}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          onSave={handleSceneChange}
        />
      </div>
    </ProjectLayout>
  );
}
