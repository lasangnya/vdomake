'use client';

import { Palette, Type, Ruler } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ThemeManifest } from '@/types/theme';

function swatchBorder(hex: string): string {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return r > 235 && g > 235 && b > 235 ? 'ring-1 ring-zinc-200' : '';
}

export function ThemePreview({ manifest }: { manifest: ThemeManifest | null }) {
  if (!manifest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-violet-600" />
            Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">
            Theme extraction runs automatically after capture.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { colors, fonts, spacing, borderRadius, brandAssets } = manifest;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-violet-600" />
            Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {colors.map((color) => (
            <div key={color.hex} className="space-y-1.5">
              <div
                className={`h-10 rounded-md ${swatchBorder(color.hex)}`}
                style={{ backgroundColor: color.hex }}
                title={color.hex}
              />
              <div className="space-y-0.5">
                <p className="font-mono text-[10px] uppercase text-zinc-500">{color.role}</p>
                <p className="font-mono text-xs text-zinc-700">{color.hex}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-4 w-4 text-violet-600" />
            Typography
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fonts.map((font) => (
            <div key={font.family}>
              <p className="text-xs text-zinc-500">
                {font.family}
                <span className="ml-2 font-mono text-[10px] text-zinc-400">
                  {font.weights.join('/')} · {font.sizes.join(', ')}px
                </span>
              </p>
              <p
                className="mt-1 truncate text-lg"
                style={{ fontFamily: `"${font.family}", sans-serif` }}
              >
                The quick brown fox jumps over the lazy dog
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ruler className="h-4 w-4 text-violet-600" />
            Spacing rhythm
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-zinc-500">
              Base unit <span className="font-mono">{spacing.unit}px</span>
            </p>
            <div className="flex items-end gap-1">
              {spacing.rhythm.slice(0, 12).map((value, i) => (
                <div
                  key={`${value}-${i}`}
                  className="w-5 rounded-sm bg-violet-200"
                  style={{ height: Math.min(value, 96) }}
                  title={`${value}px`}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-zinc-500">Border radius</p>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 border-2 border-violet-400"
                style={{ borderRadius: borderRadius.small }}
              />
              <div
                className="h-10 w-10 border-2 border-violet-400"
                style={{ borderRadius: borderRadius.medium }}
              />
              <div
                className="h-10 w-10 border-2 border-violet-400"
                style={{ borderRadius: borderRadius.large }}
              />
              <span className="font-mono text-[10px] text-zinc-400">
                {borderRadius.small}/{borderRadius.medium}/{borderRadius.large}px
              </span>
            </div>
          </div>
          {brandAssets.logoUrl && (
            <div className="flex items-center gap-3 border-t pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brandAssets.logoUrl}
                alt="Site logo"
                className="h-8 w-auto max-w-24 object-contain"
              />
              <p className="text-xs text-zinc-500">Logo extracted from site header</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
