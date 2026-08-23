import type { ThemeManifest } from '@/types/theme';

export type ReviewSeverity = 'error' | 'warning' | 'suggestion';

export interface CodeReviewItem {
  severity: ReviewSeverity;
  message: string;
  sceneIndex?: number;
}

export interface CodeReviewDeps {
  /** Text LLM callable — wired to the ProviderRouter by the caller. */
  generate: (prompt: string) => Promise<string>;
}

export interface CodeReviewInput {
  scenesCode: Array<{ index: number; code: string }>;
  theme: ThemeManifest | null;
}

/**
 * Builds the code-review prompt: asks the model to audit the generated Motion
 * Canvas scenes for timing, contrast, and transition issues.
 */
export function buildReviewPrompt(input: CodeReviewInput): string {
  const themeSummary = input.theme
    ? input.theme.colors.map((c) => `${c.hex} (${c.role})`).join(', ')
    : 'unknown';
  const scenes = input.scenesCode
    .map(({ index, code }) => `--- scene ${index} ---\n${code}`)
    .join('\n\n');

  return [
    'You are a senior Motion Canvas reviewer. Audit the generated scenes for:',
    '1. Timing issues (scenes too short/long for their content).',
    '2. Visual issues (low-contrast overlay colors, text overflowing, missing fade).',
    '3. Missing or broken transitions.',
    'Return ONLY a JSON array of findings:',
    '[{ "severity": "error|warning|suggestion", "sceneIndex": 0, "message": "..." }]',
    'Use an empty array when the code is clean.',
    '',
    `Theme palette: ${themeSummary}`,
    '',
    scenes,
  ].join('\n');
}

/**
 * Parses the model's review response into structured findings. Pure + tolerant
 * of prose around the JSON.
 */
export function parseReviewResponse(text: string): CodeReviewItem[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.search(/\[/);
  if (start === -1) return [];
  const end = candidate.lastIndexOf(']');
  if (end === -1 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item): CodeReviewItem | null => {
      if (typeof item !== 'object' || item === null) return null;
      const raw = item as Record<string, unknown>;
      const severity = raw.severity;
      const message = raw.message;
      if (typeof message !== 'string') return null;
      const normalized: ReviewSeverity =
        severity === 'error' || severity === 'warning' || severity === 'suggestion'
          ? severity
          : 'suggestion';
      return {
        severity: normalized,
        message: message.slice(0, 500),
        sceneIndex: typeof raw.sceneIndex === 'number' ? raw.sceneIndex : undefined,
      };
    })
    .filter((item): item is CodeReviewItem => item !== null)
    .slice(0, 20);
}

/** Reviews the generated scene code via the provided LLM callable. */
export async function reviewGeneratedCode(
  input: CodeReviewInput,
  deps: CodeReviewDeps,
): Promise<CodeReviewItem[]> {
  const raw = await deps.generate(buildReviewPrompt(input));
  return parseReviewResponse(raw);
}
