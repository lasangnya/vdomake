import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useTimelineStore } from '@/stores/timeline-store';
import { PlaybackControls } from '@/components/timeline/playback-controls';

describe('PlaybackControls', () => {
  beforeEach(() => {
    useTimelineStore.setState({
      clips: [],
      duration: 30,
      playhead: 0,
      isPlaying: false,
      playbackSpeed: 1,
      zoom: 1,
    });
  });

  it('toggles playback', () => {
    render(<PlaybackControls />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(useTimelineStore.getState().isPlaying).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(useTimelineStore.getState().isPlaying).toBe(false);
  });

  it('skips the playhead forward and backward', () => {
    render(<PlaybackControls />);
    fireEvent.click(screen.getByRole('button', { name: '⏭' }));
    expect(useTimelineStore.getState().playhead).toBe(5);
    fireEvent.click(screen.getByRole('button', { name: '⏮' }));
    fireEvent.click(screen.getByRole('button', { name: '⏮' }));
    expect(useTimelineStore.getState().playhead).toBe(0);
  });

  it('changes the playback speed', () => {
    render(<PlaybackControls />);
    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    expect(useTimelineStore.getState().playbackSpeed).toBe(2);
  });

  it('scrubs via the slider', () => {
    render(<PlaybackControls />);
    const slider = screen.getByRole('slider', { name: /timeline playhead/i });
    fireEvent.change(slider, { target: { value: '12.5' } });
    expect(useTimelineStore.getState().playhead).toBe(12.5);
    expect(useTimelineStore.getState().isPlaying).toBe(false);
  });
});
