import type { AnatomyState, FibulaMark } from './anatomyState';

/** Marks is what the figure draws for a set of answers; display only, from AnatomyState. */
export interface Marks {
  /** The lateral malleolus region; its top is the level ring when the fracture is at the malleolus. */
  lateral: boolean;
  /** Where the lateral region ends upwards: the default malleolus top, or an infra/trans level. */
  lateralTop?: 'infra' | 'trans';
  medial: boolean;
  posterior: boolean;
  /** A fibular level band above the malleolus. */
  band?: Extract<FibulaMark, 'supra' | 'supra_far'>;
  /** The proximal-fibula arrow. */
  proximal: boolean;
  /** Whether the fibular level is in question, so the syndesmosis is labelled for reference. */
  syndesmosis: boolean;
}

/**
 * marksFor draws one lesion per fibula. A fracture at the malleolus (infra or trans) is one region
 * whose upper edge is the level; a fracture above it (supra, or proximal) marks only the level and
 * leaves the malleolus itself unmarked, as anatomyState already does for proximal.
 */
export function marksFor(state: AnatomyState): Marks {
  const f = state.fibula;
  const atMalleolus = f === 'infra' || f === 'trans';
  return {
    lateral: state.lateral && (!f || atMalleolus),
    lateralTop: atMalleolus ? f : undefined,
    medial: state.medial,
    posterior: state.posterior,
    band: f === 'supra' || f === 'supra_far' ? f : undefined,
    proximal: f === 'proximal',
    syndesmosis: state.lateral || !!f,
  };
}
