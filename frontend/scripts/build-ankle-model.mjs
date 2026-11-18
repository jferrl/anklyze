// Builds frontend/public/models/ankle/ankle.bin from BodyParts3D 3.0 (see that folder's README.md).
//
//   node scripts/build-ankle-model.mjs [objDir]
//
// Without objDir it fetches the three OBJ files from the BodyParts3D archive with HTTP range
// requests (the archive is 547 MB) and checks their SHA-256 before using them.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync, inflateRawSync } from 'node:zlib';

const ARCHIVE = 'https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/BodyParts3D_3.0_obj_95.zip';
const OUT = new URL('../public/models/ankle/ankle.bin', import.meta.url);

// FMA concept ids of the right-side bones, and the SHA-256 of each OBJ as published.
const SOURCES = {
  tibia: ['FMA24477', 'd2cfed2382f0d92ee3274cc4726eab66ac833a8dd4d24f7bb06d34eca5e7652c'],
  fibula: ['FMA24480', '0ba91890776c95639cdebbe586b00e0c5415aafbea888ac25fc0d4b3316627e0'],
  talus: ['FMA24482', '5c2d64a1b5fbb17373919b994c2fe1ede1629f9164b499fe4c509a9cd75b1cac'],
};

// Region codes stored per vertex; the viewer highlights them from the answers.
const REGION = { none: 0, lateral: 1, medial: 2, posterior: 3 };
const SHAFT_MM = 100; // tibia and fibula are cut this far above the plafond
const STEP_MM = 0.05; // position quantisation
const AO_MM = 7; // occlusion search radius

const objs = process.argv[2] ? readLocal(process.argv[2]) : await fetchArchive();

// BodyParts3D axes: +x patient's left, +y posterior, +z superior, in mm. Viewer axes: +x patient's
// left (medial, for a right ankle), +y superior, +z anterior. (x, y, z) -> (x, z, -y) is a rotation.
const raw = Object.fromEntries(Object.entries(objs).map(([name, text]) => [name, parseObj(text)]));

// The plafond is the lowest point of the tibial vault over the centre of the talar dome.
const talus = bounds(raw.talus.pos);
const dome = [(talus.min[0] + talus.max[0]) / 2, (talus.min[2] + talus.max[2]) / 2];
const plafond = Math.min(...verts(raw.tibia.pos).filter((v) => Math.hypot(v[0] - dome[0], v[2] - dome[1]) < 8).map((v) => v[1]));
const cut = plafond + SHAFT_MM;

const parts = {
  tibia: prepare(clip(raw.tibia, cut, -1)),
  fibula: prepare(clip(raw.fibula, cut, -1)),
  talus: prepare(raw.talus),
};
const occlusion = bakeOcclusion(Object.values(parts));

// Distal tibia landmarks for the regions, measured on the cut tibia. The regions are half-spaces,
// so the viewer can draw their boundaries per pixel; the per-vertex tags place the labels.
const tib = verts(parts.tibia.pos);
const low = tib.filter((v) => v[1] < plafond + 12);
const lowB = bounds(low.flat());
// Snapped to the 0.1 mm the manifest stores, so the tags agree with the planes the viewer draws.
const medialEdge = dome[0] + round(talus.max[0] - 4 - dome[0]); // medial to the medial talar facet
const posteriorEdge = dome[1] + round(lowB.min[2] + (lowB.max[2] - lowB.min[2]) * 0.3 - dome[1]);
const TOP = { lateral: 2, medial: 4, posterior: 12 }; // mm above the plafond

parts.tibia.region = tib.map(([x, y, z]) => {
  if (y < plafond + TOP.medial && x > medialEdge) return REGION.medial;
  if (y < plafond + TOP.posterior && z < posteriorEdge && x <= medialEdge) return REGION.posterior;
  return REGION.none;
});
parts.fibula.region = verts(parts.fibula.pos).map(([, y]) => (y < plafond + TOP.lateral ? REGION.lateral : REGION.none));
parts.talus.region = verts(parts.talus.pos).map(() => REGION.none);

// Top of the syndesmosis: the lowest level above the plafond where the fibula stands clear of the
// tibia by more than 4 mm.
const fib = verts(parts.fibula.pos);
let syndesmosis = plafond + 15;
for (let y = plafond + 15; y < plafond + 60; y += 1) {
  const f = fib.filter((v) => Math.abs(v[1] - y) < 1.5);
  const t = tib.filter((v) => Math.abs(v[1] - y) < 1.5);
  const gap = Math.min(...f.map((a) => Math.min(...t.map((b) => Math.hypot(a[0] - b[0], a[2] - b[2])))));
  syndesmosis = y;
  if (gap > 4) break;
}

// Fibular level bands, as in the drawing: below the plafond, plafond to syndesmosis, syndesmosis
// to 6 cm, and 6 to 8.5 cm above the joint.
const band = (y0, y1) => {
  const f = fib.filter((v) => v[1] >= y0 && v[1] <= y1);
  const c = [avg(f.map((v) => v[0])), avg(f.map((v) => v[2]))];
  const r = Math.max(...f.map((v) => Math.hypot(v[0] - c[0], v[2] - c[1]))) + 3;
  return { y: [round(y0 - plafond), round(y1 - plafond)], center: [round(c[0]), round(c[1])], radius: round(r) };
};
const bands = {
  infra: band(plafond - 14, plafond - 1),
  trans: band(plafond + 1, syndesmosis - 1),
  supra: band(syndesmosis + 1, plafond + 59),
  supra_far: band(plafond + 61, plafond + 85),
};
const top = fib.filter((v) => v[1] > cut - 4);
const proximal = { x: round(avg(top.map((v) => v[0]))), z: round(avg(top.map((v) => v[2]))), y: [SHAFT_MM - 8, SHAFT_MM + 16] };

// Origin at the plafond over the talar dome; quantise into one shared grid.
const origin = [dome[0], plafond, dome[1]];
const all = Object.values(parts).flatMap((p) => verts(p.pos));
// Floored to the 0.1 mm the manifest stores, so decoding lands where encoding started.
const min = [0, 1, 2].map((i) => Math.floor((Math.min(...all.map((v) => v[i])) - origin[i]) * 10) / 10);
const chunks = [];
let offset = 0;
const push = (typed) => {
  const bytes = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const pad = (4 - (bytes.length % 4)) % 4;
  chunks.push(bytes, Buffer.alloc(pad));
  const at = offset;
  offset += bytes.length + pad;
  return at;
};
const manifest = {
  source: 'BodyParts3D 3.0, The Database Center for Life Science; cut, refined and tagged for Anklyze',
  units: 'mm',
  quant: { min: min.map(round), step: STEP_MM },
  plafond: 0,
  syndesmosis: round(syndesmosis - plafond),
  regions: { lateralTop: TOP.lateral, medialTop: TOP.medial, medialX: round(medialEdge - origin[0]), posteriorTop: TOP.posterior, posteriorZ: round(posteriorEdge - origin[2]) },
  bands: Object.fromEntries(Object.entries(bands).map(([k, b]) => [k, { ...b, center: [round(b.center[0] - origin[0]), round(b.center[1] - origin[2])] }])),
  proximal: { ...proximal, x: round(proximal.x - origin[0]), z: round(proximal.z - origin[2]) },
  parts: [],
};
for (const [n, [name, p]] of Object.entries(parts).entries()) {
  const q = new Uint16Array(p.pos.length);
  for (let i = 0; i < q.length; i++) q[i] = Math.round((p.pos[i] - origin[i % 3] - min[i % 3]) / STEP_MM);
  manifest.parts.push({
    name,
    vertices: q.length / 3,
    triangles: p.index.length / 3,
    position: push(q),
    index: push(Uint16Array.from(p.index)),
    region: push(Uint8Array.from(p.region)),
    occlusion: push(occlusion[n]),
  });
}
const json = Buffer.from(JSON.stringify(manifest));
const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(4);
header.writeUInt32LE(jsonPadded.length);
const file = Buffer.concat([header, jsonPadded, ...chunks]);

const gz = gzipSync(file, { level: 9 }).length;
const count = (name, r) => parts[name].region.filter((x) => x === r).length;
for (const p of manifest.parts) console.log(`${p.name}: ${p.vertices} vertices, ${p.triangles} triangles`);
console.log(`regions: lateral ${count('fibula', REGION.lateral)}, medial ${count('tibia', REGION.medial)}, posterior ${count('tibia', REGION.posterior)}`);
console.log(`syndesmosis ${manifest.syndesmosis} mm above the plafond; bands`, JSON.stringify(manifest.bands));
console.log(`ankle.bin ${file.length} bytes, ${gz} gzipped`);

// Self-check: every region exists, the syndesmosis is plausible, and the asset stays small.
check(count('fibula', REGION.lateral) > 20, 'lateral region empty');
check(count('tibia', REGION.medial) > 20, 'medial region empty');
check(count('tibia', REGION.posterior) > 20, 'posterior region empty');
check(manifest.syndesmosis > 10 && manifest.syndesmosis < 50, `syndesmosis at ${manifest.syndesmosis} mm`);
check(gz <= 400 * 1024, `asset is ${gz} bytes gzipped`);
check(Math.max(...Object.values(parts).map((p) => p.pos.length / 3)) < 65536, 'a part outgrew 16-bit indices');

mkdirSync(new URL('.', OUT), { recursive: true });
writeFileSync(OUT, file);

function readLocal(dir) {
  return Object.fromEntries(
    Object.entries(SOURCES).map(([name, [fma, sha]]) => {
      const buf = readFileSync(`${dir}/${fma}.obj`);
      checkHash(fma, buf, sha);
      return [name, buf.toString('utf8')];
    }),
  );
}

async function fetchArchive() {
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const range = async (a, b) => {
    const r = await fetch(ARCHIVE, { headers: { ...headers, Range: `bytes=${a}-${b}` } });
    if (r.status !== 206) throw new Error(`range request failed: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  };
  const size = Number((await fetch(ARCHIVE, { method: 'HEAD', headers })).headers.get('content-length'));
  const tail = await range(size - 65536, size - 1);
  const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  const cdOff = tail.readUInt32LE(eocd + 16);
  const cd = await range(cdOff, cdOff + tail.readUInt32LE(eocd + 12) - 1);
  const out = {};
  for (let p = 0; p < cd.length && cd.readUInt32LE(p) === 0x02014b50; ) {
    const nlen = cd.readUInt16LE(p + 28);
    const name = cd.toString('utf8', p + 46, p + 46 + nlen);
    const [method, csize, lho] = [cd.readUInt16LE(p + 10), cd.readUInt32LE(p + 20), cd.readUInt32LE(p + 42)];
    p += 46 + nlen + cd.readUInt16LE(p + 30) + cd.readUInt16LE(p + 32);
    const hit = Object.entries(SOURCES).find(([, [fma]]) => name.endsWith(`${fma}.obj`));
    if (!hit) continue;
    const lh = await range(lho, lho + 29);
    const start = lho + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28);
    const data = await range(start, start + csize - 1);
    const buf = method === 8 ? inflateRawSync(data) : data;
    checkHash(hit[1][0], buf, hit[1][1]);
    out[hit[0]] = buf.toString('utf8');
  }
  if (Object.keys(out).length !== Object.keys(SOURCES).length) throw new Error('archive is missing a bone');
  return out;
}

function checkHash(fma, buf, sha) {
  const got = createHash('sha256').update(buf).digest('hex');
  if (got !== sha) throw new Error(`${fma}.obj: SHA-256 ${got}, expected ${sha}`);
}

function parseObj(text) {
  const pos = [];
  const index = [];
  const vn = [];
  for (const line of text.split('\n')) {
    const [tag, ...rest] = line.trim().split(/\s+/);
    if (tag === 'v') {
      const [x, y, z] = rest.map(Number);
      pos.push(x, z, -y);
    } else if (tag === 'vn') {
      const [x, y, z] = rest.map(Number);
      vn.push(x, z, -y);
    } else if (tag === 'f') {
      const ids = rest.map((r) => Number(r.split('/')[0]) - 1);
      for (let i = 1; i + 1 < ids.length; i++) index.push(ids[0], ids[i], ids[i + 1]);
    }
  }
  // Wind triangles counter-clockwise seen from outside, as WebGL expects; the file's normals say which side is out.
  let agree = 0;
  for (let t = 0; t < index.length; t += 3) agree += Math.sign(dot(faceNormal(pos, index, t), vn.slice(index[t] * 3, index[t] * 3 + 3)));
  if (agree < 0) for (let t = 0; t < index.length; t += 3) [index[t + 1], index[t + 2]] = [index[t + 2], index[t + 1]];
  return { pos, index };
}

// Keeps the side of the plane y = level given by keep (-1 below, 1 above); new vertices are shared per cut edge.
function clip({ pos, index }, level, keep) {
  const out = { pos: [...pos], index: [], level };
  const side = (i) => (pos[i * 3 + 1] - level) * keep >= 0;
  const cutAt = new Map();
  const cutVertex = (a, b) => {
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (!cutAt.has(key)) {
      const t = (level - pos[a * 3 + 1]) / (pos[b * 3 + 1] - pos[a * 3 + 1]);
      out.pos.push(...[0, 1, 2].map((k) => pos[a * 3 + k] + (pos[b * 3 + k] - pos[a * 3 + k]) * t));
      cutAt.set(key, out.pos.length / 3 - 1);
    }
    return cutAt.get(key);
  };
  for (let t = 0; t < index.length; t += 3) {
    const tri = index.slice(t, t + 3);
    const poly = [];
    tri.forEach((a, k) => {
      const b = tri[(k + 1) % 3];
      if (side(a)) poly.push(a);
      if (side(a) !== side(b)) poly.push(cutVertex(a, b));
    });
    for (let k = 1; k + 1 < poly.length; k++) out.index.push(poly[0], poly[k], poly[k + 1]);
  }
  return out;
}

// Refines the 95%-reduced source with one Loop subdivision step, so the bone shades smooth
// rather than faceted, then closes each open rim with a fan of separate vertices so the cut face
// shades flat.
function prepare({ pos, index, level }) {
  // Drop the vertices the clip left unused.
  const keep = [...new Set(index)];
  const to = new Map(keep.map((v, i) => [v, i]));
  const used = keep.flatMap((v) => [pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]]);
  const { pos: p, index: idx } = loopSubdivide(...fillHoles(used, index.map((v) => to.get(v)), level));

  // Each open edge a->b on the cut plane runs along the rim; the cap walks it the other way.
  const onCut = (v) => level !== undefined && Math.abs(p[v * 3 + 1] - level) < 0.01;
  const next = new Map([...openEdges(idx)].filter(([a, b]) => onCut(a) && onCut(b)).map(([a, b]) => [b, a]));
  while (next.size) {
    const [start] = next.keys();
    const loop = [start];
    for (let v = next.get(start); v !== start && v !== undefined && loop.length < 10000; v = next.get(v)) loop.push(v);
    loop.forEach((v) => next.delete(v));
    if (loop.length < 3) continue;
    const c = [0, 1, 2].map((k) => avg(loop.map((v) => p[v * 3 + k])));
    const base = p.length / 3;
    p.push(...c, ...loop.flatMap((v) => [p[v * 3], p[v * 3 + 1], p[v * 3 + 2]]));
    loop.forEach((_, i) => idx.push(base, base + 1 + i, base + 1 + ((i + 1) % loop.length)));
  }
  return { pos: p, index: idx };
}

// The source meshes have small holes (on the talus they read as dark pits, the inside showing
// through). Each open loop off the cut plane is closed with a fan round its centroid, on shared
// vertices, so the subdivision step that follows smooths the patch into the surface.
function fillHoles(pos, index, level) {
  const p = [...pos];
  const idx = [...index];
  const next = new Map();
  for (const [a, b] of openEdges(idx)) next.set(b, a);
  const onCut = (v) => level !== undefined && Math.abs(p[v * 3 + 1] - level) < 0.01;
  let holes = 0;
  while (next.size) {
    const [start] = next.keys();
    const loop = [start];
    for (let v = next.get(start); v !== start && v !== undefined && loop.length < 10000; v = next.get(v)) loop.push(v);
    loop.forEach((v) => next.delete(v));
    if (loop.length < 3 || loop.every(onCut)) continue;
    const c = p.length / 3;
    p.push(...[0, 1, 2].map((k) => avg(loop.map((v) => p[v * 3 + k]))));
    loop.forEach((v, i) => idx.push(c, v, loop[(i + 1) % loop.length]));
    holes++;
  }
  if (holes) console.log(`filled ${holes} holes`);
  return [p, idx];
}

function openEdges(idx) {
  const edges = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const [a, b] = [idx[t + k], idx[t + ((k + 1) % 3)]];
      const rev = `${b}:${a}`;
      if (edges.has(rev)) edges.delete(rev);
      else edges.set(`${a}:${b}`, [a, b]);
    }
  }
  return edges.values();
}

// One Loop subdivision step. Open edges (the cut rims) use the boundary rules, so a rim stays on
// its cut plane.
function loopSubdivide(pos, index) {
  const n = pos.length / 3;
  const edges = new Map();
  const key = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  for (let t = 0; t < index.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const [a, b, c] = [index[t + k], index[t + ((k + 1) % 3)], index[t + ((k + 2) % 3)]];
      const e = edges.get(key(a, b)) ?? { a, b, opp: [] };
      e.opp.push(c);
      edges.set(key(a, b), e);
    }
  }
  const out = [];
  const at = (v, k) => pos[v * 3 + k];
  const ring = Array.from({ length: n }, () => new Set());
  const rim = Array.from({ length: n }, () => []);
  for (const e of edges.values()) {
    ring[e.a].add(e.b);
    ring[e.b].add(e.a);
    if (e.opp.length !== 2) rim[e.a].push(e.b), rim[e.b].push(e.a);
  }
  for (let v = 0; v < n; v++) {
    const [r, m] = [rim[v], [...ring[v]]];
    for (let k = 0; k < 3; k++) {
      if (r.length === 2) out.push(0.75 * at(v, k) + 0.125 * (at(r[0], k) + at(r[1], k)));
      else if (r.length) out.push(at(v, k));
      else {
        const beta = m.length > 3 ? 3 / (8 * m.length) : 3 / 16;
        out.push((1 - m.length * beta) * at(v, k) + beta * m.reduce((sum, u) => sum + at(u, k), 0));
      }
    }
  }
  for (const e of edges.values()) {
    e.id = out.length / 3;
    for (let k = 0; k < 3; k++) {
      const mid = at(e.a, k) + at(e.b, k);
      out.push(e.opp.length === 2 ? 0.375 * mid + 0.125 * (at(e.opp[0], k) + at(e.opp[1], k)) : 0.5 * mid);
    }
  }
  const idx = [];
  for (let t = 0; t < index.length; t += 3) {
    const [a, b, c] = index.slice(t, t + 3);
    const [ab, bc, ca] = [key(a, b), key(b, c), key(c, a)].map((k) => edges.get(k).id);
    idx.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
  }
  return { pos: out, index: idx };
}


// Per-vertex ambient occlusion, 0 open to 255 enclosed: the share of nearby surface, on every bone,
// that lies in front of the vertex's normal. Creases and the joint spaces darken; flats and crests
// stay open. A point-based approximation, cheap enough to need no ray tracing.
function bakeOcclusion(list) {
  const all = [];
  for (const p of list) {
    const normals = vertexNormals(p.pos, p.index);
    for (let i = 0; i < p.pos.length; i += 3) all.push([p.pos[i], p.pos[i + 1], p.pos[i + 2], ...normals.slice(i, i + 3)]);
  }
  const cell = (x) => Math.floor(x / AO_MM);
  const grid = new Map();
  for (const v of all) {
    const k = `${cell(v[0])},${cell(v[1])},${cell(v[2])}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(v);
  }
  let i = 0;
  return list.map((p) => {
    const out = new Uint8Array(p.pos.length / 3);
    for (let j = 0; j < out.length; j++, i++) {
      const [x, y, z, nx, ny, nz] = all[i];
      let [hit, total] = [0, 0];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        for (const u of grid.get(`${cell(x) + a},${cell(y) + b},${cell(z) + c}`) ?? []) {
          const d = [u[0] - x, u[1] - y, u[2] - z];
          const len = Math.hypot(...d);
          if (len < 0.3 || len > AO_MM) continue;
          const w = 1 - len / AO_MM;
          hit += w * Math.max(0, (d[0] * nx + d[1] * ny + d[2] * nz) / len);
          total += w;
        }
      }
      out[j] = Math.round(255 * Math.min(1, total ? (2 * hit) / total : 0));
    }
    return out;
  });
}

function vertexNormals(pos, index) {
  const n = new Float64Array(pos.length);
  for (let t = 0; t < index.length; t += 3) {
    const f = faceNormal(pos, index, t);
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) n[index[t + k] * 3 + c] += f[c];
  }
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    n[i] /= l;
    n[i + 1] /= l;
    n[i + 2] /= l;
  }
  return Array.from(n);
}

function verts(pos) {
  const v = [];
  for (let i = 0; i < pos.length; i += 3) v.push([pos[i], pos[i + 1], pos[i + 2]]);
  return v;
}
function bounds(pos) {
  const v = verts(pos);
  return { min: [0, 1, 2].map((i) => Math.min(...v.map((p) => p[i]))), max: [0, 1, 2].map((i) => Math.max(...v.map((p) => p[i]))) };
}
function faceNormal(pos, index, t) {
  const [a, b, c] = [0, 1, 2].map((k) => pos.slice(index[t + k] * 3, index[t + k] * 3 + 3));
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  return [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function avg(xs) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function round(x) {
  return Math.round(x * 10) / 10;
}
function check(ok, message) {
  if (!ok) throw new Error(`build-ankle-model: ${message}`);
}
