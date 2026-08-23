import type { Scene } from '@/types/scene';

export type TransitionKind = Scene['transition']['type'];

const EASING_IMPORT: Record<Scene['transition']['easing'], string> = {
  smooth: 'easeInOutCubic',
  spring: 'easeOutBack',
  linear: 'linear',
};

export interface TransitionSnippet {
  kind: TransitionKind;
  /** Statements appended to the scene generator to animate the screenshot in. */
  inCode: string;
  /** Extra imports required by the snippet (from '@motion-canvas/core'). */
  extraCoreImports: string[];
}

/**
 * Builds the Motion Canvas animation statements that bring a screenshot into
 * the scene. Each returns a snippet of generator code — pure string output,
 * so it can be unit-tested without a browser.
 */
export function transitionIn(
  imgRef: string,
  transition: Scene['transition'],
  durationScale = 1,
): TransitionSnippet {
  const easing = EASING_IMPORT[transition.easing];
  const dur = (transition.duration * durationScale).toFixed(2);

  switch (transition.type) {
    case 'slide': {
      return {
        kind: 'slide',
        inCode: `yield* ${imgRef}().position.x(0, ${dur}, ${easing});`,
        extraCoreImports: [],
      };
    }
    case 'zoom': {
      return {
        kind: 'zoom',
        inCode: `yield* all(${imgRef}().scale(1, ${dur}, ${easing}), ${imgRef}().opacity(1, ${dur}, ${easing}));`,
        extraCoreImports: ['all'],
      };
    }
    case 'wipe':
    case 'dissolve': {
      // Approximate wipe/dissolve as a fade from black for robustness.
      return {
        kind: transition.type,
        inCode: `yield* ${imgRef}().opacity(1, ${dur}, ${easing});`,
        extraCoreImports: [],
      };
    }
    case 'morph': {
      return {
        kind: 'morph',
        inCode: `yield* all(${imgRef}().opacity(1, ${dur}, ${easing}), ${imgRef}().scale(1, ${dur}, ${easing}));`,
        extraCoreImports: ['all'],
      };
    }
    default: {
      return {
        kind: 'fade',
        inCode: `yield* ${imgRef}().opacity(1, ${dur}, ${easing});`,
        extraCoreImports: [],
      };
    }
  }
}

/** Pre-scene declarations: set the screenshot opacity/position for its transition. */
export function initialTransitionState(imgRef: string, transition: Scene['transition']): string[] {
  switch (transition.type) {
    case 'slide':
      return [`${imgRef}().position.x(() => 1000)`];
    case 'zoom':
    case 'morph':
      return [`${imgRef}().scale(0.85)`, `${imgRef}().opacity(0)`];
    case 'wipe':
    case 'dissolve':
      return [`${imgRef}().opacity(0)`];
    default:
      return [`${imgRef}().opacity(0)`];
  }
}

/** Camera movement statements for the scene's duration. */
export function cameraMove(
  imgRef: string,
  camera: Scene['camera'],
  duration: number,
): { code: string; imports: string[] } {
  const easing = 'linear';
  const dur = duration.toFixed(2);
  if (camera.type === 'static') {
    return { code: `yield* ${imgRef}().rotation(0, 0);`, imports: [] };
  }
  if (camera.type === 'pan') {
    return {
      code: `yield* ${imgRef}().position.x(${imgRef}().position.x() - 120, ${dur}, ${easing});`,
      imports: [],
    };
  }
  // zoom-to / ken-burns: continuous slow zoom (ken-burns) or to a target scale.
  if (camera.type === 'ken-burns') {
    return {
      code: `yield* ${imgRef}().scale(1.08, ${dur}, ${easing});`,
      imports: [],
    };
  }
  const scale = camera.target?.scale?.toFixed(2) ?? '1.2';
  return {
    code: `yield* ${imgRef}().scale(${scale}, ${dur}, ${easing});`,
    imports: [],
  };
}
