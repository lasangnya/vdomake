import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { zipDirectory, directorySizeBytes } from '@/lib/render/project-packager';

const execFileAsync = promisify(execFile);

describe('project-packager', () => {
  let sourceDir: string;
  let outputPath: string;

  beforeAll(async () => {
    sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pkg-src-'));
    outputPath = path.join(os.tmpdir(), `pkg-${Date.now()}.zip`);
    await fs.mkdir(path.join(sourceDir, 'scenes'));
    await fs.writeFile(path.join(sourceDir, 'project.ts'), 'export default {}\n');
    await fs.writeFile(path.join(sourceDir, 'scenes', 'scene-0.tsx'), '<Img />\n');
  });

  afterAll(async () => {
    await fs.rm(sourceDir, { recursive: true, force: true });
    await fs.rm(outputPath, { force: true });
  });

  it('zips a directory and produces a valid archive', async () => {
    const result = await zipDirectory(sourceDir, outputPath);
    expect(result).toBe(outputPath);
    const { stdout } = await execFileAsync('unzip', ['-l', outputPath]);
    expect(stdout).toContain('project.ts');
    expect(stdout).toContain('scenes/scene-0.tsx');
  });

  it('reports zip creation progress', async () => {
    let processed = 0;
    await zipDirectory(sourceDir, outputPath, (bytes) => {
      processed = bytes;
    });
    expect(processed).toBeGreaterThan(0);
  });

  it('computes the total size of a directory tree', async () => {
    const size = await directorySizeBytes(sourceDir);
    expect(size).toBeGreaterThan(0);
  });
});
