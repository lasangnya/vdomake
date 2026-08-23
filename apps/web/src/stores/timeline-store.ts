import { create } from 'zustand';

export interface TimelineClip {
  id: string;
  track: 'video' | 'voiceover' | 'music' | 'text';
  start: number;
  end: number;
  sourceId?: string;
  volume?: number;
}

interface TimelineState {
  clips: TimelineClip[];
  duration: number;
  playhead: number;
  isPlaying: boolean;
  playbackSpeed: number;
  zoom: number;
  setClips: (clips: TimelineClip[]) => void;
  upsertClip: (clip: TimelineClip) => void;
  removeClip: (id: string) => void;
  /** Bounds a clip to a new start/end (trim or extend). */
  trimClip: (id: string, start: number, end: number) => void;
  /** Splits a clip at a time, producing a second clip on the same track. */
  splitClip: (id: string, atTime: number) => void;
  /** Shifts a clip by a delta (seconds). */
  moveClip: (id: string, delta: number) => void;
  setDuration: (duration: number) => void;
  setPlayhead: (playhead: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setZoom: (zoom: number) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  clips: [],
  duration: 0,
  playhead: 0,
  isPlaying: false,
  playbackSpeed: 1,
  zoom: 1,
  setClips: (clips) => set({ clips }),
  upsertClip: (clip) =>
    set((state) => {
      const exists = state.clips.some((c) => c.id === clip.id);
      return {
        clips: exists
          ? state.clips.map((c) => (c.id === clip.id ? clip : c))
          : [...state.clips, clip],
      };
    }),
  removeClip: (id) => set((state) => ({ clips: state.clips.filter((c) => c.id !== id) })),
  trimClip: (id, start, end) =>
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === id ? { ...c, start: Math.max(0, start), end: Math.max(start + 0.1, end) } : c,
      ),
    })),
  splitClip: (id, atTime) =>
    set((state) => {
      const clip = state.clips.find((c) => c.id === id);
      if (!clip || atTime <= clip.start || atTime >= clip.end) return state;
      const right: TimelineClip = {
        ...clip,
        id: `${clip.id}-${atTime.toFixed(2)}`,
        start: atTime,
      };
      return {
        clips: [...state.clips.filter((c) => c.id !== id), { ...clip, end: atTime }, right],
      };
    }),
  moveClip: (id, delta) =>
    set((state) => ({
      clips: state.clips.map((c) =>
        c.id === id ? { ...c, start: Math.max(0, c.start + delta), end: c.end + delta } : c,
      ),
    })),
  setDuration: (duration) => set({ duration }),
  setPlayhead: (playhead) => set({ playhead }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setZoom: (zoom) => set({ zoom }),
}));
