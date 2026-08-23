'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

/** Uploads background music and edits its volume/fade/loop settings. */
export function BackgroundMusicUploader({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const musicQuery = trpc.backgroundMusic.get.useQuery({ projectId });
  const saveSettings = trpc.backgroundMusic.saveSettings.useMutation({
    onSuccess: () => void utils.backgroundMusic.get.invalidate({ projectId }),
  });
  const removeMusic = trpc.backgroundMusic.remove.useMutation({
    onSuccess: () => void utils.backgroundMusic.get.invalidate({ projectId }),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const music = musicQuery.data;

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('file', file);
      const response = await fetch('/api/music', { method: 'POST', body: formData });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? 'Upload failed');
        return;
      }
      await utils.backgroundMusic.get.invalidate({ projectId });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-800">Background music</h3>

      {music ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-xs text-zinc-600">{music.fileUrl.split('/').pop()}</span>
            <button
              onClick={() => removeMusic.mutate({ projectId })}
              className="text-xs text-red-500 hover:text-red-600"
              type="button"
            >
              Remove
            </button>
          </div>

          <label className="block text-xs text-zinc-500">
            Volume {Math.round(music.volume * 100)}%
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(music.volume * 100)}
              onChange={(e) =>
                saveSettings.mutate({
                  projectId,
                  volume: Number(e.target.value) / 100,
                  fadeInDuration: music.fadeInDuration,
                  fadeOutDuration: music.fadeOutDuration,
                  loop: music.loop,
                })
              }
              className="mt-1 w-full accent-violet-600"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-zinc-500">
              Fade in (s)
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={music.fadeInDuration}
                onChange={(e) =>
                  saveSettings.mutate({
                    projectId,
                    volume: music.volume,
                    fadeInDuration: Number(e.target.value),
                    fadeOutDuration: music.fadeOutDuration,
                    loop: music.loop,
                  })
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Fade out (s)
              <input
                type="number"
                min={0}
                max={30}
                step={0.5}
                value={music.fadeOutDuration}
                onChange={(e) =>
                  saveSettings.mutate({
                    projectId,
                    volume: music.volume,
                    fadeInDuration: music.fadeInDuration,
                    fadeOutDuration: Number(e.target.value),
                    loop: music.loop,
                  })
                }
                className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs text-zinc-600">
            <input
              type="checkbox"
              checked={music.loop}
              onChange={(e) =>
                saveSettings.mutate({
                  projectId,
                  volume: music.volume,
                  fadeInDuration: music.fadeInDuration,
                  fadeOutDuration: music.fadeOutDuration,
                  loop: e.target.checked,
                })
              }
              className="accent-violet-600"
            />
            Loop
          </label>
        </div>
      ) : (
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-6 text-center text-xs text-zinc-500 hover:border-violet-400 hover:text-violet-600">
          {busy ? 'Uploading…' : 'Click to upload MP3/WAV background music'}
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = '';
            }}
          />
        </label>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
