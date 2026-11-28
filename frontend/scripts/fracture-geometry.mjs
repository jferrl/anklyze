// Cuts a closed bone mesh into fracture fragments along noisy planes (see fractureParams.json).
// A point p is inside a plane when dot(p - point, normal) >= 0; a piece is the intersection of its planes.
import { ShapeUtils, Vector2 } from 'three';

/** @typedef {{ pos: number[], index: number[] }} Mesh */

const PERIOSTEAL = 0xffff;
const WAVELENGTH_MM = 6;
const INSET_MM = 1.5; // cap ring width
const RING_STEP_MM = 1; // inner ring point spacing
const SMOOTH_MM = 0.5; // rim normal read over this much arc each way
const SKIP_MM = 0.3; // rim within this arc of a point is its own jag, not the far side
const UNTANGLE = 8; // inner points searched ahead for a swallowtail
const REPAIR_PASSES = 10;
const STEP_MM = 0.05; // fractures.bin quantisation; a thinner ring would collapse

// Integer lattice hash to [-1, 1].
function lattice(x, y, z, seed) {
  let h = Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f) ^ seed;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (((h ^ (h >>> 15)) >>> 0) / 0xffffffff) * 2 - 1;
}

const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;

// Value noise in [-1, 1] on the unit lattice.
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
// cell split by the same surface gets the same seam. `attr` (per vertex, optional) is interpolated along periosteal edges.
function splitTris(pos, index, label, sdf, val, cuts, attr = []) {
  const f = (i) => (val[i] ??= sdf(vert(pos, i)));
  const cut = (a, b, periosteal) => {
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
    const c = cuts.get(key);
    if (periosteal && attr[c] === undefined && attr[a] !== undefined && attr[b] !== undefined) {
      const [pa, pb, pc] = [vert(pos, a), vert(pos, b), vert(pos, c)];
      const along = pa.reduce((s, x, k) => s + (pc[k] - x) * (pb[k] - x), 0) / pa.reduce((s, x, k) => s + (pb[k] - x) ** 2, 0);
      attr[c] = attr[a] + (attr[b] - attr[a]) * along;
    }
    return c;
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
        if (side[k] !== side[b]) poly.push(cut(a, tri[b], !(label[t / 3] >= 0)));
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

/**
 * cap closes a rim loop on the plane normal to normalHint: an inset ring, then earcut of the inner loop; triangles follow the
 * loop's winding. inner lists the vertices off the crack edge (rim = 1): the inner loop, or the whole cap when the ring is skipped.
 */
export function cap(pos, rimLoop, sdf, normalHint) {
  const n = normalHint;
  const seed = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const u = cross(n, seed);
  const ul = Math.hypot(...u);
  u.forEach((_, k) => (u[k] /= ul));
  const w = cross(n, u);
  const wl = Math.hypot(...w);
  w.forEach((_, k) => (w[k] /= wl));
  const flat = (i) => {
    const p = vert(pos, i);
    return new Vector2(p[0] * u[0] + p[1] * u[1] + p[2] * u[2], p[0] * w[0] + p[1] * w[1] + p[2] * w[2]);
  };
  // Moves a point along the hint onto sdf = 0: widen a bracket until it changes sign, then bisect.
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
  const fill = (loop) => {
    const L = loop.length;
    const contour = loop.map(flat);
    const area = ShapeUtils.area(contour);
    // Earcut winds every triangle alike; decide the flip once, as a sliver's own area sign is noise.
    // triangulateShape may drop a repeated end point from contour in place; the area above is taken first.
    let ears = ShapeUtils.triangulateShape(contour, []);
    if (ears.reduce((s, t) => s + ShapeUtils.area(t.map((i) => contour[i])), 0) * area < 0) ears = ears.map(([a, b, c]) => [a, c, b]);
    // Earcut drops collinear and repeated points; fan each edge that skips them from its opposite corner.
    const used = new Set(ears.flat());
    const gapFill = (t) => {
      for (let e = 0; e < 3; e++) {
        const [i, j, o] = [t[e], t[(e + 1) % 3], t[(e + 2) % 3]];
        const gap = [];
        for (let s = (i + 1) % L; s !== j && !used.has(s); s = (s + 1) % L) gap.push(s);
        if (!gap.length || (i + gap.length + 1) % L !== j) continue;
        gap.forEach((s) => used.add(s));
        const chain = [i, ...gap, j];
        return chain.slice(1).flatMap((s, q) => gapFill([chain[q], s, o]));
      }
      return [t];
    };
    const loopTris = ears.flatMap(gapFill);
    // The cap's open edges must be exactly the loop; earcut can also leave an interior triangle out.
    const open = openEdges(loopTris.flat());
    const whole = loop.every((_, i) => {
      const e = `${i}:${(i + 1) % L}`;
      return open.get(e) > 0 && open.set(e, open.get(e) - 1);
    });
    if (whole) {
      const holes = walkLoops(open).flatMap((h) => h.slice(2).map((v, i) => [h[0], h[i + 1], v]));
      return { tris: [...loopTris, ...holes].flatMap((t) => t.map((i) => loop[i])), centre: [] };
    }
    // Earcut gave up (a sliver or self-touching loop): a fan still closes the cell.
    const c = pos.push(...project([0, 1, 2].map((k) => loop.reduce((s, v) => s + pos[v * 3 + k], 0) / L))) / 3 - 1;
    return { tris: loop.flatMap((v, i) => [c, v, loop[(i + 1) % L]]), centre: [c] };
  };

  const ring = insetRing(rimLoop.map(flat));
  if (!ring) {
    const { tris, centre } = fill(rimLoop);
    return { tris, inner: [...new Set(rimLoop), ...centre] };
  }
  const inner = ring.map(({ at, off: [du, dw] }) => {
    const p = vert(pos, rimLoop[at]).map((x, k) => x + du * u[k] + dw * w[k]);
    return pos.push(...project(p)) / 3 - 1;
  });
  const { tris, centre } = fill(inner);
  const [L, M] = [rimLoop.length, ring.length];
  // Each inner point fans its run of outer points, then a transition triangle hands over to the next.
  ring.forEach(({ at }, k) => {
    const end = runEnd(ring, k, L);
    for (let j = at; j < end; j++) tris.push(rimLoop[j % L], rimLoop[(j + 1) % L], inner[k]);
    tris.push(rimLoop[end % L], inner[(k + 1) % M], inner[k]);
  });
  return { tris, inner: [...inner, ...centre] };
}

// Plans the inset ring in the cap plane: one inner point per ~RING_STEP_MM of rim, moved inward along the
// smoothed normal by min(1.5 mm, 0.3 x local half-width), skipping points where that is under two quantisation
// steps. Null when it would fold: fewer than three points, a flipped inner loop, or crossing edges.
function insetRing(c) {
  const L = c.length;
  const area = ShapeUtils.area(c);
  if (L < 3 || !area) return null;
  const s = Math.sign(area);
  const arc = [0];
  for (let i = 1; i <= L; i++) arc.push(arc[i - 1] + c[i - 1].distanceTo(c[i % L]));
  const per = arc[L];
  // Circular arc distance; cut loops carry micro-edges down to 1e-7 mm, so local shape is read over arc, not over neighbours.
  const along = (i, j) => Math.min(Math.abs(arc[i] - arc[j]), per - Math.abs(arc[i] - arc[j]));
  const reach = (i, dir) => {
    let j = i;
    for (let n = 0; n < L / 2 && along(i, j) < SMOOTH_MM; n++) j = (j + dir + L) % L;
    return c[j];
  };
  let ring = [];
  for (let i = 0; i < L; i++) {
    if (ring.length && arc[i] - arc[ring.at(-1).at] < RING_STEP_MM) continue;
    if (per - arc[i] < RING_STEP_MM / 2 && ring.length) break;
    const [back, fwd] = [reach(i, -1), reach(i, 1)];
    const [tx, ty] = [fwd.x - back.x, fwd.y - back.y];
    const tl = Math.hypot(tx, ty);
    if (!tl) return null;
    const dir = [(-ty * s) / tl, (tx * s) / tl];
    let width = Infinity;
    for (let j = 0; j < L; j++) {
      const k = (j + 1) % L;
      if (along(i, j) < SKIP_MM || along(i, k) < SKIP_MM) continue;
      const t = rayHit(c[i], dir, c[j], c[k]);
      if (t > 0) width = Math.min(width, t);
    }
    const d = Math.min(INSET_MM, 0.3 * (width / 2));
    // Too thin to inset here; a neighbouring run's fan covers it, and the crossing test below vets that.
    if (!(d >= 2 * STEP_MM)) continue;
    ring.push({ at: i, off: [dir[0] * d, dir[1] * d] });
  }
  // Concave corners fold the offset into a swallowtail: drop the inner points between two crossing inner edges.
  const inner = (k) => new Vector2(c[ring[k].at].x + ring[k].off[0], c[ring[k].at].y + ring[k].off[1]);
  for (let k = 0; k + 2 < ring.length; k++) {
    for (let m = Math.min(k + UNTANGLE, ring.length - 2); m >= k + 2; m--) {
      if (crosses({ a: inner(k), b: inner(k + 1) }, { a: inner(m), b: inner(m + 1) })) {
        ring.splice(k + 1, m - k);
        k = Math.max(-1, k - UNTANGLE);
        break;
      }
    }
  }
  const outer = [];
  for (let i = 0; i < L; i++) outer.push({ a: c[i], b: c[(i + 1) % L], o: [i, (i + 1) % L], n: [] });
  const shares = (x, y) => x.o.some((u) => y.o.some((v) => along(u, v) < SKIP_MM)) || x.n.some((v) => y.n.includes(v));
  // Drop the inner points behind every crossing and look again; a ring that will not settle is skipped.
  for (let pass = 0; pass < REPAIR_PASSES; pass++) {
    const M = ring.length;
    if (M < 3) return null;
    const q = ring.map((_, k) => inner(k));
    if (Math.sign(ShapeUtils.area(q)) !== s) return null;
    // Segments tagged by the outer (o) and inner (n) points they touch. Pairs sharing an inner point, or
    // with outer ends within SKIP_MM of arc (the same jag), may meet.
    const segs = [...outer];
    ring.forEach(({ at }, k) => {
      segs.push({ a: q[k], b: q[(k + 1) % M], o: [], n: [k, (k + 1) % M] });
      for (let j = at; j <= runEnd(ring, k, L); j++) segs.push({ a: c[j % L], b: q[k], o: [j % L], n: [k] });
    });
    const bad = new Set();
    // shortcut: O((2L + M)^2) pairs with a bbox reject, fine for loops of a few hundred points; use a grid if loops grow.
    for (let x = 0; x < segs.length; x++) {
      for (let y = Math.max(x + 1, L); y < segs.length; y++) {
        if (!shares(segs[x], segs[y]) && crosses(segs[x], segs[y])) bad.add(Math.max(...segs[x].n, ...segs[y].n));
      }
    }
    if (!bad.size) return ring;
    ring = ring.filter((_, k) => !bad.has(k));
  }
  return null;
}

// The outer index where inner point k's run ends; the last run wraps past the loop start.
const runEnd = (ring, k, L) => (k + 1 < ring.length ? ring[k + 1].at : ring[0].at + L);

// Distance along a unit ray from p to segment ab, or -1.
function rayHit(p, d, a, b) {
  const [ex, ey] = [b.x - a.x, b.y - a.y];
  const den = d[0] * ey - d[1] * ex;
  if (!den) return -1;
  const [wx, wy] = [a.x - p.x, a.y - p.y];
  const t = (wx * ey - wy * ex) / den;
  const v = (wx * d[1] - wy * d[0]) / den;
  return v >= 0 && v <= 1 ? t : -1;
}

// Proper or touching intersection of two segments.
function crosses({ a, b }, { a: c, b: d }) {
  if (Math.max(a.x, b.x) < Math.min(c.x, d.x) || Math.max(c.x, d.x) < Math.min(a.x, b.x)) return false;
  if (Math.max(a.y, b.y) < Math.min(c.y, d.y) || Math.max(c.y, d.y) < Math.min(a.y, b.y)) return false;
  const o = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  const [o1, o2, o3, o4] = [o(a, b, c), o(a, b, d), o(c, d, a), o(c, d, b)];
  return o1 !== o2 && o3 !== o4;
}

// FNV-1a, so a piece's noise depends only on its id and plane.
function hash(s) {
  let h = 0x811c9dc5;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return h >>> 0;
}

/**
 * cutBone splits a closed mesh by every piece's planes and returns one closed cell per piece mask. An optional
 * mesh.attr (one number per vertex) comes back per cell vertex, interpolated on the periosteum and null off it.
 */
export function cutBone(mesh, pieces) {
  const planes = pieces.flatMap((piece, k) =>
    piece.planes.map((pl, j) => ({ piece: k, local: j, normal: pl.normal, sdf: noisyPlane(pl, piece.noise, hash(`${piece.id}:${j}`)) })),
  );
  const pos = [...mesh.pos];
  const interior = new Set();
  const attr = mesh.attr ? [...mesh.attr] : [];
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
        const s = splitTris(pos, part.index, part.label, sdf, val, cuts, attr);
        const capIn = [];
        if (s.inside.length && s.outside.length) {
          for (const loop of rimLoops(s.inside)) {
            const c = cap(pos, loop, sdf, normal);
            for (const v of c.tris) capIn.push(v);
            for (const v of c.inner) interior.add(v);
          }
        }
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
    .map(({ mask, index, label }) => cell(pos, mask, index, label.map((g) => (g < 0 ? PERIOSTEAL : mask ^ (1 << planes[g].piece))), interior, attr));
}

// Compacts a cell's vertices; rim is 1 inside a kept cut face's ring (or on a ringless cap), else 0.
function cell(pos, mask, index, face, interior, attr) {
  const keep = [...new Set(index)];
  const to = new Map(keep.map((v, i) => [v, i]));
  const onCut = new Set(index.filter((_, i) => face[Math.floor(i / 3)] !== PERIOSTEAL));
  const rim = keep.map((v) => (interior.has(v) && onCut.has(v) ? 1 : 0));
  return { mask, mesh: { pos: keep.flatMap((v) => vert(pos, v)), index: index.map((v) => to.get(v)) }, face, rim, attr: keep.map((v) => attr[v] ?? null) };
}
