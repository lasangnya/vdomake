import { describe, it, expect, beforeEach } from 'vitest';
import { useTimelineStore, type TimelineClip } from '@/stores/timeline-store';

const baseClip: TimelineClip = {
  id: 'scene-1',
  track: 'video',
  start: 0,
  end: 3,
};

describe('timeline-store', () => {
  beforeEach(() => {
    useTimelineStore.setState({
      clips: [],
      duration: 0,
      playhead: 0,
      isPlaying: false,
      playbackSpeed: 1,
      zoom: 1,
    });
  });

  it('upserts and removes clips', () => {
    const store = useTimelineStore.getState();
    store.upsertClip(baseClip);
    store.upsertClip({ ...baseClip, id: 'scene-2', start: 3, end: 6 });
    expect(useTimelineStore.getState().clips).toHaveLength(2);

    useTimelineStore.getState().removeClip('scene-1');
    expect(useTimelineStore.getState().clips.map((c) => c.id)).toEqual(['scene-2']);
  });

  it('trims a clip to new bounds and clamps start to 0', () => {
    useTimelineStore.getState().upsertClip(baseClip);
    useTimelineStore.getState().trimClip('scene-1', 0.5, 2.5);
    expect(useTimelineStore.getState().clips[0]).toMatchObject({ start: 0.5, end: 2.5 });

    useTimelineStore.getState().trimClip('scene-1', -1, 2);
    expect(useTimelineStore.getState().clips[0].start).toBe(0);
  });

  it('extends a clip via trim beyond the original end', () => {
    useTimelineStore.getState().upsertClip(baseClip);
    useTimelineStore.getState().trimClip('scene-1', 0, 5);
    expect(useTimelineStore.getState().clips[0].end).toBe(5);
  });

  it('splits a clip into two contiguous pieces', () => {
    useTimelineStore.getState().upsertClip(baseClip);
    useTimelineStore.getState().splitClip('scene-1', 1.5);
    const clips = useTimelineStore.getState().clips;
    expect(clips).toHaveLength(2);
    expect(clips[0]).toMatchObject({ start: 0, end: 1.5 });
    expect(clips[1]).toMatchObject({ start: 1.5, end: 3 });
  });

  it('ignores a split at the clip boundaries', () => {
    useTimelineStore.getState().upsertClip(baseClip);
    useTimelineStore.getState().splitClip('scene-1', 0);
    useTimelineStore.getState().splitClip('scene-1', 3);
    expect(useTimelineStore.getState().clips).toHaveLength(1);
  });

  it('moves a clip by a delta and clamps to 0', () => {
    useTimelineStore.getState().upsertClip(baseClip);
    useTimelineStore.getState().moveClip('scene-1', 2);
    expect(useTimelineStore.getState().clips[0]).toMatchObject({ start: 2, end: 5 });

    useTimelineStore.getState().moveClip('scene-1', -10);
    expect(useTimelineStore.getState().clips[0].start).toBe(0);
  });

  it('keeps playback state setters isolated', () => {
    const store = useTimelineStore.getState();
    store.setPlayhead(2.5);
    store.setPlaybackSpeed(2);
    store.setIsPlaying(true);
    store.setZoom(2);
    expect(useTimelineStore.getState()).toMatchObject({
      playhead: 2.5,
      playbackSpeed: 2,
      isPlaying: true,
      zoom: 2,
    });
  });
});
