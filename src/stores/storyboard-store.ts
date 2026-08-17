import { create } from 'zustand';
import type { Scene, Storyboard } from '@/types/scene';

interface StoryboardState {
  storyboard: Storyboard | null;
  setStoryboard: (storyboard: Storyboard) => void;
  /** Reorders scenes by their ids — used by the drag-and-drop grid. */
  reorderScenes: (orderedIds: string[]) => void;
  updateScene: (sceneId: string, patch: Partial<Scene>) => void;
  addScene: (scene: Scene) => void;
  removeScene: (sceneId: string) => void;
}

export const useStoryboardStore = create<StoryboardState>((set) => ({
  storyboard: null,
  setStoryboard: (storyboard) => set({ storyboard }),
  reorderScenes: (orderedIds) =>
    set((state) => {
      const storyboard = state.storyboard;
      if (!storyboard) return state;
      const byId = new Map(storyboard.scenes.map((scene) => [scene.id, scene]));
      const scenes = orderedIds
        .map((id, index) => {
          const scene = byId.get(id);
          return scene ? { ...scene, order: index } : null;
        })
        .filter((scene): scene is Scene => scene !== null);
      return { storyboard: { ...storyboard, scenes } };
    }),
  updateScene: (sceneId, patch) =>
    set((state) => {
      const storyboard = state.storyboard;
      if (!storyboard) return state;
      return {
        storyboard: {
          ...storyboard,
          scenes: storyboard.scenes.map((scene) =>
            scene.id === sceneId ? { ...scene, ...patch } : scene,
          ),
        },
      };
    }),
  addScene: (scene) =>
    set((state) => {
      const storyboard = state.storyboard;
      if (!storyboard) return state;
      return { storyboard: { ...storyboard, scenes: [...storyboard.scenes, scene] } };
    }),
  removeScene: (sceneId) =>
    set((state) => {
      const storyboard = state.storyboard;
      if (!storyboard) return state;
      return {
        storyboard: {
          ...storyboard,
          scenes: storyboard.scenes
            .filter((scene) => scene.id !== sceneId)
            .map((scene, index) => ({ ...scene, order: index })),
        },
      };
    }),
}));
