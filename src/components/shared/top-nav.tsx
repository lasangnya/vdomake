'use client';

import { Clapperboard, Settings, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function TopNav({
  projectName,
  onSettings,
}: {
  projectName?: string;
  onSettings?: () => void;
}) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
            <Clapperboard className="h-4 w-4" />
          </span>
          <span className="text-base font-semibold tracking-tight text-zinc-900">VDOMake</span>
        </div>
        {projectName && (
          <>
            <span className="text-zinc-300">/</span>
            <span className="truncate text-sm text-zinc-500">{projectName}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={onSettings}
          className="text-zinc-500 hover:text-zinc-900"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-zinc-200 text-xs font-semibold text-zinc-700">
                    VD
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="hidden h-4 w-4 text-zinc-400 sm:block" />
              </button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>VDOMake</DropdownMenuLabel>
              <DropdownMenuItem onClick={onSettings}>Settings</DropdownMenuItem>
              <DropdownMenuItem>Feedback</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
