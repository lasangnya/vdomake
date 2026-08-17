'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type EventStreamStatus = 'connecting' | 'open' | 'closed' | 'error';

export interface EventStreamState<T> {
  data: T | null;
  status: EventStreamStatus;
  close: () => void;
}

/**
 * Consumes a Server-Sent Events stream and surfaces the latest parsed event
 * payload. Auto-reconnects on unexpected disconnects (with backoff) and
 * cleans up on unmount.
 */
export function useEventStream<T>(url: string, options?: { onError?: (error: unknown) => void }) {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<EventStreamStatus>('connecting');
  const sourceRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(0);
  const urlRef = useRef(url);
  const onErrorRef = useRef(options?.onError);

  useEffect(() => {
    urlRef.current = url;
  }, [url]);

  useEffect(() => {
    onErrorRef.current = options?.onError;
  }, [options?.onError]);

  const close = useCallback(() => {
    retryRef.current = 0;
    sourceRef.current?.close();
    sourceRef.current = null;
    setStatus('closed');
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      const source = new EventSource(urlRef.current);
      sourceRef.current = source;
      setStatus('connecting');

      source.onopen = () => {
        retryRef.current = 0;
        if (!disposed) setStatus('open');
      };

      source.onmessage = (event) => {
        if (disposed) return;
        try {
          setData(JSON.parse(event.data) as T);
        } catch (error) {
          onErrorRef.current?.(error);
        }
      };

      source.onerror = () => {
        source.close();
        if (disposed) return;
        retryRef.current += 1;
        if (retryRef.current > 3) {
          setStatus('error');
          onErrorRef.current?.(new Error('Event stream failed after 3 reconnect attempts'));
          return;
        }
        setStatus('connecting');
        reconnectTimer.current = window.setTimeout(connect, 500 * 2 ** (retryRef.current - 1));
      };
    };

    const reconnectTimer: { current: number | null } = { current: null };
    connect();

    return () => {
      disposed = true;
      if (reconnectTimer.current !== null) {
        window.clearTimeout(reconnectTimer.current);
      }
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [url]);

  return { data, status, close };
}
