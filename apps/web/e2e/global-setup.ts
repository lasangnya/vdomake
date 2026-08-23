import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import IORedis from 'ioredis';

let worker: ChildProcessWithoutNullStreams | null = null;

/**
 * Runs once before the e2e suite:
 * 1. Drains stale capture/render/export jobs left by previous runs.
 * 2. Spawns ONE shared queue worker so all flows' jobs are processed
 *    deterministically (single process, sequential).
 * Returns a teardown that stops the worker after the suite.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const redis = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 2,
  });
  try {
    const prefixes = ['bull:capture', 'bull:render', 'bull:export'];
    for (const prefix of prefixes) {
      const keys = await redis.keys(`${prefix}:*`);
      if (keys.length > 0) await redis.del(...keys);
    }
  } finally {
    redis.disconnect();
  }

  worker = spawn('bun', ['run', 'worker'], { stdio: 'pipe', shell: true });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('shared worker failed to start')), 30_000);
    worker?.stdout?.on('data', (chunk: Buffer) => {
      if (chunk.toString().includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
    worker?.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`shared worker exited early with code ${code}`));
    });
  });

  return async () => {
    worker?.kill('SIGTERM');
    worker = null;
  };
}
