'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Something went wrong</h1>
          <p className="text-sm text-zinc-400">
            VDOMake hit an unexpected error. Please try again.
          </p>
          <Button onClick={retry} variant="default" className="bg-violet-600 hover:bg-violet-500">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
