import {
  BackSide,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
  type Material,
} from 'three';
import type { AnatomyState, FibulaMark } from './anatomyState';
import { Region, type AnkleModel } from './ankleModel';

/** Ink holds the page tokens the scene draws with, as CSS colours. */
export interface Ink {
  paper: string;
  pencil: string;
  mark: string;
}

type Structure = 'lateral' | 'medial' | 'posterior';

/** Anchors place the malleolus labels in canvas pixels: the point on the structure, and the label beside the model. */
export type Anchors = Record<Structure, { x: number; y: number; labelX: number; labelY: number; side: 'left' | 'right'; back: boolean }>;

// Mortise-like start: the leg turned 15 degrees inwards, seen a little from above.
const START = { yaw: (15 * Math.PI) / 180, pitch: (10 * Math.PI) / 180 };
const PITCH_LIMIT = (60 * Math.PI) / 180;
// The way each structure faces out of the ankle, in model axes.
const FACING = { lateral: new Vector3(-1, 0, 0), medial: new Vector3(1, 0, 0), posterior: new Vector3(0, 0, -1) };
const LEVELS = ['infra', 'trans', 'supra', 'supra_far'] as const;
const BONE: Record<string, number> = { tibia: 1, fibula: 2 };
const FADE_MS = 150;
// cubic-bezier(0.16, 1, 0.3, 1), the house curve, is an exponential ease-out.
const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const LABEL_GAP = 14; // px between the model and a label
const LABEL_STEP = 18; // px between two labels on one side

// Each region is the bone below a plane, cut by up to two side planes. The field is a signed
// distance in mm (negative inside) whose corners are rounded, so a boundary is drawn per pixel as
// a smooth curve on the bone rather than along the mesh triangles.
const FIELD = /* glsl */ `
  attribute float bone;
  uniform vec3 uOn;
  uniform vec4 uRegion; // lateralTop, medialTop, medialX, posteriorTop
  uniform float uPosteriorZ;
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

const FIELD_VARYINGS = /* glsl */ `
  varying vec3 vPos;
  varying float vBone;
`;

// Two-tone fill: paper in the light, a pencil wash in the shade, tinted with the mark where highlighted.
// The fibular level is a tinted band on the fibula, closed by a ring line at each edge.
const fillMaterial = () =>
  new ShaderMaterial({
    uniforms: {
      uOn: { value: new Vector3() },
      uRegion: { value: new Vector4() },
      uPosteriorZ: { value: 0 },
      uLevelY0: { value: new Vector4() },
      uLevelY1: { value: new Vector4() },
      uLevelOn: { value: new Vector4() },
      uLine: { value: 1.5 },
      uPaper: { value: new Color() },
      uShade: { value: new Color() },
      uMark: { value: new Color() },
    },
    vertexShader: /* glsl */ `
      ${FIELD}
      ${FIELD_VARYINGS}
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPos = position;
        vBone = bone;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${FIELD.replace('attribute float bone;', '')}
      ${FIELD_VARYINGS}
      uniform vec4 uLevelY0;
      uniform vec4 uLevelY1;
      uniform vec4 uLevelOn;
      uniform float uLine;
      uniform vec3 uPaper;
      uniform vec3 uShade;
      uniform vec3 uMark;
      varying vec3 vNormal;
      // 1 inside the field, 0 outside, with a one-pixel antialiased edge.
      vec3 cover(vec3 d) { return clamp(0.5 - d / max(fwidth(d), 1e-4), 0.0, 1.0); }
      void main() {
        float light = dot(normalize(vNormal), normalize(vec3(-0.35, 0.55, 0.75)));
        // Two tone steps with a narrow soft edge, so a coarse mesh does not tear the boundary.
        float shade = 0.5 * (1.0 - smoothstep(0.15, 0.45, light)) + 0.5 * (1.0 - smoothstep(-0.4, -0.1, light));
        float on = dot(cover(regionField(vPos, vBone)), uOn);
        float ring = 0.0;
        if (vBone > 1.5) {
          float y = vPos.y;
          float px = max(fwidth(y), 1e-4);
          vec4 inside = clamp(0.5 + min(y - uLevelY0, uLevelY1 - y) / px, 0.0, 1.0);
          on = max(on, 0.6 * dot(inside, uLevelOn));
          vec4 edge = min(abs(y - uLevelY0), abs(y - uLevelY1)) / px;
          ring = dot(clamp(0.5 * uLine + 0.5 - edge, 0.0, 1.0), uLevelOn);
        }
        vec3 paper = mix(uPaper, uMark, on * 0.22);
        vec3 inShade = mix(uShade, uMark, on * 0.42);
        gl_FragColor = vec4(mix(mix(paper, inShade, shade), uMark, clamp(ring, 0.0, 1.0)), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

// Outline by the inverted hull: back faces pushed out a fixed number of pixels along the normal and
// a little away from the camera, so they show only round the silhouette and not through creases.
const outlineMaterial = () =>
  new ShaderMaterial({
    side: BackSide,
    uniforms: {
      uOn: { value: new Vector3() },
      uRegion: { value: new Vector4() },
      uPosteriorZ: { value: 0 },
      uInk: { value: new Color() },
      uMark: { value: new Color() },
      uViewport: { value: new Vector2(1, 1) },
      uWidth: { value: 1 },
      uDepthBias: { value: 0 },
    },
    vertexShader: /* glsl */ `
      ${FIELD}
      ${FIELD_VARYINGS}
      uniform vec2 uViewport;
      uniform float uWidth;
      uniform float uDepthBias;
      void main() {
        vPos = position;
        vBone = bone;
        // The highlighted outline is thicker; it tapers over a few millimetres where the region ends.
        float on = dot(1.0 - smoothstep(-2.0, 2.0, regionField(position, bone)), uOn);
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 n = (normalMatrix * normal).xy;
        clip.xy += normalize(n + vec2(1e-6)) * uWidth * (1.0 + on) * 2.0 / uViewport * clip.w;
        clip.z += uDepthBias * clip.w;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      ${FIELD.replace('attribute float bone;', '')}
      ${FIELD_VARYINGS}
      uniform vec3 uInk;
      uniform vec3 uMark;
      void main() {
        vec3 d = regionField(vPos, vBone);
        float on = dot(clamp(0.5 - d / max(fwidth(d), 1e-4), 0.0, 1.0), uOn);
        gl_FragColor = vec4(mix(uInk, uMark, clamp(on, 0.0, 1.0)), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

/** createAnkleScene draws the model on canvas and renders only when asked to. */
export function createAnkleScene(canvas: HTMLCanvasElement, model: AnkleModel, onAnchors: (a: Anchors) => void) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new Scene();
  const bones = new Group();
  const pivot = new Group();
  pivot.add(bones);
  scene.add(pivot);

  const fill = fillMaterial();
  const outline = outlineMaterial();
  const { lateralTop, medialTop, medialX, posteriorTop, posteriorZ } = model.regions;
  for (const m of [fill, outline]) {
    m.uniforms.uRegion.value.set(lateralTop, medialTop, medialX, posteriorTop);
    m.uniforms.uPosteriorZ.value = posteriorZ;
  }
  fill.uniforms.uLevelY0.value.fromArray(LEVELS.map((l) => model.bands[l].y[0]));
  fill.uniforms.uLevelY1.value.fromArray(LEVELS.map((l) => model.bands[l].y[1]));

  const regions: Record<Structure, Vector3[]> = { lateral: [], medial: [], posterior: [] };
  const names = { [Region.lateral]: 'lateral', [Region.medial]: 'medial', [Region.posterior]: 'posterior' } as const;
  const points: Vector3[] = [];

  for (const part of model.parts) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(part.positions, 3));
    g.setAttribute('bone', new BufferAttribute(new Float32Array(part.region.length).fill(BONE[part.name] ?? 0), 1));
    g.setIndex(new BufferAttribute(part.index, 1));
    g.computeVertexNormals();
    bones.add(new Mesh(g, fill), new Mesh(g, outline));
    part.region.forEach((r, i) => {
      const p = new Vector3().fromArray(part.positions, i * 3);
      points.push(p);
      if (r !== Region.none) regions[names[r as keyof typeof names]].push(p);
    });
  }

  // Proximal fibula: the fracture is above the model, so an arrow leaves the top of the shaft.
  const arrowInk = new MeshBasicMaterial({ transparent: true, depthTest: false });
  const { x, z, y } = model.proximal;
  const top = y[0] + 8; // the shaft's cut end
  const arrow = new Group();
  const shaft = new Mesh(new CylinderGeometry(0.45, 0.45, 14, 12), arrowInk);
  shaft.position.set(x, top + 7, z);
  const head = new Mesh(new CylinderGeometry(0, 2.4, 6, 24), arrowInk);
  head.position.set(x, top + 17, z);
  arrow.add(shaft, head);
  arrow.renderOrder = 2;
  bones.add(arrow);

  // Turn about the middle of the model; frame its bounding sphere, arrow included, so rotation
  // never changes the scale or crops a part.
  const framed = [...points, new Vector3(x, top + 20, z)];
  const center = new Box3().setFromPoints(framed).getCenter(new Vector3());
  bones.position.copy(center).negate();
  const radius = Math.max(...framed.map((p) => p.distanceTo(center)));
  const camera = new OrthographicCamera(-radius, radius, radius, -radius, -radius * 4, radius * 4);
  // 2 mm of depth: the near-to-far range of 8 radii maps to 2 units of clip depth.
  outline.uniforms.uDepthBias.value = (2 * 2) / (8 * radius);
  const silhouette = points.filter((_, i) => i % 3 === 0);

  let yaw = START.yaw;
  let pitch = START.pitch;
  const sides: Partial<Record<Structure, 'left' | 'right'>> = {};

  // Highlights fade like the drawing's: lateral, medial, posterior, the four levels, proximal.
  const shown: number[] = Array(8).fill(0);
  let target = shown;
  let fade = 0;
  function applyShown() {
    for (const m of [fill, outline]) m.uniforms.uOn.value.set(shown[0], shown[1], shown[2]);
    fill.uniforms.uLevelOn.value.set(shown[3], shown[4], shown[5], shown[6]);
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
    const xs = silhouette.map((p) => toPx(p).x);
    const gutter = { left: Math.min(...xs) - LABEL_GAP, right: Math.max(...xs) + LABEL_GAP };

    // Each label sits beside the model, level with its structure, joined to it by a leader; back
    // is set while the structure faces away.
    const anchors = {} as Anchors;
    for (const key of Object.keys(regions) as Structure[]) {
      const px = regions[key].map(toPx);
      const midX = px.reduce((s, p) => s + p.x, 0) / px.length;
      // A little hysteresis keeps a label from flicking sides as its structure passes the middle.
      const prev = sides[key];
      const side = prev && Math.abs(midX - size.x / 2) < size.x * 0.03 ? prev : midX >= size.x / 2 ? 'right' : 'left';
      sides[key] = side;
      const tip = px.reduce((a, b) => ((side === 'right' ? b.x > a.x : b.x < a.x) ? b : a));
      const back = FACING[key].clone().applyQuaternion(pivot.quaternion).z < -0.4;
      anchors[key] = { x: tip.x, y: tip.y, labelX: gutter[side], labelY: tip.y, side, back };
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
      renderer.setSize(width, width, false);
      const ratio = renderer.getPixelRatio();
      outline.uniforms.uViewport.value.set(width * ratio, width * ratio);
      outline.uniforms.uWidth.value = 1.1 * ratio;
      fill.uniforms.uLine.value = 1.5 * ratio;
      render();
    },
    setInk(ink: Ink) {
      const [paper, pencil, mark] = [ink.paper, ink.pencil, ink.mark].map((c) => new Color(c));
      // On paper the shade is a pencil wash; on the dark sheet the lit side is, so light still reads as light.
      const dark = paper.getHSL({ h: 0, s: 0, l: 0 }).l < 0.5;
      fill.uniforms.uPaper.value.copy(paper).lerp(pencil, dark ? 0.2 : 0);
      fill.uniforms.uShade.value.copy(paper).lerp(pencil, dark ? 0 : 0.22);
      fill.uniforms.uMark.value.copy(mark);
      outline.uniforms.uInk.value.copy(pencil);
      outline.uniforms.uMark.value.copy(mark);
      arrowInk.color.copy(mark);
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
      for (const m of [fill, outline, arrowInk] as Material[]) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export type AnkleScene = ReturnType<typeof createAnkleScene>;
