import type { PosteriorFractureType } from '@/types';
import type { AnatomyState } from './anatomyState';
import type { PieceId } from './fractureParams';

// Kept apart from fracturePose so the figure's captions do not pull the fracture table into the page chunk.

/** posteriorPieces is the posterior fragments the pose draws for the answers. */
export function posteriorPieces(s: AnatomyState): PieceId[] {
  if (!s.posterior) return [];
  switch (s.posteriorType) {
    case 'extraincisural':
      return ['post_b1'];
    case 'posterolateral':
      return ['post_b2'];
    case 'posteromedial_posterolateral':
      return ['post_b2', 'post_b3_pm'];
    case 'large_posterolateral':
      return ['post_b4'];
    case 'extraincisural_posteromedial':
      return ['post_pm_extraincisural'];
  }
  if (s.posteriorPosteromedial) return ['post_pm_extraincisural'];
  const only = !s.lateral && !s.fibula && !s.medial;
  if (only && s.articularInvolvement === 'large_with_extension') return ['post_b4'];
  if (only && s.articularInvolvement === 'small_without_extension') return ['post_b1'];
  // Paths without CT never ask the Bartonicek type; draw the generic fragment then.
  return s.complete ? ['post_b2'] : [];
}

const DRAWN_POSTERIOR: [PieceId[], PosteriorFractureType][] = [
  [['post_b2', 'post_b3_pm'], 'posteromedial_posterolateral'],
  [['post_b1'], 'extraincisural'],
  [['post_b2'], 'posterolateral'],
  [['post_b4'], 'large_posterolateral'],
  [['post_pm_extraincisural'], 'extraincisural_posteromedial'],
];

/** drawnPosteriorType is the Bartonicek type of the posterior fragment the pose draws, which may come from articular involvement or a default. */
export function drawnPosteriorType(state: AnatomyState): PosteriorFractureType | undefined {
  const pieces = posteriorPieces(state);
  return DRAWN_POSTERIOR.find(([ids]) => ids.every((id) => pieces.includes(id)))?.[1];
}
