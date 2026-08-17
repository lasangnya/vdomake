import { z } from "zod";

export const providerIdSchema = z.enum([
  "openai",
  "anthropic",
  "gemini",
  "ollama",
  "custom",
]);

export const taskTypeSchema = z.enum([
  "vision",
  "storyboard",
  "transcription",
  "auto_sync",
  "code_review",
]);

export const apiKeySchema = z.object({
  providerId: providerIdSchema,
  apiKey: z.string().trim().min(1, "API key is required").max(4096),
});

export const taskRoutingSchema = z.object({
  taskType: taskTypeSchema,
  primaryProviderId: providerIdSchema,
  primaryModel: z.string().trim().optional(),
  fallbackProviderId: providerIdSchema.nullable().default(null),
  fallbackModel: z.string().trim().nullable().default(null),
});

export const taskRoutingListSchema = z.array(taskRoutingSchema).max(10);

export const providerStatusSchema = z.object({
  providerId: providerIdSchema,
  status: z.enum([
    "connected",
    "invalid",
    "not_configured",
    "rate_limited",
    "validating",
  ]),
  keyHint: z.string().nullable(),
  lastValidatedAt: z.iso.datetime().nullable(),
});

export type ApiKeyInput = z.infer<typeof apiKeySchema>;
export type TaskRoutingInput = z.infer<typeof taskRoutingSchema>;
