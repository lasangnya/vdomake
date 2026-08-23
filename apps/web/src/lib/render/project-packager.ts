import { ZipArchive } from 'archiver';
import type { ProgressData } from 'archiver';
import { createWriteStream } from 'node:fs';
import { mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * Zips a directory into an archive (archiver v8). Returns the output path.
 * The archive includes the directory's contents at the archive root.
 */
export async function zipDirectory(
  sourceDir: string,
  outputPath: string,
  onBytes?: (bytes: number) => void,
): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const output = createWriteStream(outputPath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  return new Promise<string>((resolve, reject) => {
    archive.on('error', reject);
    output.on('close', () => resolve(outputPath));
    archive.pipe(output);
    archive.directory(sourceDir, false);
    if (onBytes) {
      archive.on('progress', (progress: ProgressData) => onBytes(progress.entries.processed));
    }
    void archive.finalize().catch(reject);
  });
}

export async function directorySizeBytes(dir: string): Promise<number> {
  let total = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await directorySizeBytes(full);
    } else {
      total += (await stat(full)).size;
    }
  }
  return total;
}
