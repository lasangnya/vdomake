'use client';

import { useState } from 'react';
import { Loader2, Play, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function GenerateButton({
  onGenerate,
  isGenerating = false,
  sceneCount = 0,
}: {
  onGenerate: () => void;
  isGenerating?: boolean;
  sceneCount?: number;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirm = () => {
    setConfirmOpen(false);
    onGenerate();
  };

  return (
    <>
      <Button
        onClick={() => setConfirmOpen(true)}
        disabled={isGenerating || sceneCount === 0}
        size="lg"
        className="bg-violet-600 hover:bg-violet-500"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating…
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Video
          </>
        )}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate the Motion Canvas project</DialogTitle>
            <DialogDescription>
              This creates an editable Motion Canvas project from your{' '}
              <strong>{sceneCount} scenes</strong> and renders a preview video.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="gap-1.5 bg-violet-600 hover:bg-violet-500">
              <Play className="h-4 w-4" />
              Generate & render
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
