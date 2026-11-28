/** FragmentName is the plain name a fracture piece or bone is shown under, an anatomy.fragments key. */
export type FragmentName =
  | 'tipAvulsion'
  | 'distalFibula'
  | 'butterfly'
  | 'comminuted'
  | 'depression'
  | 'medial'
  | 'posterior'
  | 'posteromedial'
  | 'tibia'
  | 'fibula'
  | 'talus';

/** fragmentName names a piece id from fractureParams, or a bone, by what a clinician calls it. */
export function fragmentName(id: string): FragmentName {
  if (id === 'tibia' || id === 'fibula' || id === 'talus') return id;
  if (id === 'fib_tip_avulsion') return 'tipAvulsion';
  if (id.endsWith('_wedge')) return 'butterfly';
  if (id.startsWith('fib_trans_comm')) return 'comminuted';
  if (id.startsWith('fib_')) return 'distalFibula';
  if (id === 'art_depression') return 'depression';
  if (id.startsWith('med_')) return 'medial';
  if (id === 'post_b3_pm' || id === 'post_pm_extraincisural') return 'posteromedial';
  return 'posterior';
}
