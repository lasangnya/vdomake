'use client';

import { KeyRound } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function ProviderGate({ onGoToSettings }: { onGoToSettings?: () => void }) {
  return (
    <Alert className="border-violet-200 bg-violet-50">
      <KeyRound className="h-4 w-4 text-violet-600" />
      <AlertTitle className="text-violet-900">Connect an AI provider</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <span className="text-violet-800">
          VDOMake uses your own API keys (OpenAI, Anthropic, Gemini, or local models) to capture,
          storyboard, and generate your video.
        </span>
        <Button
          onClick={onGoToSettings}
          size="sm"
          className="w-fit bg-violet-600 hover:bg-violet-500"
        >
          Open Settings
        </Button>
      </AlertDescription>
    </Alert>
  );
}
