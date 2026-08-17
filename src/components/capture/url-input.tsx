'use client';

import { useState, type FormEvent } from 'react';
import { Link2, Loader2, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface CaptureViewportInput {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
}

export const VIEWPORT_OPTIONS: Record<
  string,
  { label: string; icon: typeof Monitor; viewport: CaptureViewportInput }
> = {
  desktop: {
    label: 'Desktop 1440×900',
    icon: Monitor,
    viewport: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
  },
  tablet: {
    label: 'Tablet 768×1024',
    icon: Tablet,
    viewport: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: false },
  },
  mobile: {
    label: 'Mobile 375×812',
    icon: Smartphone,
    viewport: { width: 375, height: 812, deviceScaleFactor: 3, isMobile: true },
  },
};

export function UrlInput({
  onSubmit,
  isSubmitting = false,
  defaultUrl = '',
  defaultViewport = 'desktop',
}: {
  onSubmit: (url: string, viewports: CaptureViewportInput[]) => void;
  isSubmitting?: boolean;
  defaultUrl?: string;
  defaultViewport?: string;
}) {
  const [url, setUrl] = useState(defaultUrl);
  const [localhostMode, setLocalhostMode] = useState(defaultUrl.startsWith('localhost'));
  const [viewportKey, setViewportKey] = useState(defaultViewport);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Enter a URL to capture');
      return;
    }
    const normalized =
      localhostMode && !/^https?:\/\//i.test(trimmed) ? `http://${trimmed}` : trimmed;
    if (!localhostMode && !/^https?:\/\//i.test(normalized) && !normalized.includes('.')) {
      setError('Enter a valid URL, e.g. https://example.com');
      return;
    }
    setError(null);
    const option = VIEWPORT_OPTIONS[viewportKey] ?? VIEWPORT_OPTIONS.desktop;
    onSubmit(normalized, [option.viewport]);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="url-input">Website URL</Label>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            id="url-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={localhostMode ? 'localhost:3000' : 'https://example.com'}
            className={cn('pl-9', error && 'border-red-400')}
            inputMode="url"
            autoComplete="url"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="localhost-toggle"
            checked={localhostMode}
            onCheckedChange={(checked) => {
              setLocalhostMode(checked);
              if (error) setError(null);
            }}
          />
          <Label htmlFor="localhost-toggle" className="text-sm font-normal text-zinc-600">
            Capture localhost
          </Label>
        </div>

        <div className="flex flex-col gap-1.5 sm:w-56">
          <Label htmlFor="viewport-select" className="text-xs text-zinc-500">
            Viewport
          </Label>
          <Select value={viewportKey} onValueChange={(value) => value && setViewportKey(value)}>
            <SelectTrigger id="viewport-select" className="h-9">
              <SelectValue placeholder="Viewport" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(VIEWPORT_OPTIONS).map(([key, option]) => {
                const Icon = option.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      {option.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-violet-600 hover:bg-violet-500 sm:w-auto"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Capturing…
          </>
        ) : (
          <>
            <Monitor className="mr-2 h-4 w-4" />
            Capture site
          </>
        )}
      </Button>
    </form>
  );
}
