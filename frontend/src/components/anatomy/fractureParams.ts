import params from './fractureParams.json';

/** Vec3 is a point or direction in model space, mm. */
export type Vec3 = [number, number, number];

/** Plane is a half-space: points p with dot(p - point, normal) >= 0 are inside; normal is unit length. */
export interface Plane {
  point: Vec3;
  normal: Vec3;
}

/** Move is a translation in mm, then an optional rotation in degrees about an axis through origin. */
export interface Move {
  translate: Vec3;
  rotate?: { axis: Vec3; origin: Vec3; deg: number };
}

/** PieceId names one fragment in fractureParams.json. */
export type PieceId =
  | 'fib_tip_avulsion'
  | 'fib_infra'
  | 'fib_trans_spiral'
  | 'fib_trans_short'
  | 'fib_trans_coronal'
  | 'fib_trans_wedge'
  | 'fib_trans_comm_a'
  | 'fib_trans_comm_b'
  | 'fib_supra'
  | 'fib_supra_wedge'
  | 'fib_supra_far'
  | 'med_transverse'
  | 'med_vertical'
  | 'post_b1'
  | 'post_b2'
  | 'post_b3_pm'
  | 'post_b4'
  | 'post_pm_extraincisural'
  | 'art_depression';

/** Piece is one fragment: the intersection of its planes, cut from its bone. */
export interface Piece {
  id: PieceId;
  bone: 'tibia' | 'fibula';
  planes: Plane[];
  /** Fractal noise amplitude on the cut, mm. */
  noise: number;
  /** Conservative move once the form is complete. */
  move: Move;
  /** 'images' or 'literature', and the cases or reference it comes from. */
  source: string;
}

/** FractureParams is the shape of fractureParams.json. */
export interface FractureParams {
  /** Array order is priority: a cell belongs to the first active piece whose bit it has. */
  pieces: Piece[];
  /** Whole-bone moves when the ankle is unstable. */
  unstable: { talus: Move; fibula: Move };
}

/** fractureParams is fractureParams.json, the one table of every fracture number. */
export const fractureParams = params as FractureParams;

const indexOf = new Map<PieceId, number>();
const perBone = { tibia: 0, fibula: 0 };
for (const p of fractureParams.pieces) indexOf.set(p.id, perBone[p.bone]++);

/** pieceIndex is the piece's position among those of its own bone: its bit in that bone's 16-bit cell mask. */
export const pieceIndex = (id: PieceId): number => indexOf.get(id)!;
