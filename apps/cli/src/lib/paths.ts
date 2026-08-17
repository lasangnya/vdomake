import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolves the VDOMake repo root by walking up from this file until a
 * directory containing `turbo.json` is found. All commands run relative to it.
 */
export function resolveRepoRoot(): string {
  let current = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    if (existsSync(join(current, "turbo.json"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        "Could not find VDOMake repository root (no turbo.json found).",
      );
    }
    current = parent;
  }
}
