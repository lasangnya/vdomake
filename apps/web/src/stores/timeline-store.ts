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
  setDuration: (duration) => set({ duration }),
  setPlayhead: (playhead) => set({ playhead }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setZoom: (zoom) => set({ zoom }),
}));
