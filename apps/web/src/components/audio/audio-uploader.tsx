'use client';

import { useCallback, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Loader2, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateAudioFile } from '@/lib/audio/transcription';
import { cn } from '@/lib/utils';

export function AudioUploader({
  onUpload,
  isUploading = false,
}: {
  onUpload: (file: File) => void;
  isUploading?: boolean;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const validation = validateAudioFile(file);
      if (!validation.ok) {
        setError(validation.reason);
        return;
      }
      setError(null);
      onUpload(file);
    },
    [onUpload],
  );

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = '';
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-label="Upload a voiceover audio file"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragActive
            ? 'border-violet-500 bg-violet-50'
            : 'border-zinc-300 bg-white hover:border-violet-400 hover:bg-zinc-50',
        )}
      >
        <UploadCloud className="h-8 w-8 text-violet-500" />
        <span className="text-sm font-medium text-zinc-800">
          {dragActive ? 'Drop it here' : 'Drag & drop your voiceover'}
        </span>
        <span className="text-xs text-zinc-500">MP3, WAV, M4A, OGG or WebM · up to 50 MB</span>
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.ogg,.webm,audio/*"
          className="hidden"
          onChange={handleInput}
        />
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="bg-violet-600 hover:bg-violet-500"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading & transcribing…
            </>
          ) : (
            'Choose file'
          )}
        </Button>
      </div>
    </div>
  );
}
