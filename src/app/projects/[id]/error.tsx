'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export default function ProjectError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Error boundaries are the standard place for client-side error logging.
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Alert className="max-w-md" variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Project error</AlertTitle>
        <AlertDescription className="flex flex-col gap-4">
          <span>This project could not be loaded.</span>
          <Button onClick={retry} variant="outline" className="w-fit">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
