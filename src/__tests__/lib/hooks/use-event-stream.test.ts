import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useEventStream } from '@/lib/hooks/use-event-stream';

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  close() {
    this.closed = true;
  }

  emitOpen() {
    this.onopen?.();
  }

  emitMessage(data: string) {
    this.onmessage?.({ data });
  }

  emitError() {
    this.onerror?.();
  }
}

describe('useEventStream', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('starts connecting and transitions to open', async () => {
    const { result } = renderHook(() => useEventStream<{ id: number }>('/api/stream'));
    expect(result.current.status).toBe('connecting');

    act(() => {
      MockEventSource.instances[0].emitOpen();
    });
    expect(result.current.status).toBe('open');
  });

  it('parses incoming event payloads', async () => {
    const { result } = renderHook(() => useEventStream<{ id: number }>('/api/stream'));
    act(() => {
      MockEventSource.instances[0].emitMessage('{"id":42}');
    });
    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 42 });
    });
  });

  it('closes the connection on unmount', () => {
    const { unmount } = renderHook(() => useEventStream('/api/stream'));
    const source = MockEventSource.instances[0];
    unmount();
    expect(source.closed).toBe(true);
  });

  it('close() closes the stream and sets status to closed', () => {
    const { result } = renderHook(() => useEventStream('/api/stream'));
    act(() => {
      result.current.close();
    });
    expect(MockEventSource.instances[0].closed).toBe(true);
    expect(result.current.status).toBe('closed');
  });

  it('marks error after repeated failures exceed the retry budget', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEventStream('/api/stream'));
    for (let i = 0; i < 4; i += 1) {
      const source = MockEventSource.instances.at(-1);
      act(() => {
        source?.emitError();
      });
      act(() => vi.advanceTimersByTime(5000));
    }
    expect(result.current.status).toBe('error');
  });
});
