import { logger } from '@vdomake/logger';

export interface SSEStream {
  stream: ReadableStream<Uint8Array>;
  send: (event: string, data: unknown) => void;
  close: () => void;
}

const encoder = new TextEncoder();
const HEARTBEAT_MS = 15_000;

/**
 * Creates a Server-Sent Events stream usable directly as a `Response` body:
 *
 *   export async function GET() {
 *     const { stream, send, close } = createSSEStream();
 *     // ... send('progress', { pct: 50 })
 *     return new Response(stream, {
 *       headers: {
 *         'Content-Type': 'text/event-stream',
 *         'Cache-Control': 'no-cache, no-transform',
 *         Connection: 'keep-alive',
 *       },
 *     });
 *   }
 */
export function createSSEStream(): SSEStream {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let heartbeat: NodeJS.Timeout | null = null;
  let closed = false;

  const stopHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      heartbeat = setInterval(() => {
        try {
          controller?.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          stopHeartbeat();
        }
      }, HEARTBEAT_MS);
    },
    cancel() {
      stopHeartbeat();
      closed = true;
    },
  });

  function send(event: string, data: unknown): void {
    if (closed || !controller) return;
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(payload));
    } catch (error) {
      logger.warn({ error }, 'Failed to write to SSE stream');
    }
  }

  function close(): void {
    if (closed) return;
    closed = true;
    stopHeartbeat();
    try {
      controller?.close();
    } catch {
      // Stream already closed by the consumer.
    }
  }

  return { stream, send, close };
}
