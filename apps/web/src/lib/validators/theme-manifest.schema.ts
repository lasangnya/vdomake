import { z } from 'zod';

export const themeColorSchema = z.object({
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  role: z.enum(['primary', 'secondary', 'accent', 'background', 'text', 'border', 'other']),
  usage: z.number().nonnegative().default(0),
});

export const themeFontSchema = z.object({
  family: z.string().min(1),
  weights: z.array(z.number().int().positive()).default([]),
  sizes: z.array(z.number().int().positive()).default([]),
  usage: z.number().nonnegative().default(0),
});

export const themeManifestSchema = z.object({
  colors: z.array(themeColorSchema).max(64),
  fonts: z.array(themeFontSchema).max(16),
  spacing: z.object({
    unit: z.number().positive(),
    rhythm: z.array(z.number().nonnegative()).default([]),
  }),
  borderRadius: z.object({
    small: z.number().nonnegative().default(0),
    medium: z.number().nonnegative().default(0),
    large: z.number().nonnegative().default(0),
  }),
  shadows: z
    .array(
      z.object({
        color: z.string(),
        blur: z.number().nonnegative(),
        offsetX: z.number(),
        offsetY: z.number(),
        usage: z.number().nonnegative().default(0),
      }),
    )
    .default([]),
  brandAssets: z.object({
    logoUrl: z.url().optional(),
    faviconUrl: z.url().optional(),
    ogImageUrl: z.url().optional(),
  }),
  sourceUrl: z.url(),
  extractedAt: z.iso.datetime(),
});

export type ThemeManifestInput = z.infer<typeof themeManifestSchema>;
