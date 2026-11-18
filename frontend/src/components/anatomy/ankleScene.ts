import {
  BackSide,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
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

/** Anchors place the malleolus labels, in canvas pixels; back is true while the structure faces away. */
export type Anchors = Record<'lateral' | 'medial' | 'posterior', { x: number; y: number; side: 'left' | 'right'; back: boolean }>;

// Mortise-like start: the leg turned 15 degrees inwards, seen a little from above.
const START = { yaw: (15 * Math.PI) / 180, pitch: (10 * Math.PI) / 180 };
const PITCH_LIMIT = (60 * Math.PI) / 180;
// The way each structure faces out of the ankle, in model axes.
const FACING = { lateral: new Vector3(-1, 0, 0), medial: new Vector3(1, 0, 0), posterior: new Vector3(0, 0, -1) };

const REGION_ON = /* glsl */ `
  attribute float region;
  uniform vec3 uOn;
  float regionOn() {
    return region < 0.5 ? 0.0 : region < 1.5 ? uOn.x : region < 2.5 ? uOn.y : uOn.z;
  }
`;

// Two-tone fill: paper in the light, a pencil wash in the shade, tinted with the mark where highlighted.
const fillMaterial = () =>
  new ShaderMaterial({
    uniforms: { uOn: { value: new Vector3() }, uPaper: { value: new Color() }, uShade: { value: new Color() }, uMark: { value: new Color() } },
    vertexShader: /* glsl */ `
      ${REGION_ON}
      varying vec3 vNormal;
      varying float vOn;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vOn = regionOn();
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uPaper;
      uniform vec3 uShade;
      uniform vec3 uMark;
      varying vec3 vNormal;
      varying float vOn;
      void main() {
        float light = dot(normalize(vNormal), normalize(vec3(-0.35, 0.55, 0.75)));
        // Two tone steps with a narrow soft edge, so a coarse mesh does not tear the boundary.
        float shade = 0.5 * (1.0 - smoothstep(0.2, 0.4, light)) + 0.5 * (1.0 - smoothstep(-0.35, -0.15, light));
        float on = smoothstep(0.15, 0.85, vOn);
        vec3 paper = mix(uPaper, uMark, on * 0.22);
        vec3 inShade = mix(uShade, uMark, on * 0.42);
        gl_FragColor = vec4(mix(paper, inShade, shade), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

// Outline by the inverted hull: back faces pushed out a fixed number of pixels along the normal.
const outlineMaterial = () =>
  new ShaderMaterial({
    side: BackSide,
    uniforms: {
      uOn: { value: new Vector3() },
      uInk: { value: new Color() },
      uMark: { value: new Color() },
      uViewport: { value: new Vector2(1, 1) },
      uWidth: { value: 1 },
    },
    vertexShader: /* glsl */ `
      ${REGION_ON}
      uniform vec2 uViewport;
      uniform float uWidth;
      varying float vOn;
      void main() {
        vOn = regionOn();
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec2 n = (normalMatrix * normal).xy;
        float px = uWidth * (step(0.5, vOn) * 1.4 + 1.0);
        clip.xy += normalize(n + vec2(1e-6)) * px * 2.0 / uViewport * clip.w;
        gl_Position = clip;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      uniform vec3 uMark;
      varying float vOn;
      void main() {
        gl_FragColor = vec4(mix(uInk, uMark, step(0.5, vOn)), 1.0);
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
  const regions: Record<keyof Anchors, Vector3[]> = { lateral: [], medial: [], posterior: [] };
  const names = { [Region.lateral]: 'lateral', [Region.medial]: 'medial', [Region.posterior]: 'posterior' } as const;

  for (const part of model.parts) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(part.positions, 3));
    g.setAttribute('region', new BufferAttribute(Float32Array.from(part.region), 1));
    g.setIndex(new BufferAttribute(part.index, 1));
    g.computeVertexNormals();
    bones.add(new Mesh(g, fill), new Mesh(g, outline));
    part.region.forEach((r, i) => {
      if (r !== Region.none) regions[names[r as keyof typeof names]].push(new Vector3().fromArray(part.positions, i * 3));
    });
  }

  // Turn about the middle of the model; frame its bounding sphere so rotation never changes the scale.
  const points = model.parts.flatMap((p) => Array.from({ length: p.positions.length / 3 }, (_, i) => new Vector3().fromArray(p.positions, i * 3)));
  const center = new Box3().setFromPoints(points).getCenter(new Vector3());
  bones.position.copy(center).negate();
  const radius = Math.max(...points.map((p) => p.distanceTo(center)));

  // The fibular level: a translucent sleeve round the fibula with a ring at each edge.
  const bandFill = new MeshBasicMaterial({ transparent: true, opacity: 0.14, depthWrite: false, side: DoubleSide });
  const bandRing = new MeshBasicMaterial();
  const levels = new Map<FibulaMark, Group>();
  for (const [mark, band] of Object.entries(model.bands) as [Exclude<FibulaMark, 'proximal'>, AnkleModel['bands']['infra']][]) {
    const [y0, y1] = band.y;
    const level = new Group();
    level.position.set(band.center[0], (y0 + y1) / 2, band.center[1]);
    const sleeve = new Mesh(new CylinderGeometry(band.radius, band.radius, y1 - y0, 48, 1, true), bandFill);
    sleeve.renderOrder = 1;
    level.add(sleeve);
    for (const y of [y0, y1]) {
      const ring = new Mesh(new TorusGeometry(band.radius, 0.35, 6, 64), bandRing);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y - (y0 + y1) / 2;
      level.add(ring);
    }
    levels.set(mark, level);
  }
  // Proximal fibula: the fracture is above the model, so an arrow leaves the top of the shaft.
  const { x, z, y } = model.proximal;
  const arrow = new Group();
  const shaft = new Mesh(new CylinderGeometry(0.5, 0.5, y[1] - y[0], 8), bandRing);
  shaft.position.set(x, (y[0] + y[1]) / 2, z);
  const head = new Mesh(new CylinderGeometry(0, 3, 7, 16), bandRing);
  head.position.set(x, y[1] + 3.5, z);
  arrow.add(shaft, head);
  levels.set('proximal', arrow);
  for (const level of levels.values()) {
    level.visible = false;
    bones.add(level);
  }

  const camera = new OrthographicCamera(-radius, radius, radius, -radius, -radius * 4, radius * 4);
  let yaw = START.yaw;
  let pitch = START.pitch;

  function render() {
    pivot.rotation.set(pitch, yaw, 0);
    renderer.render(scene, camera);
    pivot.updateMatrixWorld();
    const size = renderer.getSize(new Vector2());
    const anchors = {} as Anchors;
    // Each label sits just outside its structure, on the side of the model the structure is on,
    // and hides while the structure faces away.
    for (const key of Object.keys(regions) as (keyof Anchors)[]) {
      const world = regions[key].map((p) => p.clone().applyMatrix4(bones.matrixWorld));
      const mid = world.reduce((s, p) => s.add(p), new Vector3()).divideScalar(world.length);
      const xs = world.map((p) => p.x);
      const side = mid.x >= 0 ? 'right' : 'left';
      const edge = new Vector3(side === 'right' ? Math.max(...xs) : Math.min(...xs), mid.y, mid.z).project(camera);
      const back = FACING[key].clone().applyQuaternion(pivot.quaternion).z < -0.5;
      anchors[key] = { x: ((edge.x + 1) / 2) * size.x, y: ((1 - edge.y) / 2) * size.y, side, back };
    }
    onAnchors(anchors);
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
      outline.uniforms.uViewport.value.set(width * renderer.getPixelRatio(), width * renderer.getPixelRatio());
      outline.uniforms.uWidth.value = 1.1 * renderer.getPixelRatio();
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
      bandFill.color.copy(mark);
      bandRing.color.copy(mark);
      render();
    },
    setState(state: AnatomyState) {
      const on = new Vector3(+state.lateral, +state.medial, +state.posterior);
      fill.uniforms.uOn.value.copy(on);
      outline.uniforms.uOn.value.copy(on);
      for (const [mark, level] of levels) level.visible = state.fibula === mark;
      render();
    },
    dispose() {
      scene.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of [fill, outline, bandFill, bandRing] as Material[]) m.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

export type AnkleScene = ReturnType<typeof createAnkleScene>;
