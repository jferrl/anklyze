// Builds frontend/public/models/ankle/fractures.bin: the tibia and fibula of ankle.bin cut into one cell per
// combination of fracture pieces (fractureParams.json). Same container as ankle.bin (see that folder's README.md).
//
//   node scripts/build-fracture-model.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { cutBone } from './fracture-geometry.mjs';

const ANKLE = new URL('../public/models/ankle/ankle.bin', import.meta.url);
const OUT = new URL('../public/models/ankle/fractures.bin', import.meta.url);
const PARAMS = new URL('../src/components/anatomy/fractureParams.json', import.meta.url);
const STEP_MM = 0.05; // same grid as ankle.bin, so uncut surface lands exactly on the whole bone
const CUT_OCCLUSION = 90; // of 255: fresh fracture faces sit in the crack, darker than open bone
const PERIOSTEAL = 0xffff;

const { pieces } = JSON.parse(readFileSync(PARAMS, 'utf8'));

// Decode ankle.bin as parseAnkleModel does.
const buffer = new Uint8Array(readFileSync(ANKLE)).buffer;
const jsonLength = new DataView(buffer).getUint32(0, true);
const source = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, jsonLength)));
const base = 4 + jsonLength;
const { min } = source.quant;
check(source.quant.step === STEP_MM, `ankle.bin step is ${source.quant.step}`);

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
const manifest = { version: 1, quant: { min, step: STEP_MM }, pieces: pieces.map((p) => p.id), cells: [] };

for (const bone of ['fibula', 'tibia']) {
  const part = source.parts.find((p) => p.name === bone);
  const q = new Uint16Array(buffer, base + part.position, part.vertices * 3);
  const occ = new Uint8Array(buffer, base + part.occlusion, part.vertices);
  const index = new Uint16Array(buffer, base + part.index, part.triangles * 3);
  // Weld by quantised position: ankle.bin's cap fans use their own vertices, so the raw mesh is open.
  const weld = new Map();
  const pos = [];
  const attr = [];
  const to = Array.from({ length: part.vertices }, (_, v) => {
    const key = `${q[v * 3]},${q[v * 3 + 1]},${q[v * 3 + 2]}`;
    if (!weld.has(key)) {
      weld.set(key, pos.length / 3);
      for (let k = 0; k < 3; k++) pos.push(min[k] + q[v * 3 + k] * STEP_MM);
      attr.push(occ[v]);
    }
    return weld.get(key);
  });
  const own = pieces.filter((p) => p.bone === bone);
  const t0 = performance.now();
  const cells = cutBone({ pos, index: Array.from(index, (v) => to[v]), attr }, own);
  console.log(`${bone}: ${weld.size} welded vertices, ${cells.length} cells in ${Math.round(performance.now() - t0)} ms`);

  const cutTris = own.map(() => 0);
  for (const c of cells) {
    const vertices = c.mesh.pos.length / 3;
    check(vertices < 65536, `${bone} cell ${c.mask} has ${vertices} vertices`);
    check(openEdgeCount(c.mesh.index) === 0, `${bone} cell ${c.mask} is open`);
    const qf = c.mesh.pos.map((x, i) => Math.round((x - min[i % 3]) / STEP_MM));
    check(qf.every((x) => x >= 0 && x < 65536), `${bone} cell ${c.mask} leaves the quantisation grid`);
    const qp = Uint16Array.from(qf);
    c.face.forEach((f, t) => f !== PERIOSTEAL && own.forEach((_, k) => (c.mask & (1 << k) && !(f & (1 << k)) ? cutTris[k]++ : 0)));
    manifest.cells.push({
      bone,
      mask: c.mask,
      vertices,
      triangles: c.face.length,
      position: push(qp),
      index: push(Uint16Array.from(c.mesh.index)),
      face: push(Uint16Array.from(c.face)),
      occlusion: push(Uint8Array.from(c.attr, (a) => (a === null ? CUT_OCCLUSION : Math.round(a)))),
      rim: push(Uint8Array.from(c.rim, (r) => r * 255)),
    });
  }
  own.forEach((p, k) => {
    const cellsWith = cells.filter((c) => c.mask & (1 << k)).length;
    console.log(`  ${p.id}: ${cellsWith} cells, ${cutTris[k]} cut-face triangles`);
    check(cellsWith >= 1, `${p.id} has no cell`);
    check(cutTris[k] >= 20, `${p.id} has ${cutTris[k]} cut-face triangles`);
  });
}

const json = Buffer.from(JSON.stringify(manifest));
const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(4);
header.writeUInt32LE(jsonPadded.length);
const file = Buffer.concat([header, jsonPadded, ...chunks]);
const gz = gzipSync(file, { level: 9 }).length;
const total = manifest.cells.reduce((s, c) => [s[0] + c.vertices, s[1] + c.triangles], [0, 0]);
console.log(`${manifest.cells.length} cells, ${total[0]} vertices, ${total[1]} triangles`);
console.log(`fractures.bin ${file.length} bytes, ${gz} gzipped`);
check(gz <= 512 * 1024, `asset is ${gz} bytes gzipped`);
writeFileSync(OUT, file);

// Directed edges left without a reversed partner, counted as a multiset.
function openEdgeCount(index) {
  const count = new Map();
  for (let t = 0; t < index.length; t += 3) {
    for (let k = 0; k < 3; k++) {
      const [a, b] = [index[t + k], index[t + ((k + 1) % 3)]];
      if (count.get(`${b}:${a}`) > 0) count.set(`${b}:${a}`, count.get(`${b}:${a}`) - 1);
      else count.set(`${a}:${b}`, (count.get(`${a}:${b}`) ?? 0) + 1);
    }
  }
  return [...count.values()].reduce((s, n) => s + n, 0);
}

function check(ok, message) {
  if (!ok) throw new Error(`build-fracture-model: ${message}`);
}
