import type { AnatomyState } from './anatomyState';

/** Preset names a camera turn of the ankle model. */
export type Preset = 'anterolateral' | 'medial' | 'posterior' | 'ap' | 'lateral';

const DEG = Math.PI / 180;

/**
 * PRESETS are the model's turns in radians: yaw about the leg's long axis (0 faces the front, 90°
 * the lateral side of this right ankle) and pitch from above. AP and Lateral are level, as the
 * radiographs are taken; the others look slightly down onto the joint.
 */
export const PRESETS: Record<Preset, { yaw: number; pitch: number }> = {
  anterolateral: { yaw: 35 * DEG, pitch: 8 * DEG },
  medial: { yaw: -75 * DEG, pitch: 8 * DEG },
  // Posterolateral: the posterior lip clears the fibula, and the lateral malleolus stays in view.
  posterior: { yaw: 140 * DEG, pitch: 10 * DEG },
  ap: { yaw: 0, pitch: 0 },
  lateral: { yaw: 90 * DEG, pitch: 0 },
};

/** Focus is what the camera follows: the answers, and whether the posterior question is the one being asked. */
export interface Focus {
  state: AnatomyState;
  posteriorAsked: boolean;
}

/**
 * presetFor is the view that best shows what just changed, or undefined to stay put. A first answer
 * that involves several malleoli turns to AP, which shows the lateral and medial sides at once; the
 * posterior view waits until the posterior question is asked or answered, so the camera moves once
 * per step and never back and forth.
 */
export function presetFor(prev: Focus, next: Focus): Preset | undefined {
  const added = (['lateral', 'medial', 'posterior'] as const).filter((key) => next.state[key] && !prev.state[key]);
  if (added.length > 1) return 'ap';
  if (added[0] === 'posterior') return 'posterior';
  if (added[0] === 'medial') return 'medial';
  if (added[0] === 'lateral') return 'anterolateral';
  if (next.state.posteriorType && next.state.posteriorType !== prev.state.posteriorType) return 'posterior';
  if (next.posteriorAsked && !prev.posteriorAsked) return 'posterior';
  if (next.state.fibula && next.state.fibula !== prev.state.fibula) return 'anterolateral';
  return undefined;
}
