export type TransitionType = 'fade' | 'slide' | 'zoom' | 'morph' | 'wipe' | 'dissolve';
export type TransitionEasing = 'smooth' | 'spring' | 'linear';
export type CameraType = 'static' | 'pan' | 'zoom-to' | 'ken-burns';

export interface TextOverlay {
  id: string;
  text: string;
  position: {
    x: number;
    y: number;
  };
  fontSize: number;
  fontFamily?: string;
  color: string;
  fontWeight?: number;
  maxWidth?: number;
}

export interface Scene {
  id: string;
  order: number;
  screenshotId: string;
  title: string;
  description: string;
  duration: number;
  transition: {
    type: TransitionType;
    duration: number;
    easing: TransitionEasing;
  };
  camera: {
    type: CameraType;
    target?: {
      x: number;
      y: number;
      scale: number;
    };
  };
  overlays: TextOverlay[];
}

export interface Storyboard {
  id: string;
  projectId: string;
  scenes: Scene[];
  version: number;
  status: 'draft' | 'finalized';
  createdAt: string;
  updatedAt: string;
}
