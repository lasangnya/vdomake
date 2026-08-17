import type {
  ProviderClient,
  ProviderId,
  TaskRoutingConfig,
  TaskType,
  TextGenerationRequest,
  TranscriptionRequest,
  TranscriptionResult,
  VisionRequest,
} from '@/types/provider';
import { getProvider } from './provider-registry';

/** Error thrown when a provider call fails, tagged for retry/fallback logic. */
export class ProviderError extends Error {
  readonly providerId: ProviderId;
  readonly isRateLimit: boolean;
  readonly isTimeout: boolean;

  constructor(
    providerId: ProviderId,
    message: string,
    opts: { isRateLimit?: boolean; isTimeout?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = 'ProviderError';
    this.providerId = providerId;
    this.isRateLimit = opts.isRateLimit ?? false;
    this.isTimeout = opts.isTimeout ?? false;
  }
}

function classify(error: unknown): { isRateLimit: boolean; isTimeout: boolean } {
  let status: number | undefined;
  if (error instanceof Error && 'status' in error) {
    status = (error as { status?: number }).status;
  }
  const message = error instanceof Error ? error.message : String(error);
  const isRateLimit =
    status !== undefined ? status === 429 : /rate limit|too many requests|quota/i.test(message);
  const isTimeout =
    /timeout|timed out|abort/i.test(message) ||
    (error instanceof Error && error.name === 'TimeoutError');
  return { isRateLimit, isTimeout };
}

/** A completed call: the result plus which provider/model actually served it. */
export interface RoutedResult<T> {
  result: T;
  providerId: ProviderId;
  model: string;
}

export interface RouterOptions {
  /** Decrypted API keys, keyed by provider ID. */
  keys: Partial<Record<ProviderId, string>>;
  /** Ordered task routing config; later entries act as fallbacks. */
  routes: TaskRoutingConfig[];
  /** Max attempts per provider before falling through (default 2 on rate limit). */
  maxRetries?: number;
}

interface ResolvedRoute {
  providerId: ProviderId;
  model?: string;
}

/**
 * Routes AI requests to the user's chosen provider per task type, with a
 * fallback chain and rate-limit retries. Keys are decrypted by the caller and
 * are only ever in memory during the call.
 */
export class ProviderRouter {
  private readonly keys: Partial<Record<ProviderId, string>>;
  private readonly routes: TaskRoutingConfig[];
  private readonly maxRetries: number;

  constructor(options: RouterOptions) {
    this.keys = options.keys;
    this.routes = options.routes;
    this.maxRetries = options.maxRetries ?? 2;
  }

  private resolveRoutes(taskType: TaskType): ResolvedRoute[] {
    return [...this.routes]
      .filter((route) => route.taskType === taskType)
      .map((route) => ({
        providerId: route.primaryProviderId,
        model: route.primaryModel ?? undefined,
      }))
      .filter((route) => Boolean(this.keys[route.providerId]));
  }

  private assertRoutes(taskType: TaskType, routes: ResolvedRoute[]): void {
    if (routes.length === 0) {
      throw new ProviderError(
        'none' as ProviderId,
        `No provider configured for task "${taskType}". Add an API key in Settings.`,
      );
    }
  }

  async generateText(
    req: TextGenerationRequest,
    taskType: TaskType,
  ): Promise<RoutedResult<string>> {
    const routes = this.resolveRoutes(taskType);
    this.assertRoutes(taskType, routes);
    return this.executeFallback(
      req,
      routes,
      taskType,
      'generateText',
      async (client, model, r) => (await client.generateText({ ...r, model })).text,
    );
  }

  async analyzeImage(req: VisionRequest, taskType: TaskType): Promise<RoutedResult<string>> {
    const routes = this.resolveRoutes(taskType);
    this.assertRoutes(taskType, routes);
    return this.executeFallback(
      req,
      routes,
      taskType,
      'analyzeImage',
      async (client, model, r) => (await client.analyzeImage({ ...r, model })).text,
    );
  }

  async transcribe(
    req: TranscriptionRequest,
    taskType: TaskType = 'transcription',
  ): Promise<RoutedResult<TranscriptionResult>> {
    const routes = this.resolveRoutes(taskType);
    this.assertRoutes(taskType, routes);
    return this.executeFallback(req, routes, taskType, 'transcribe', (client, model, r) => {
      if (!client.transcribe) {
        throw new ProviderError(client.id, `Provider ${client.id} does not support transcription`);
      }
      return client.transcribe(r);
    });
  }

  private async executeFallback<TReq, TResult>(
    req: TReq,
    routes: ResolvedRoute[],
    taskType: TaskType,
    method: 'generateText' | 'analyzeImage' | 'transcribe',
    run: (client: ProviderClient, model: string | undefined, r: TReq) => Promise<TResult>,
  ): Promise<RoutedResult<TResult>> {
    const requiredCapability = methodToCapability(method);
    let lastError: ProviderError | null = null;

    for (const route of routes) {
      const key = this.keys[route.providerId];
      if (!key) {
        continue;
      }
      const provider = getProvider(route.providerId);
      if (!provider.capabilities.includes(requiredCapability)) {
        lastError = new ProviderError(
          route.providerId,
          `Provider ${route.providerId} cannot handle task "${taskType}"`,
        );
        continue;
      }

      for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
        try {
          const client = provider.createClient(key);
          const result = await run(client, route.model, req);
          return { result, providerId: route.providerId, model: route.model ?? '' };
        } catch (error) {
          const { isRateLimit, isTimeout } = classify(error);
          lastError =
            error instanceof ProviderError
              ? error
              : new ProviderError(route.providerId, messageOf(error), {
                  isRateLimit,
                  isTimeout,
                  cause: error,
                });
          const retryable = isRateLimit || isTimeout;
          if (retryable && attempt < this.maxRetries) {
            await delay(backoffMs(attempt));
            continue;
          }
          break;
        }
      }
    }

    throw (
      lastError ??
      new ProviderError('none' as ProviderId, `No providers were configured for task "${taskType}"`)
    );
  }
}

function methodToCapability(method: string): 'vision' | 'text' | 'transcription' {
  switch (method) {
    case 'analyzeImage':
      return 'vision';
    case 'transcribe':
      return 'transcription';
    default:
      return 'text';
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  return Math.min(500 * 2 ** (attempt - 1), 8_000);
}
