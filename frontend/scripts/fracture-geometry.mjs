// Cuts a closed bone mesh into fracture fragments along noisy planes (see fractureParams.json).
// A point p is inside a plane when dot(p - point, normal) >= 0; a piece is the intersection of its planes.
import { ShapeUtils, Vector2 } from 'three';

/** @typedef {{ pos: number[], index: number[] }} Mesh */

const PERIOSTEAL = 0xffff;
const WAVELENGTH_MM = 6;
const RIM_MM = 2;

// Integer lattice hash to [-1, 1].
function lattice(x, y, z, seed) {
  let h = Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 0x7fffffff - 1;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

// Value noise in [-1, 1] with a period of one lattice cell.
function valueNoise(x, y, z, seed) {
  const [ix, iy, iz] = [Math.floor(x), Math.floor(y), Math.floor(z)];
  const [u, v, w] = [fade(x - ix), fade(y - iy), fade(z - iz)];
  const c = (dx, dy, dz) => lattice(ix + dx, iy + dy, iz + dz, seed);
  return lerp(
    lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
    lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

/**
 * noisyPlane returns dot(p - point, normal) + noise * fbm(p) / 1.75, with fbm = sum over octaves o = 0..2 of
 * 2^-o * valueNoise(p * 2^o / 6 mm, seed + o * 0x9e3779b9 mod 2^32) (quintic-faded lattice hash); cutBone seeds with FNV-1a of `${piece.id}:${planeIndex}`.
 */
export function noisyPlane({ point, normal }, noise, seed) {
  return (p) => {
    let n = 0;
    for (let o = 0, f = 1 / WAVELENGTH_MM, a = 1; o < 3; o++, f *= 2, a /= 2) n += a * valueNoise(p[0] * f, p[1] * f, p[2] * f, (seed + o * 0x9e3779b9) >>> 0);
    return (p[0] - point[0]) * normal[0] + (p[1] - point[1]) * normal[1] + (p[2] - point[2]) * normal[2] + (noise * n) / 1.75;
  };
}

const vert = (pos, i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];

// Splits triangles in place on the shared pool `pos`; `cuts` keeps one cut point per edge so every
// cell split by the same surface gets the same seam.
function splitTris(pos, index, label, sdf, val, cuts) {
  const f = (i) => (val[i] ??= sdf(vert(pos, i)));
  const cut = (a, b) => {
    if (a > b) [a, b] = [b, a];
    const key = a * 0x4000000 + b;
    if (!cuts.has(key)) {
      let [lo, hi, flo, fhi] = [vert(pos, a), vert(pos, b), f(a), f(b)];
      for (let s = 0; s < 12; s++) {
        const m = lo.map((x, k) => (x + hi[k]) / 2);
        const fm = sdf(m);
        if (fm >= 0 === flo >= 0) [lo, flo] = [m, fm];
        else [hi, fhi] = [m, fm];
      }
      const t = flo / (flo - fhi);
      pos.push(...lo.map((x, k) => x + (hi[k] - x) * t));
      cuts.set(key, pos.length / 3 - 1);
    }
    return cuts.get(key);
  };
  const out = { inside: [], outside: [], inLabel: [], outLabel: [] };
  for (let t = 0; t < index.length; t += 3) {
    const tri = index.slice(t, t + 3);
    const side = tri.map((v) => f(v) >= 0);
    for (const keep of [true, false]) {
      const poly = [];
      tri.forEach((a, k) => {
        const b = (k + 1) % 3;
        if (side[k] === keep) poly.push(a);
        if (side[k] !== side[b]) poly.push(cut(a, tri[b]));
      });
      // Fan from the lowest id so a cut face and its reversed twin pick the same diagonal.
      const r = poly.indexOf(Math.min(...poly));
      const p = [...poly.slice(r), ...poly.slice(0, r)];
      const [idx, lab] = keep ? [out.inside, out.inLabel] : [out.outside, out.outLabel];
      for (let k = 1; k + 1 < p.length; k++) idx.push(p[0], p[k], p[k + 1]), lab.push(label[t / 3]);
    }
  }
  return out;
}

// Open edges as a multiset: counted, not set-tested, because the bone meshes carry a few duplicated edges.
function openEdges(index) {
  const count = new Map();
  for (let t = 0; t < index.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const [a, b] = [index[t + k], index[t + ((k + 1) % 3)]];
      const rev = `${b}:${a}`;
      if (count.get(rev) > 0) count.set(rev, count.get(rev) - 1);
      else count.set(`${a}:${b}`, (count.get(`${a}:${b}`) ?? 0) + 1);
    }
  }
  return count;
}

// Loops walked against the open edges, so a fan in loop order closes each. A vertex may have
// several successors; a single-successor walk can spin forever on them.
function walkLoops(count) {
  const next = new Map();
  for (const [e, n] of count) {
    const [a, b] = e.split(':').map(Number);
    for (let i = 0; i < n; i++) next.set(b, [...(next.get(b) ?? []), a]);
  }
  const take = (v) => {
    const out = next.get(v);
    const w = out?.pop();
    if (out && !out.length) next.delete(v);
    return w;
  };
  const loops = [];
  while (next.size) {
    const [start] = next.keys();
    const loop = [start];
    let v = take(start);
    while (v !== start && v !== undefined) loop.push(v), (v = take(v));
    if (v === start && loop.length >= 3) loops.push(loop);
  }
  return loops;
}

const rimLoops = (index) => walkLoops(openEdges(index));

/** split cuts a closed mesh by sdf into inside (sdf >= 0) and outside halves on one vertex pool, with the inside half's rim loops. */
export function split(mesh, sdf) {
  const pos = [...mesh.pos];
  const { inside, outside } = splitTris(pos, mesh.index, [], sdf, [], new Map());
  return { inside: { pos, index: inside }, outside: { pos, index: outside }, rim: rimLoops(inside) };
}

/** cap closes a rim loop with earcut on the plane normal to normalHint; triangles follow the loop's winding. Relief inside the cap is left to the shader. */
export function cap(pos, rimLoop, sdf, normalHint) {
  const n = normalHint;
  const seed = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const u = cross(n, seed);
  const ul = Math.hypot(...u);
  u.forEach((_, k) => (u[k] /= ul));
  const w = cross(n, u);
  const flat = (i) => {
    const p = vert(pos, i);
    return new Vector2(p[0] * u[0] + p[1] * u[1] + p[2] * u[2], p[0] * w[0] + p[1] * w[1] + p[2] * w[2]);
  };
  // Moves the fallback fan's centre along the hint onto sdf = 0: widen a bracket until it changes sign, then bisect.
  const project = (p) => {
    const at = (t) => sdf(p.map((x, k) => x + n[k] * t));
    let r = Math.abs(at(0)) + 0.1;
    while (at(-r) >= 0 === at(r) >= 0 && r < 1e3) r *= 2;
    let [lo, hi] = [-r, r];
    const loIn = at(lo) >= 0;
    for (let s = 0; s < 40; s++) {
      const m = (lo + hi) / 2;
      if (at(m) >= 0 === loIn) lo = m;
      else hi = m;
    }
    return p.map((x, k) => x + n[k] * (lo + hi) / 2);
  };
  const L = rimLoop.length;
  const contour = rimLoop.map(flat);
  const area = ShapeUtils.area(contour);
  // Earcut winds every triangle alike; decide the flip once, as a sliver's own area sign is noise.
  let ears = ShapeUtils.triangulateShape(contour, []);
  if (ears.reduce((s, t) => s + ShapeUtils.area(t.map((i) => contour[i])), 0) * area < 0) ears = ears.map(([a, b, c]) => [a, c, b]);
  // Earcut drops collinear and repeated points; fan each edge that skips them from its opposite corner.
  const used = new Set(ears.flat());
  const fill = (t) => {
    for (let e = 0; e < 3; e++) {
      const [i, j, o] = [t[e], t[(e + 1) % 3], t[(e + 2) % 3]];
      const gap = [];
      for (let s = (i + 1) % L; s !== j && !used.has(s); s = (s + 1) % L) gap.push(s);
      if (!gap.length || (i + gap.length + 1) % L !== j) continue;
      gap.forEach((s) => used.add(s));
      const chain = [i, ...gap, j];
      return chain.slice(1).flatMap((s, q) => fill([chain[q], s, o]));
    }
    return [t];
  };
  const loopTris = ears.flatMap(fill);
  // The cap's open edges must be exactly the loop; earcut can also leave an interior triangle out.
  const open = openEdges(loopTris.flat());
  const whole = rimLoop.every((_, i) => {
    const e = `${i}:${(i + 1) % L}`;
    return open.get(e) > 0 && open.set(e, open.get(e) - 1);
  });
  const tris = [];
  if (whole) {
    const holes = walkLoops(open).flatMap((h) => h.slice(2).map((v, i) => [h[0], h[i + 1], v]));
    for (const t of [...loopTris, ...holes]) tris.push(...t.map((i) => rimLoop[i]));
  } else {
    // Earcut gave up (a sliver or self-touching loop): a fan still closes the cell.
    const c = pos.push(...project([0, 1, 2].map((k) => rimLoop.reduce((s, v) => s + pos[v * 3 + k], 0) / L))) / 3 - 1;
    rimLoop.forEach((v, i) => tris.push(c, v, rimLoop[(i + 1) % L]));
  }

  return tris;
}

// FNV-1a, so a piece's noise depends only on its id and plane.
function hash(s) {
  let h = 0x811c9dc5;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return h >>> 0;
}

/** cutBone splits a closed mesh by every piece's planes and returns one closed cell per piece mask. */
export function cutBone(mesh, pieces) {
  const planes = pieces.flatMap((piece, k) =>
    piece.planes.map((pl, j) => ({ piece: k, local: j, normal: pl.normal, sdf: noisyPlane(pl, piece.noise, hash(`${piece.id}:${j}`)) })),
  );
  const pos = [...mesh.pos];
  // label per triangle: -1 periosteal, else the plane whose cut face it is.
  let cells = [{ mask: 0, index: mesh.index, label: mesh.index.filter((_, i) => i % 3 === 0).map(() => -1) }];
  // Cells are merged after each piece, not at the end, so a plane's faces outside its piece are
  // dropped before later planes cut them again. Later planes split both sides of a kept face
  // alike, so the cell across it differs only in that face's piece bit.
  pieces.forEach((_, k) => {
    let parts = cells.map((c) => ({ ...c, sign: 0 }));
    planes.forEach(({ piece, local, sdf, normal }, g) => {
      if (piece !== k) return;
      const val = [];
      const cuts = new Map();
      parts = parts.flatMap((part) => {
        const s = splitTris(pos, part.index, part.label, sdf, val, cuts);
        const capIn = [];
        if (s.inside.length && s.outside.length) for (const loop of rimLoops(s.inside)) for (const v of cap(pos, loop, sdf, normal)) capIn.push(v);
        const capOut = [];
        for (let t = 0; t < capIn.length; t += 3) capOut.push(capIn[t], capIn[t + 2], capIn[t + 1]);
        const tag = capIn.filter((_, i) => i % 3 === 0).map(() => g);
        return [
          { mask: part.mask, sign: part.sign | (1 << local), index: [...s.inside, ...capIn], label: [...s.inLabel, ...tag] },
          { mask: part.mask, sign: part.sign, index: [...s.outside, ...capOut], label: [...s.outLabel, ...tag] },
        ].filter((c) => c.index.length);
      });
    });
    const full = (1 << pieces[k].planes.length) - 1;
    const merged = new Map();
    for (const { mask: before, sign, index, label } of parts) {
      const inPiece = sign === full;
      const mask = before | (inPiece ? 1 << k : 0);
      if (!merged.has(mask)) merged.set(mask, { mask, index: [], label: [] });
      const m = merged.get(mask);
      label.forEach((g, t) => {
        if (g >= 0 && planes[g].piece === k && ((sign ^ (1 << planes[g].local)) === full) === inPiece) return;
        m.index.push(index[t * 3], index[t * 3 + 1], index[t * 3 + 2]);
        m.label.push(g);
      });
    }
    cells = [...merged.values()];
  });
  return cells
    .sort((a, b) => a.mask - b.mask)
    .map(({ mask, index, label }) => cell(pos, mask, index, label.map((g) => (g < 0 ? PERIOSTEAL : mask ^ (1 << planes[g].piece)))));
}

// Compacts a cell's vertices and rates each by distance to the crack edge (where periosteum meets a cut face).
function cell(pos, mask, index, face) {
  const keep = [...new Set(index)];
  const to = new Map(keep.map((v, i) => [v, i]));
  const p = keep.flatMap((v) => vert(pos, v));
  const periosteal = new Set();
  const cutFace = new Set();
  face.forEach((f, t) => [0, 1, 2].forEach((k) => (f === PERIOSTEAL ? periosteal : cutFace).add(to.get(index[t * 3 + k]))));
  const edge = [...periosteal].filter((v) => cutFace.has(v)).map((v) => vert(p, v));
  // shortcut: brute-force nearest edge vertex, O(vertices x edge vertices); use a grid if builds get slow.
  const rim = keep.map((_, i) => {
    const q = vert(p, i);
    let d = RIM_MM * RIM_MM;
    for (const e of edge) d = Math.min(d, (q[0] - e[0]) ** 2 + (q[1] - e[1]) ** 2 + (q[2] - e[2]) ** 2);
    return Math.sqrt(d) / RIM_MM;
  });
  return { mask, mesh: { pos: p, index: index.map((v) => to.get(v)) }, face, rim };
}
