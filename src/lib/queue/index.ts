import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export const CAPTURE_QUEUE = 'capture';
export const RENDER_QUEUE = 'render';
export const EXPORT_QUEUE = 'export';
export const AUDIO_QUEUE = 'audio';

export const captureQueue = new Queue(CAPTURE_QUEUE, { connection });
export const renderQueue = new Queue(RENDER_QUEUE, { connection });
export const exportQueue = new Queue(EXPORT_QUEUE, { connection });
export const audioQueue = new Queue(AUDIO_QUEUE, { connection });

export interface CaptureJobData {
  projectId: string;
  url: string;
  viewports: Array<{ width: number; height: number; deviceScaleFactor: number; isMobile: boolean }>;
  cookies?: unknown[];
}

export interface RenderJobData {
  projectId: string;
  exportId: string;
  resolution: { width: number; height: number };
  frameRate: number;
  codec: 'h264' | 'webm';
}

export interface ExportJobData {
  projectId: string;
  exportConfig: {
    mode: 'single' | 'batch';
    format: 'video' | 'project';
    codec: 'h264' | 'webm';
    resolution: { width: number; height: number };
    frameRate: number;
    batchResolutions: Array<{ width: number; height: number }>;
  };
}

export interface AudioJobData {
  projectId: string;
  audioFileUrl: string;
}

export type JobName = 'capture-site' | 'render-video' | 'export' | 'transcribe';
