import {
  BackSide,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  PCFSoftShadowMap,
  WebGLRenderer,
  type Material,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { AnatomyState, FibulaMark } from './anatomyState';
import { Region, type AnkleModel } from './ankleModel';

/** Ink holds the figure tokens the overlay draws with (see .fig-card in index.css), as CSS colours. */
export interface Ink {
  paper: string;
  /** The accent outline and rings. */
  mark: string;
  /** The translucent accent tint over the bone. */
  tint: string;
}

type Structure = 'lateral' | 'medial' | 'posterior';

/** Anchors place the malleolus labels in canvas pixels: the point on the structure, and its label. */
export type Anchors = Partial<Record<Structure, { x: number; y: number; labelX: number; labelY: number; side: 'left' | 'right' | 'below'; back: boolean }>>;

/** View fixes the model at one turn (radians) and frames it tightly, as the 2D figure does. */
export interface View {
  yaw: number;
  pitch: number;
  /** Structures labelled below the model, under their lowest point. */
  labels: Structure[];
  /** A bone drawn see-through, so the bone behind it shows, as on a radiograph. */
  ghost?: string;
}

const DEG = Math.PI / 180;
// Anterolateral start: turned 35 degrees so the lateral malleolus comes forward while the medial
// one still holds the far contour, seen a little from above, so both malleoli and the joint read.
const START = { yaw: 35 * DEG, pitch: 8 * DEG };
const PITCH_LIMIT = 60 * DEG;
// The way each structure faces out of the ankle, in model axes.
const FACING = { lateral: new Vector3(-1, 0, 0), medial: new Vector3(1, 0, 0), posterior: new Vector3(0, 0, -1) };
const LEVELS = ['infra', 'trans', 'supra', 'supra_far'] as const;
const BONE: Record<string, number> = { tibia: 1, fibula: 2 };
const FADE_MS = 200;
// cubic-bezier(0.16, 1, 0.3, 1), the house curve, is an exponential ease-out.
const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const LABEL_GAP = 10; // px between the model and a label
const LABEL_STEP = 18; // px between two labels on one side
/** ASPECT is the free view's canvas width over its height. */
export const ASPECT = 4 / 5;
// Bone in a studio: ivory, slightly waxy, the same in both themes.
const IVORY = 0xe8e2d4;

// Each region is the bone below a plane, cut by up to two side planes. The field is a signed
// distance in mm (negative inside) whose corners are rounded, so a boundary is drawn per pixel as
// a smooth curve on the bone rather than along the mesh triangles.
const FIELD = /* glsl */ `
  uniform vec3 uOn;
  uniform vec4 uRegion; // lateralTop, medialTop, medialX, posteriorTop
  uniform float uPosteriorZ;
  varying vec3 vPos;
  varying float vBone;
  float box(vec3 d) {
    vec3 q = d + 3.0;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 3.0;
  }
  // xyz: distance to the lateral, medial and posterior regions; far away on bones that lack them.
  vec3 regionField(vec3 p, float b) {
    float far = 1e3;
    float lateral = b > 1.5 ? p.y - uRegion.x : far;
    float medial = b > 0.5 && b < 1.5 ? box(vec3(p.y - uRegion.y, uRegion.z - p.x, -far)) : far;
    float posterior = b > 0.5 && b < 1.5 ? box(vec3(p.y - uRegion.w, p.z - uPosteriorZ, p.x - uRegion.z)) : far;
    return vec3(lateral, medial, posterior);
  }
`;

const regionUniforms = () => ({
  uOn: { value: new Vector3() },
  uRegion: { value: new Vector4() },
  uPosteriorZ: { value: 0 },
});

const overlayUniforms = () => ({
  ...regionUniforms(),
  uLevelY0: { value: new Vector4() },
  uLevelY1: { value: new Vector4() },
  uLevelOn: { value: new Vector4() },
  uLine: { value: 1.5 },
  uTint: { value: new Vector3() },
  uMark: { value: new Vector3() },
});

// Physical bone with the baked occlusion, a faint mottle in tone and roughness, and the clinical
// overlay on top: a translucent accent tint over each answered region with a crisp accent line where
// it ends, and the fibular level as a tinted band between two rings. The overlay is mixed after
// tone mapping, in sRGB, so it shows the page's accent exactly. Materials passed one overlay share it.
function boneMaterial(overlay = overlayUniforms()) {
  const material = new MeshPhysicalMaterial({
    color: IVORY,
    roughness: 0.58,
    sheen: 0.35,
    sheenRoughness: 0.7,
    sheenColor: new Color(0xffe2c4),
    clearcoat: 0.06,
    clearcoatRoughness: 0.6,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, overlay);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float bone;
        attribute float occlusion;
        varying vec3 vPos;
        varying float vBone;
        varying float vOcc;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vPos = position;
        vBone = bone;
        vOcc = occlusion;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        ${FIELD}
        varying float vOcc;
        uniform vec4 uLevelY0;
        uniform vec4 uLevelY1;
        uniform vec4 uLevelOn;
        uniform float uLine;
        uniform vec3 uTint;
        uniform vec3 uMark;
        float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float noise(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
            mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
            f.z);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float mottle = 0.65 * noise(vPos * 0.18) + 0.35 * noise(vPos * 0.7);
        diffuseColor.rgb *= 0.93 + 0.1 * mottle;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor + 0.16 * (mottle - 0.5), 0.0, 1.0);`,
      )
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
        float ao = 1.0 - 0.8 * smoothstep(0.0, 0.9, vOcc);
        reflectedLight.indirectDiffuse *= ao;
        reflectedLight.indirectSpecular *= ao;
        reflectedLight.directDiffuse *= mix(1.0, ao, 0.85);`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        vec3 d = regionField(vPos, vBone);
        vec3 w = max(fwidth(d), 1e-4);
        float on = dot(clamp(0.5 - d / w, 0.0, 1.0), uOn);
        // The region's edge on the bone, a line uLine pixels wide.
        float line = dot(clamp(0.5 * uLine + 0.5 - abs(d) / w, 0.0, 1.0), uOn);
        if (vBone > 1.5) {
          float y = vPos.y;
          float px = max(fwidth(y), 1e-4);
          vec4 inside = clamp(0.5 + min(y - uLevelY0, uLevelY1 - y) / px, 0.0, 1.0);
          vec4 edge = min(abs(y - uLevelY0), abs(y - uLevelY1)) / px;
          on = max(on, dot(inside, uLevelOn));
          line = max(line, dot(clamp(0.5 * uLine + 0.5 - edge, 0.0, 1.0), uLevelOn));
        }
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uTint, 0.4 * clamp(on, 0.0, 1.0));
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uMark, clamp(line, 0.0, 1.0));`,
      );
  };
  return { material, overlay };
}

// The answered regions' silhouette, by the inverted hull: back faces pushed out a fixed number of
// pixels along the normal and a little away from the camera, drawn only inside a lit region.
const outlineMaterial = () =>
  new ShaderMaterial({
    side: BackSide,
    uniforms: {
      ...regionUniforms(),
      uMark: { value: new Vector3() },
      uViewport: { value: new Vector2(1, 1) },
      uWidth: { value: 1 },
      uDepthBias: { value: 0 },
    },
    vertexShader: /* glsl */ `
      ${FIELD}
      attribute float bone;
      uniform vec2 uViewport;
      uniform float uWidth;
      uniform float uDepthBias;
      void main() {
        vPos = position;
        vBone = bone;
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 n = (normalMatrix * normal).xy;
        clip.xy += normalize(n + vec2(1e-6)) * uWidth * 2.0 / uViewport * clip.w;
        clip.z += uDepthBias * clip.w;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FIELD}
      uniform vec3 uMark;
      void main() {
        vec3 d = regionField(vPos, vBone);
        float on = dot(clamp(0.5 - d / max(fwidth(d), 1e-4), 0.0, 1.0), uOn);
        if (on < 0.02) discard;
        gl_FragColor = vec4(uMark, on);
      }
    `,
    transparent: true,
  });

/** createAnkleScene draws the model on canvas and renders only when asked to. */
export function createAnkleScene(canvas: HTMLCanvasElement, model: AnkleModel, onAnchors: (a: Anchors) => void, view?: View) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.16;

  // Lights stay with the camera while the bones turn: a warm key from the upper left front that
  // casts soft shadows, and a cool rim from behind on the right that separates the silhouette.
  const key = new DirectionalLight(0xfff3e6, 2.9);
  key.position.set(-110, 75, 60);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.4;
  const rim = new DirectionalLight(0xdfe8ff, 1.4);
  rim.position.set(70, 30, -80);
  scene.add(key, rim);

  const bones = new Group();
  const pivot = new Group();
  pivot.add(bones);
  scene.add(pivot);

  const { material: fill, overlay } = boneMaterial();
  const ghost = boneMaterial(overlay).material;
  Object.assign(ghost, { transparent: true, opacity: 0.32, depthWrite: false });
  const outline = outlineMaterial();
  const { lateralTop, medialTop, medialX, posteriorTop, posteriorZ } = model.regions;
  for (const u of [overlay, outline.uniforms]) {
    u.uRegion.value.set(lateralTop, medialTop, medialX, posteriorTop);
    u.uPosteriorZ.value = posteriorZ;
  }
  overlay.uLevelY0.value.fromArray(LEVELS.map((l) => model.bands[l].y[0]));
  overlay.uLevelY1.value.fromArray(LEVELS.map((l) => model.bands[l].y[1]));

  const regions: Record<Structure, Vector3[]> = { lateral: [], medial: [], posterior: [] };
  const names = { [Region.lateral]: 'lateral', [Region.medial]: 'medial', [Region.posterior]: 'posterior' } as const;
  const points: Vector3[] = [];

  for (const part of model.parts) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(part.positions, 3));
    g.setAttribute('bone', new BufferAttribute(new Float32Array(part.region.length).fill(BONE[part.name] ?? 0), 1));
    g.setAttribute('occlusion', new BufferAttribute(part.occlusion, 1, true));
    g.setIndex(new BufferAttribute(part.index, 1));
    g.computeVertexNormals();
    const seeThrough = part.name === view?.ghost;
    const mesh = new Mesh(g, seeThrough ? ghost : fill);
    mesh.castShadow = !seeThrough;
    mesh.receiveShadow = true;
    bones.add(mesh);
    // A see-through bone writes no depth, so its hull would show whole; it keeps the tint and lines.
    if (!seeThrough) bones.add(new Mesh(g, outline));
    part.region.forEach((r, i) => {
      const p = new Vector3().fromArray(part.positions, i * 3);
      points.push(p);
      if (r !== Region.none) regions[names[r as keyof typeof names]].push(p);
    });
  }

  // Proximal fibula: the fracture is above the model, so an arrow runs up the shaft to its cut end,
  // drawn over the bone as in the drawing.
  const arrowInk = new MeshBasicMaterial({ transparent: true, depthTest: false, toneMapped: false });
  const { x, z, y } = model.proximal;
  const top = y[0] + 8; // the shaft's cut end
  const arrow = new Group();
  const shaft = new Mesh(new CylinderGeometry(0.6, 0.6, 14, 12), arrowInk);
  shaft.position.set(x, top - 15, z);
  const head = new Mesh(new CylinderGeometry(0, 2.6, 6, 24), arrowInk);
  head.position.set(x, top - 5, z);
  arrow.add(shaft, head);
  arrow.renderOrder = 2;
  bones.add(arrow);

  const center = new Box3().setFromPoints(points).getCenter(new Vector3());
  bones.position.copy(center).negate();
  const radius = Math.max(...points.map((p) => p.distanceTo(center)));
  const sample = points.filter((_, i) => i % 4 === 0);
  const rel = sample.map((p) => p.clone().sub(center));

  let yaw = view?.yaw ?? START.yaw;
  let pitch = view?.pitch ?? START.pitch;

  // A fixed view frames the model as it stands; the free view fits the tallest the model gets at
  // any allowed turn, so turning never changes the scale or crops a part. The model is tall and
  // narrow, so a portrait frame holds it tighter than a square and leaves the sides for labels.
  let frame: { w: number; h: number; cx: number; cy: number };
  if (view) {
    pivot.rotation.set(pitch, yaw, 0);
    pivot.updateMatrixWorld();
    // Every point, not the sample, so no malleolus tip falls outside; 7% margin on each side clears
    // the tips and the highlight outline drawn round them.
    const box = new Box3().setFromPoints(points.map((p) => p.clone().sub(center).applyQuaternion(pivot.quaternion)));
    const [w, h] = [box.max.x - box.min.x, box.max.y - box.min.y].map((v) => v * 1.14);
    frame = { w, h, cx: (box.max.x + box.min.x) / 2, cy: (box.max.y + box.min.y) / 2 };
  } else {
    const h = 2.04 * fitHeight(rel);
    frame = { w: h * ASPECT, h, cx: 0, cy: 0 };
  }
  const camera = new OrthographicCamera(
    frame.cx - frame.w / 2,
    frame.cx + frame.w / 2,
    frame.cy + frame.h / 2,
    frame.cy - frame.h / 2,
    -radius * 4,
    radius * 4,
  );
  camera.position.z = radius * 2;
  key.shadow.camera.left = key.shadow.camera.bottom = -radius;
  key.shadow.camera.right = key.shadow.camera.top = radius;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = radius * 6;
  // 2 mm of depth: the near-to-far range of 8 radii maps to 2 units of clip depth.
  outline.uniforms.uDepthBias.value = (2 * 2) / (8 * radius);
  const silhouette = points.filter((_, i) => i % 8 === 0);

  const sides: Partial<Record<Structure, 'left' | 'right'>> = {};

  // Highlights fade like the drawing's: lateral, medial, posterior, the four levels, proximal.
  const shown: number[] = Array(8).fill(0);
  let target = shown;
  let fade = 0;
  function applyShown() {
    for (const u of [overlay, outline.uniforms]) u.uOn.value.set(shown[0], shown[1], shown[2]);
    overlay.uLevelOn.value.set(shown[3], shown[4], shown[5], shown[6]);
    arrowInk.opacity = shown[7];
    arrow.visible = shown[7] > 0.001;
  }

  function render() {
    pivot.rotation.set(pitch, yaw, 0);
    renderer.render(scene, camera);
    pivot.updateMatrixWorld();
    const size = renderer.getSize(new Vector2());
    const toPx = (p: Vector3) => {
      const v = p.clone().applyMatrix4(bones.matrixWorld).project(camera);
      return { x: ((v.x + 1) / 2) * size.x, y: ((1 - v.y) / 2) * size.y };
    };
    const anchors: Anchors = {};
    const back = (key: Structure) => FACING[key].clone().applyQuaternion(pivot.quaternion).z < -0.4;

    if (view) {
      // Each label hangs below the canvas, under the lowest point of its structure.
      for (const key of view.labels) {
        const tip = regions[key].map(toPx).reduce((a, b) => (b.y > a.y ? b : a));
        anchors[key] = { x: tip.x, y: tip.y, labelX: tip.x, labelY: size.y + 4, side: 'below', back: back(key) };
      }
      return onAnchors(anchors);
    }

    const xs = silhouette.map((p) => toPx(p).x);
    const gutter = { left: Math.min(...xs) - LABEL_GAP, right: Math.max(...xs) + LABEL_GAP };
    // Each label sits beside the model, level with its structure, joined to it by a leader; back
    // is set while the structure faces away.
    for (const key of Object.keys(regions) as Structure[]) {
      const px = regions[key].filter((_, i) => i % 4 === 0).map(toPx);
      const midX = px.reduce((s, p) => s + p.x, 0) / px.length;
      // A little hysteresis keeps a label from flicking sides as its structure passes the middle.
      const prev = sides[key];
      const side = prev && Math.abs(midX - size.x / 2) < size.x * 0.03 ? prev : midX >= size.x / 2 ? 'right' : 'left';
      sides[key] = side;
      const tip = px.reduce((a, b) => ((side === 'right' ? b.x > a.x : b.x < a.x) ? b : a));
      anchors[key] = { x: tip.x, y: tip.y, labelX: gutter[side], labelY: tip.y, side, back: back(key) };
    }
    // Labels on one side keep their order but never overlap.
    for (const side of ['left', 'right'] as const) {
      const column = Object.values(anchors).filter((a) => a.side === side).sort((a, b) => a.labelY - b.labelY);
      for (let i = 1; i < column.length; i++) column[i].labelY = Math.max(column[i].labelY, column[i - 1].labelY + LABEL_STEP);
      for (const a of column) a.labelX = Math.max(8, Math.min(size.x - 8, a.labelX));
    }
    onAnchors(anchors);
  }

  function setTarget(next: number[]) {
    target = next;
    cancelAnimationFrame(fade);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.splice(0, 8, ...target);
      applyShown();
      return render();
    }
    const from = [...shown];
    const start = performance.now();
    const step = (now: number) => {
      const k = ease((now - start) / FADE_MS);
      shown.forEach((_, i) => (shown[i] = from[i] + (target[i] - from[i]) * k));
      applyShown();
      render();
      if (k < 1) fade = requestAnimationFrame(step);
    };
    fade = requestAnimationFrame(step);
  }

  return {
    /** aspect is the canvas width over its height for this view. */
    aspect: frame.w / frame.h,
    render,
    /** rotate turns the model by the given angles in radians; pitch stops at the limits. */
    rotate(dYaw: number, dPitch: number) {
      yaw += dYaw;
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + dPitch));
      render();
    },
    reset() {
      yaw = START.yaw;
      pitch = START.pitch;
      render();
    },
    resize(width: number) {
      const height = width / (frame.w / frame.h);
      renderer.setSize(width, height, false);
      const ratio = renderer.getPixelRatio();
      outline.uniforms.uViewport.value.set(width * ratio, height * ratio);
      outline.uniforms.uWidth.value = 2.5 * ratio;
      overlay.uLine.value = 2 * ratio;
      render();
    },
    setInk(ink: Ink) {
      const [paper, mark, tint] = [ink.paper, ink.mark, ink.tint].map((c) => new Color(c));
      // The overlay mixes after tone mapping and output encoding, so it takes sRGB values.
      const srgb = (c: Color) => new Vector3(...c.clone().convertLinearToSRGB().toArray());
      overlay.uTint.value.copy(srgb(tint));
      overlay.uMark.value.copy(srgb(mark));
      outline.uniforms.uMark.value.copy(srgb(mark));
      arrowInk.color.copy(mark);
      // Ivory glares on a dark page; a stop down keeps it bone rather than paper.
      renderer.toneMappingExposure = paper.getHSL({ h: 0, s: 0, l: 0 }).l < 0.5 ? 0.92 : 1;
      render();
    },
    setState(state: AnatomyState) {
      const level = (mark: FibulaMark) => +(state.fibula === mark);
      setTarget([+state.lateral, +state.medial, +state.posterior, ...LEVELS.map(level), level('proximal')]);
    },
    dispose() {
      cancelAnimationFrame(fade);
      scene.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of [fill, ghost, outline, arrowInk] as Material[]) m.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export type AnkleScene = ReturnType<typeof createAnkleScene>;

/**
 * fitHeight is half the screen height the points take at the tallest allowed turn about the
 * origin (yaw, then pitch within PITCH_LIMIT), sampled every 5 degrees.
 */
export function fitHeight(points: Vector3[]): number {
  let h = 0;
  const step = 5 * DEG;
  for (let yaw = 0; yaw < 2 * Math.PI; yaw += step) {
    const [cy, sy] = [Math.cos(yaw), Math.sin(yaw)];
    for (let pitch = -PITCH_LIMIT; pitch <= PITCH_LIMIT + 1e-6; pitch += step) {
      const [cp, sp] = [Math.cos(pitch), Math.sin(pitch)];
      for (const p of points) h = Math.max(h, Math.abs(p.y * cp - (-p.x * sy + p.z * cy) * sp));
    }
  }
  // Sampling can miss the exact peak by a hair; the caller's margin covers it.
  return h;
}
