import Link from 'next/link';
import { Film, ArrowUpRight } from 'lucide-react';
import { TopNav } from '@/components/shared/top-nav';
import { EmptyState } from '@/components/shared/empty-state';
import { ProviderGate } from '@/components/shared/provider-gate';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import { captures, projects } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-zinc-100 text-zinc-600' },
  capturing: { label: 'Capturing', className: 'bg-violet-100 text-violet-700' },
  captured: { label: 'Captured', className: 'bg-emerald-100 text-emerald-700' },
  storyboarding: { label: 'Storyboarding', className: 'bg-violet-100 text-violet-700' },
};

async function getProjects() {
  try {
    return await db
      .select({
        id: projects.id,
        name: projects.name,
        url: projects.url,
        status: projects.status,
        createdAt: projects.createdAt,
        captureCount: db.$count(captures, eq(captures.projectId, projects.id)),
      })
      .from(projects)
      .orderBy(desc(projects.updatedAt));
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const rows = await getProjects();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <TopNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Projects</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Capture a website and turn it into an animated video.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            <Film className="h-4 w-4" />
            New project
          </Link>
        </div>

        <div className="space-y-6">
          <ProviderGate />
          {rows.length === 0 ? (
            <EmptyState
              icon={<Film className="h-8 w-8" />}
              title="No projects yet"
              description="Paste a URL and VDOMake will capture the site, build a storyboard, and generate your video."
              actionLabel="New project"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((project) => {
                const status = STATUS_LABEL[project.status] ?? STATUS_LABEL.draft;
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/capture`}
                    className="group rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-zinc-900">
                        {project.name}
                      </h3>
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-violet-600" />
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">{project.url}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <Badge variant="secondary" className={status.className}>
                        {status.label}
                      </Badge>
                      <span className="text-xs text-zinc-400">{project.captureCount} frames</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
