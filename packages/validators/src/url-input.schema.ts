import { z } from "zod";

export const viewportSchema = z.object({
  width: z.number().int().positive().max(4096),
  height: z.number().int().positive().max(4096),
  deviceScaleFactor: z.number().positive().max(3).default(2),
  isMobile: z.boolean().default(false),
});

export const cookieSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  domain: z.string().optional(),
  path: z.string().default("/"),
  expires: z.number().optional(),
  httpOnly: z.boolean().default(false),
  secure: z.boolean().default(false),
  sameSite: z.enum(["Strict", "Lax", "None"]).optional(),
});

const URL_PROTOCOL_RE = /^https?:\/\//i;
const LOCALHOST_RE =
  /^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/.*)?$/i;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (LOCALHOST_RE.test(trimmed) && !URL_PROTOCOL_RE.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return URL_PROTOCOL_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const urlInputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .transform(normalizeUrl)
    .pipe(z.url({ message: "Enter a valid URL" })),
  viewports: z.array(viewportSchema).min(1).max(3).optional(),
  cookies: z.array(cookieSchema).max(20).optional(),
});

export type UrlInput = z.infer<typeof urlInputSchema>;
export type Viewport = z.infer<typeof viewportSchema>;
