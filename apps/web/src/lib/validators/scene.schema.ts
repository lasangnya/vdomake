import { z } from 'zod';

export const textOverlaySchema = z.object({
  id: z.string().min(1),
  text: z.string().max(500),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  fontSize: z.number().positive().max(256),
  fontFamily: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontWeight: z.number().int().positive().max(900).optional(),
  maxWidth: z.number().positive().optional(),
});

export const sceneSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  screenshotId: z.string().min(1),
  title: z.string().max(200),
  description: z.string().max(1000).default(''),
  duration: z.number().positive().max(120),
  transition: z.object({
    type: z.enum(['fade', 'slide', 'zoom', 'morph', 'wipe', 'dissolve']),
    duration: z.number().nonnegative().max(10),
    easing: z.enum(['smooth', 'spring', 'linear']),
  }),
  camera: z.object({
    type: z.enum(['static', 'pan', 'zoom-to', 'ken-burns']),
    target: z
      .object({
        x: z.number(),
        y: z.number(),
        scale: z.number().positive(),
      })
      .optional(),
  }),
  overlays: z.array(textOverlaySchema).default([]),
});

export const storyboardSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  scenes: z.array(sceneSchema).min(1, 'Storyboard must contain at least one scene'),
  version: z.number().int().nonnegative().default(1),
  status: z.enum(['draft', 'finalized']).default('draft'),
});

export type SceneInput = z.infer<typeof sceneSchema>;
export type StoryboardInput = z.infer<typeof storyboardSchema>;
