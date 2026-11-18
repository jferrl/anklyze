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

/**
 * presetFor is the view that best shows what an answer newly involves, or undefined when nothing
 * new is involved. One answer can involve several malleoli at once, so one view must serve: the
 * posterior malleolus wins, as it is the only one hidden from the front; lateral with medial takes
 * AP, which shows both; the lateral malleolus or a fibular level takes anterolateral.
 */
export function presetFor(prev: AnatomyState, next: AnatomyState): Preset | undefined {
  const added = (key: 'lateral' | 'medial' | 'posterior') => next[key] && !prev[key];
  const fibula = !!next.fibula && next.fibula !== prev.fibula;
  if (added('posterior')) return 'posterior';
  if (added('medial')) return next.lateral || next.fibula ? 'ap' : 'medial';
  if (added('lateral') || fibula) return 'anterolateral';
  return undefined;
}
