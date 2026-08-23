'use client';

import { useState } from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import type { AutoSyncSuggestion } from '@/types/keyframe';

export function AutoSyncButton({
  projectId,
  disabled = false,
  onComplete,
}: {
  projectId: string;
  disabled?: boolean;
  onComplete?: (suggestions: AutoSyncSuggestion[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const autoSync = trpc.audio.autoSync.useMutation();

  const handleClick = async () => {
    setError(null);
    try {
      const suggestions = await autoSync.mutateAsync({ projectId });
      onComplete?.(suggestions);
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Auto-sync failed');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled || autoSync.isPending}
        className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50"
      >
        {autoSync.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="h-4 w-4" />
        )}
        {autoSync.isPending ? 'Syncing…' : 'Auto-sync scenes'}
      </Button>
      {autoSync.isSuccess && (
        <span className="text-xs text-emerald-600">
          {autoSync.data.length} keyframe{autoSync.data.length === 1 ? '' : 's'} suggested
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
