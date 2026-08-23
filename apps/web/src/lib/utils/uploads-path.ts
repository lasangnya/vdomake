import path from 'node:path';

/** Absolute path to the local uploads directory (screenshots, audio, exports). */
export const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/** Resolves a path that must live under UPLOADS_ROOT; throws on traversal. */
export function resolveUploadPath(relativePath: string): string {
  const resolved = path.resolve(UPLOADS_ROOT, relativePath);
  if (!resolved.startsWith(`${UPLOADS_ROOT}${path.sep}`)) {
    throw new Error(`Path escapes uploads directory: ${relativePath}`);
  }
  return resolved;
}
