import type { AnatomyState } from './anatomyState';
import { fractureParams, type Move, type PieceId } from './fractureParams';

/** FracturePose is the active fragments, in params order, and how each moves once the form is complete. */
export interface FracturePose {
  pieces: PieceId[];
  moves: Partial<Record<PieceId | 'talus' | 'fibula', Move>>;
}

/** fracturePose maps answers to pieces; a structure whose level or type is unanswered draws nothing. */
export function fracturePose(state: AnatomyState): FracturePose {
  const active = new Set([...fibulaPieces(state), ...medialPieces(state), ...posteriorPieces(state)]);
  if (state.articularDepression) active.add('art_depression');
  const pieces = fractureParams.pieces.filter((p) => active.has(p.id));
  const moves: FracturePose['moves'] = {};
  if (!state.complete) return { pieces: pieces.map((p) => p.id), moves };
  for (const p of pieces) moves[p.id] = p.move;
  const fibulaLoose = state.fibula === 'supra' || state.fibula === 'supra_far' || state.fibula === 'proximal' ||
    state.lateralSubtype === 'syndesmosis_rupture';
  const malleoli = [state.lateral || !!state.fibula, state.medial, state.posterior].filter(Boolean).length;
  if (malleoli >= 2 || fibulaLoose || state.medialSubtype === 'open_mortise') moves.talus = fractureParams.unstable.talus;
  if (fibulaLoose) moves.fibula = fractureParams.unstable.fibula;
  return { pieces: pieces.map((p) => p.id), moves };
}

function fibulaPieces(s: AnatomyState): PieceId[] {
  switch (s.fibula) {
    case 'infra':
      return [s.infraMorphology === 'avulsion' ? 'fib_tip_avulsion' : 'fib_infra'];
    case 'trans': {
      const main: PieceId[] = {
        oblique: ['fib_trans_coronal'],
        transverse: ['fib_trans_short'],
        conminuta: ['fib_trans_spiral', 'fib_trans_comm_a', 'fib_trans_comm_b'],
        spiral: ['fib_trans_spiral'],
      }[s.lateralMorphology ?? 'spiral'] as PieceId[];
      const wedge = s.traceCount === 'multiple' || s.lateralSubtype === 'butterfly';
      return wedge ? [...main, 'fib_trans_wedge'] : main;
    }
    case 'supra':
      if (s.suprasindesmalType === 'simple_diaphyseal') return ['fib_supra'];
      return s.suprasindesmalType === 'multifragmentary' ? ['fib_supra', 'fib_supra_wedge'] : [];
    case 'supra_far':
      return ['fib_supra_far'];
  }
  return [];
}

function medialPieces(s: AnatomyState): PieceId[] {
  if (!s.medial || s.medialSubtype === 'open_mortise') return [];
  const only = !s.lateral && !s.fibula && !s.posterior;
  if (s.medialMorphology === 'vertical') return ['med_vertical'];
  if (s.medialMorphology === 'transverse_oblique' || s.medialSubtype === 'malleolus_fracture') return ['med_transverse'];
  if (only && s.articularInvolvement === 'large_with_extension') return ['med_vertical'];
  if (only && s.articularInvolvement === 'small_without_extension') return ['med_transverse'];
  return [];
}

function posteriorPieces(s: AnatomyState): PieceId[] {
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
  return [];
}

/** fragmentOf is the first active piece whose bit is in mask, or -1 for the main body. */
export function fragmentOf(mask: number, active: number[]): number {
  return active.find((i) => (mask >> i) & 1) ?? -1;
}

/** cutShown: a cut face shows only when the cells on its two sides are in different fragments. */
export function cutShown(mask: number, neighbor: number, active: number[]): boolean {
  return fragmentOf(mask, active) !== fragmentOf(neighbor, active);
}
