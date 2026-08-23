'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc/client';
import { useTimelineStore } from '@/stores/timeline-store';
import { TimelineContainer, type TimelineClipSpec } from '@/components/timeline/timeline-container';
import { PlaybackControls } from '@/components/timeline/playback-controls';
import { MiniPreview } from '@/components/timeline/mini-preview';
import { ExportDialog, type ExportConfigValue } from '@/components/timeline/export-dialog';
import { ExportProgress } from '@/components/timeline/export-progress';
import { ProjectDownloadButton } from '@/components/timeline/project-download-button';
import { BackgroundMusicUploader } from '@/components/timeline/background-music-uploader';
import type { Keyframe } from '@/types/keyframe';
import type { Scene } from '@/types/scene';

export default function ProjectTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState<string | null>(null);
  useEffect(() => {
    void params.then(({ id }) => setProjectId(id));
  }, [params]);
  if (!projectId) return null;
  return <TimelineEditor projectId={projectId} />;
}

function TimelineEditor({ projectId }: { projectId: string }) {
  const projectQuery = trpc.project.get.useQuery({ id: projectId });
  const storyboardQuery = trpc.storyboard.get.useQuery({ projectId });
  const audioQuery = trpc.audio.get.useQuery({ projectId });
  const saveKeyframes = trpc.audio.saveKeyframes.useMutation();
  const utils = trpc.useUtils();

  const scenes = useMemo(
    () => (storyboardQuery.data?.scenes as unknown as Scene[]) ?? [],
    [storyboardQuery.data],
  );
  const keyframeRows = useMemo(
    () => (audioQuery.data?.keyframes as Keyframe[]) ?? [],
    [audioQuery.data],
  );
  const [localKeyframes, setLocalKeyframes] = useState<Keyframe[]>([]);
  useEffect(() => setLocalKeyframes(keyframeRows), [keyframeRows]);

  const setClips = useTimelineStore((s) => s.setClips);
  const setDuration = useTimelineStore((s) => s.setDuration);
  const setPlayhead = useTimelineStore((s) => s.setPlayhead);
  const setIsPlaying = useTimelineStore((s) => s.setIsPlaying);
  const isPlaying = useTimelineStore((s) => s.isPlaying);
  const playbackSpeed = useTimelineStore((s) => s.playbackSpeed);
  const duration = useTimelineStore((s) => s.duration);
  const zoom = useTimelineStore((s) => s.zoom);
  const setZoom = useTimelineStore((s) => s.setZoom);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const captureById = useMemo(() => {
    const map = new Map<string, { screenshotUrl: string }>();
    for (const capture of projectQuery.data?.captures ?? []) map.set(capture.id, capture);
    return map;
  }, [projectQuery.data]);

  const clips = useMemo<TimelineClipSpec[]>(() => {
    const kfByScene = new Map(localKeyframes.map((kf) => [kf.sceneId, kf]));
    const video = scenes.map((scene) => {
      const kf = kfByScene.get(scene.id);
      const capture = scene.screenshotId ? captureById.get(scene.screenshotId) : undefined;
      return {
        id: scene.id,
        track: 'video' as const,
        start: kf?.startTime ?? 0,
        end: kf?.endTime ?? scene.duration,
        label: scene.title || `Scene ${scene.order + 1}`,
        thumbnailUrl: capture?.screenshotUrl,
      };
    });
    const track = audioQuery.data?.track;
    const audio: TimelineClipSpec[] = track
      ? [{ id: 'voiceover', track: 'voiceover', start: 0, end: track.duration, label: 'Voiceover' }]
      : [];
    const text: TimelineClipSpec[] = scenes.flatMap((scene) => {
      const kf = kfByScene.get(scene.id);
      return scene.overlays.map((overlay) => ({
        id: overlay.id,
        track: 'text' as const,
        start: kf?.startTime ?? 0,
        end: kf?.endTime ?? scene.duration,
        label: overlay.text.length > 24 ? `${overlay.text.slice(0, 24)}…` : overlay.text,
      }));
    });
    return [...video, ...audio, ...text];
  }, [scenes, localKeyframes, audioQuery.data?.track, captureById]);

  // Keep the store in sync with computed clips + duration.
  useEffect(() => {
    setClips(clips);
    const maxEnd = clips.reduce((acc, clip) => Math.max(acc, clip.end), 0);
    setDuration(Math.max(maxEnd, 1));
  }, [clips, setClips, setDuration]);

  // Playhead animation while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const current = useTimelineStore.getState().playhead;
      const next = current + 0.05 * playbackSpeed;
      const total = useTimelineStore.getState().duration;
      if (next >= total) {
        setPlayhead(total);
        setIsPlaying(false);
      } else {
        setPlayhead(next);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, setPlayhead, setIsPlaying]);

  const applyTrim = (sceneId: string, start: number, end: number) => {
    setLocalKeyframes((prev) => {
      const sorted = [...prev].sort((a, b) => a.startTime - b.startTime);
      const index = sorted.findIndex((kf) => kf.sceneId === sceneId);
      if (index === -1) return prev;
      const updated = [...sorted];
      updated[index] = { ...updated[index], startTime: start, endTime: end };
      // Keep the timeline chain tight: the following keyframe starts where this ends.
      if (index + 1 < updated.length) {
        updated[index + 1] = { ...updated[index + 1], startTime: end };
      }
      return updated;
    });
  };

  // Debounced persistence of keyframe edits.
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (localKeyframes.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveKeyframes.mutate(
        {
          projectId,
          keyframes: localKeyframes.map((kf) => ({
            sceneId: kf.sceneId,
            startTime: kf.startTime,
            endTime: kf.endTime,
            transitionDuration: kf.transitionDuration,
            isAutoGenerated: kf.isAutoGenerated,
          })),
        },
        { onSuccess: () => void utils.audio.get.invalidate({ projectId }) },
      );
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [localKeyframes, projectId, saveKeyframes, utils.audio.get]);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);

  const startExport = async (config: ExportConfigValue) => {
    setExportOpen(false);
    setExportJobId(null);
    const response = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, config }),
    });
    if (!response.ok) return;
    const body = await response.json();
    setExportJobId(body.data.jobId);
  };

  const previewUrl = projectQuery.data?.previewUrl ?? null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Back to projects
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-zinc-900">Timeline</h1>
          <p className="text-sm text-zinc-500">
            Final adjustments — trim scenes, add music, then export.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(Math.min(4, zoom * 1.25))}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
            type="button"
          >
            ＋
          </button>
          <span className="font-mono text-xs text-zinc-500">{zoom}×</span>
          <button
            onClick={() => setZoom(Math.max(0.25, zoom / 1.25))}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
            type="button"
          >
            －
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <MiniPreview src={previewUrl} />

          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <PlaybackControls />
          </div>

          <TimelineContainer
            clips={clips}
            onSeek={(time) => {
              setPlayhead(time);
              setIsPlaying(false);
            }}
            onTrim={applyTrim}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
          <p className="text-xs text-zinc-400">
            Drag the violet edges of a scene to trim. Edits save automatically and are used by the
            next render/export.
          </p>
        </div>

        <div className="space-y-4">
          <BackgroundMusicUploader projectId={projectId} />

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-zinc-800">Export</h3>
            <button
              onClick={() => setExportOpen(true)}
              className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md bg-violet-600 text-sm font-medium text-white hover:bg-violet-700"
              data-testid="open-export"
              type="button"
            >
              Export video
            </button>
            <div className="mt-3">
              <ExportProgress
                jobId={exportJobId}
                onComplete={() => void utils.project.get.invalidate({ id: projectId })}
              />
            </div>
            <div className="mt-3">
              <ProjectDownloadButton projectId={projectId} />
            </div>
          </div>

          {selectedId && (
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-zinc-800">Properties</h3>
              <p className="mt-1 font-mono text-xs text-zinc-500">{selectedId}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Selected clip on the timeline. Scene timing is edited by dragging the clip edges.
              </p>
            </div>
          )}
        </div>
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onStart={startExport}
        durationSec={duration}
      />
    </main>
  );
}
