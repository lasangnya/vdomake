import { z } from 'zod';

export const resolutionSchema = z.object({
  width: z.number().int().positive().max(7680),
  height: z.number().int().positive().max(4320),
});

export const exportConfigSchema = z.object({
  mode: z.enum(['single', 'batch']).default('single'),
  format: z.enum(['video', 'project']).default('video'),
  codec: z.enum(['h264', 'webm']).default('h264'),
  resolution: resolutionSchema.default({ width: 1920, height: 1080 }),
  frameRate: z.number().int().min(24).max(60).default(30),
  // Batch mode: extra resolutions rendered in parallel.
  batchResolutions: z.array(resolutionSchema).max(3).default([]),
});

export const batchExportConfigSchema = exportConfigSchema
  .refine((config) => config.mode !== 'batch' || config.batchResolutions.length > 0, {
    message: 'Batch mode requires at least one batchResolutions entry',
  })
  .refine((config) => config.mode !== 'batch' || config.batchResolutions.length <= 3, {
    message: 'Batch mode supports at most 3 resolutions',
  });

export type ExportConfig = z.infer<typeof exportConfigSchema>;
