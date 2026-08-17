export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'PROVIDER_ERROR'
  | 'CAPTURE_FAILED'
  | 'RENDER_FAILED'
  | 'TRANSCRIPTION_FAILED'
  | 'STORAGE_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR';

export interface ApiErrorBody {
  error: true;
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiSuccessBody<T> {
  error: false;
  data: T;
}

export type ApiResponse<T> = ApiSuccessBody<T> | ApiErrorBody;

export interface CaptureJob {
  jobId: string;
  projectId: string;
  status: 'queued' | 'connecting' | 'scrolling' | 'capturing' | 'analyzing' | 'complete' | 'failed';
  progress: number;
  message?: string;
  error?: string;
}

export interface ExportJob {
  jobId: string;
  projectId: string;
  status: 'queued' | 'rendering_frames' | 'encoding' | 'complete' | 'failed';
  progress: number;
  message?: string;
  error?: string;
  fileUrl?: string;
}
