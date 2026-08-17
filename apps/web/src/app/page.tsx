import Link from 'next/link';
import { ArrowRight, Clapperboard, Palette, AudioLines, Code2, Timeline } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TopNav } from '@/components/shared/top-nav';

const PHASES = [
  {
    icon: Clapperboard,
    title: 'Capture',
    description: 'Headless browser captures your site at 2x DPI and extracts its design DNA.',
  },
  {
    icon: Palette,
    title: 'Storyboard',
    description: 'AI turns screenshots into an editable scene sequence with transitions.',
  },
  {
    icon: AudioLines,
    title: 'Voiceover',
    description: 'Transcribe narration and tag keyframes so every beat lands on cue.',
  },
  {
    icon: Code2,
    title: 'Generate',
    description: 'Motion Canvas code is generated and rendered into a preview video.',
  },
  {
    icon: Timeline,
    title: 'Export',
    description: 'Fine-tune on a timeline and export production-ready MP4 up to 4K.',
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <TopNav />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-6 pb-20 pt-20 lg:pt-28">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-600" />
              AI-powered website-to-video
            </span>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl">
              Paste a URL. <span className="text-violet-600">Get a video.</span>
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-zinc-600">
              VDOMake turns any website into a polished, animated video in minutes — not the 4–8
              hours a motion designer needs in After Effects.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/projects"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'bg-violet-600 text-white hover:bg-violet-500',
                )}
              >
                Start a project <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/settings"
                className={cn(buttonVariants({ size: 'lg', variant: 'outline' }))}
              >
                Configure providers
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-6 pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {PHASES.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="group rounded-lg border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md"
              >
                <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-600 group-hover:text-white">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
