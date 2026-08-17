import { Film } from 'lucide-react';
import { TopNav } from '@/components/shared/top-nav';
import { EmptyState } from '@/components/shared/empty-state';
import { ProviderGate } from '@/components/shared/provider-gate';

export default function ProjectsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Capture a website and turn it into an animated video.
          </p>
        </div>

        <div className="space-y-6">
          <ProviderGate />
          <EmptyState
            icon={<Film className="h-8 w-8" />}
            title="No projects yet"
            description="Paste a URL and VDOMake will capture the site, build a storyboard, and generate your video. Site capture is coming in the next phase."
            actionLabel="New project"
          />
        </div>
      </main>
    </div>
  );
}
