'use client';

import { useState, type ReactNode } from 'react';
import { Menu, Settings, Home } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { PhaseStepper } from './phase-stepper';

export function ProjectLayout({
  children,
  projectName,
  currentPhase,
  onPhaseChange,
  onNavigate,
}: {
  children: ReactNode;
  projectName?: string;
  currentPhase?: number;
  onPhaseChange?: (phase: number) => void;
  onNavigate?: (path: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const sidebarContent = (
    <div className="flex h-full flex-col gap-6">
      <div className="px-3">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Project</p>
        <p className="truncate text-sm font-semibold text-zinc-900">
          {projectName ?? 'Untitled project'}
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-3">
          <PhaseStepper currentPhase={currentPhase ?? 0} onPhaseChange={onPhaseChange} />
        </div>
      </ScrollArea>
      <div className="border-t border-zinc-200 px-3 pt-4">
        <button
          type="button"
          onClick={() => {
            onNavigate?.('/');
            setSheetOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() => {
            onNavigate?.('/settings');
            setSheetOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-3 top-3 z-40 lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          }
        />
        <SheetContent side="left" className="w-72 p-4">
          <SheetTitle className="sr-only">Project navigation</SheetTitle>
          <div className="h-full">{sidebarContent}</div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
