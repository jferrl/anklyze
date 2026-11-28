import {
  AdditiveBlending,
  BackSide,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  DirectionalLight,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  OrthographicCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  PCFShadowMap,
  Raycaster,
  WebGLRenderer,
  type Material,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PRESETS } from './anatomyCamera';
import { marksFor, type Marks } from './anatomyMarks';
import type { AnatomyState } from './anatomyState';
import { Region, type AnkleModel } from './ankleModel';
import type { FractureModel } from './fractureModel';
import { fracturePose } from './fracturePose';
import { buildFractures, type Fractures } from './fractureScene';

/** Ink holds the figure tokens the overlay draws with (see .fig-card in index.css), as CSS colours. */
export interface Ink {
  paper: string;
  /** The accent outline and rings. */
  mark: string;
  /** The translucent accent tint over the bone. */
  tint: string;
}

/** Structure is a malleolus the figure labels. */
export type Structure = 'lateral' | 'medial' | 'posterior';

/** Anchor places a label in canvas pixels: the point on the structure, and the label beside the model. */
export interface Anchor {
  x: number;
  y: number;
  labelX: number;
  labelY: number;
  side: 'left' | 'right';
  /** The structure faces away: its label shows as a chip, with no leader onto the bone in front. */
  back: boolean;
  /** For the syndesmosis bracket: the lower end, in pixels. */
  y2?: number;
  /** The widest the label may be and still sit whole in its gutter; a longer name wraps. */
  maxWidth?: number;
}

/** Anchors place the malleolus labels and the syndesmosis bracket. */
export type Anchors = Partial<Record<Structure | 'syndesmosis', Anchor>>;

const DEG = Math.PI / 180;
// Anterolateral start: the lateral malleolus comes forward while the medial one still holds the far
// contour, seen a little from above, so both malleoli and the joint read.
const START = PRESETS.anterolateral;
const PITCH_LIMIT = 60 * DEG;
// The way each structure faces out of the ankle, in model axes, and how far it may turn away
// before it counts as hidden: the medial malleolus still shows over the talus well past side-on.
const FACING = { lateral: new Vector3(-1, 0, 0), medial: new Vector3(1, 0, 0), posterior: new Vector3(0, 0, -1) };
const HIDDEN = { lateral: -0.4, medial: -0.8, posterior: -0.4 };
const LEVELS = ['infra', 'trans', 'supra', 'supra_far'] as const;
const BONE: Record<string, number> = { tibia: 1, fibula: 2 };
const FADE_MS = 200;
// cubic-bezier(0.16, 1, 0.3, 1), the house curve, is an exponential ease-out.
const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const LABEL_GAP = 10; // px between the model and a label
const LABEL_STEP = 30; // px between two labels on one side, room for a text-sm label, its backdrop and a gap
const LEADER_MIN = 24; // px: every leader is at least this long, so it reads as a leader
// The close-up frame: this much closer, centred this many mm above the plafond.
const CLOSE_UP = { zoom: 1.3, y: 20 };

/** ZOOM_MAX is the closest the view zooms in; the model is redrawn at every zoom, so it stays sharp. */
export const ZOOM_MAX = 4;
/** ASPECT is the canvas width over its height: square, so the long structure names have gutters. */
export const ASPECT = 1;
// Bone in a studio: ivory, slightly waxy, the same in both themes.
const IVORY = 0xe6dfd0;
const SNAPSHOT_TOP_MM = 55; // the AP and Lateral views show the bones at least this far above the plafond

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
  uNear: { value: 0 },
  uDepth: { value: 1 },
  uSyndesmosis: { value: 0 },
  uShowSyndesmosis: { value: 0 },
  // How see-through the fibula is now, 0 to 1, so the bones beside it lose the shade it cast.
  uGhost: { value: 0 },
});

// Physical bone with the baked occlusion, a faint mottle in tone and roughness, and the clinical
// overlay on top: a translucent accent tint over each answered region with a crisp accent line where
// it ends, and the fibular level as a tinted band between two rings. The overlay is mixed after
// tone mapping, in sRGB, so it shows the page's accent exactly. Materials passed one overlay share it.
// The ghost variant is the see-through fibula of the lateral view: its marks stay at full strength
// as a tint and the region's silhouette, without the hairlines that would cross the bone behind.
// The fracture variant reads `cut` and `rim` and draws cut faces as broken bone.
function boneMaterial(overlay = overlayUniforms(), ghost = false, fracture = false) {
  const material = new MeshPhysicalMaterial({
    color: IVORY,
    roughness: 0.58,
    sheen: 0.35,
    sheenRoughness: 0.7,
    sheenColor: new Color(0xffe2c4),
    clearcoat: 0.06,
    clearcoatRoughness: 0.6,
  });
  material.customProgramCacheKey = () => (ghost ? 'bone-ghost' : 'bone') + (fracture ? '-fracture' : '');
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, overlay);
    if (ghost) shader.fragmentShader = '#define GHOST\n' + shader.fragmentShader;
    const defines = fracture ? '#define FRACTURE\n' : '';
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `${defines}#include <common>
        attribute float bone;
        attribute float occlusion;
        varying vec3 vPos;
        varying float vBone;
        varying float vOcc;
        #ifdef FRACTURE
        attribute float cut;
        attribute float rim;
        varying float vCut;
        varying float vRim;
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vPos = position;
        vBone = bone;
        vOcc = occlusion;
        #ifdef FRACTURE
        vCut = cut;
        vRim = rim;
        #endif`,
      );
    shader.fragmentShader = defines + shader.fragmentShader;
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
        uniform float uNear;
        uniform float uDepth;
        uniform float uSyndesmosis;
        uniform float uShowSyndesmosis;
        uniform float uGhost;
        #ifdef FRACTURE
        varying float vCut;
        varying float vRim;
        #endif
        float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float noise(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
            mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
            f.z);
        }
        #ifdef FRACTURE
        // Cellular noise: distance to the nearest and second-nearest jittered point, for trabeculae.
        vec2 worley(vec3 p) {
          vec3 i = floor(p), f = fract(p);
          vec2 d = vec2(8.0);
          for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) for (int z = -1; z <= 1; z++) {
            vec3 o = vec3(x, y, z);
            vec3 h = vec3(hash(i + o), hash(i + o + 17.3), hash(i + o + 41.9));
            float r = length(o + h - f);
            d = r < d.x ? vec2(r, d.x) : vec2(d.x, min(d.y, r));
          }
          return d;
        }
        #endif`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float mottle = 0.65 * noise(vPos * 0.18) + 0.35 * noise(vPos * 0.7);
        diffuseColor.rgb *= 0.93 + 0.1 * mottle;
        float cutFace = 0.0;
        // Fine detail fades out once a pixel spans most of a millimetre, so it never aliases.
        float detail = 1.0 - smoothstep(0.4, 1.0, length(fwidth(vPos)));
        #ifdef FRACTURE
        // Broken bone: a thin ivory cortex at the crack, warmer cancellous bone inside with pores.
        cutFace = step(0.5, vCut);
        if (cutFace > 0.5) {
          vec2 w = worley(vPos / 1.2);
          float strut = 1.0 - smoothstep(0.04, 0.22, w.y - w.x);
          float pore = smoothstep(0.15, 0.55, w.x) * (1.0 - strut);
          vec3 cancellous = vec3(0.61, 0.46, 0.27) * mix(0.8, mix(1.0, 0.45, pore), detail) * (0.9 + 0.2 * mottle);
          diffuseColor.rgb = mix(diffuseColor.rgb * 0.9, cancellous, smoothstep(0.25, 0.45, vRim));
        }
        #endif`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        // Articular surfaces face another bone across the joint, which is where the baked occlusion
        // is high: there the bone reads as cartilage, smoother, glossier and a touch cooler.
        // Beside a see-through fibula the shade it casts goes too, or the talus shows a stain.
        float uncovered = 1.0 - uGhost * smoothstep(-6.0, -16.0, vPos.x) * (1.0 - step(1.5, vBone));
        float articular = smoothstep(0.4, 0.75, vOcc) * (1.0 - step(2.5, vBone)) * uncovered;
        roughnessFactor = clamp(roughnessFactor + 0.16 * (mottle - 0.5) - 0.28 * articular, 0.05, 1.0);
        roughnessFactor = mix(roughnessFactor, 0.85, cutFace);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.86, 0.87, 0.85), 0.35 * articular);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        // Cortical micro-relief: a fine height field, faintly streaked along the shaft, bumps the
        // normal in screen space (the standard derivative method), so no texture is downloaded.
        float relief = 0.7 * noise(vec3(vPos.x * 0.9, vPos.y * 0.25, vPos.z * 0.9)) + 0.3 * noise(vPos * 1.8);
        float bump = 0.05 * (1.0 - articular);
        #ifdef FRACTURE
        // A cut face is rough at about a millimetre.
        relief = mix(relief, 0.6 * noise(vPos * 0.8) + 0.4 * noise(vPos * 1.6), cutFace);
        bump = mix(bump, 0.5 * detail, cutFace);
        #endif
        vec3 dpx = dFdx(-vViewPosition);
        vec3 dpy = dFdy(-vViewPosition);
        vec3 r1 = cross(dpy, normal);
        vec3 r2 = cross(normal, dpx);
        float det = dot(dpx, r1);
        vec3 grad = sign(det) * (dFdx(relief) * r1 + dFdy(relief) * r2);
        normal = normalize(abs(det) * normal - bump * grad);`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        `#include <lights_physical_fragment>
        #ifdef USE_SHEEN
        material.sheenColor *= 1.0 - cutFace;
        #endif
        #ifdef USE_CLEARCOAT
        material.clearcoat *= 1.0 - cutFace;
        #endif`,
      )
      .replace(
        '#include <aomap_fragment>',
        `#include <aomap_fragment>
        // A cut face sits in its crack, which hides most of the sky; it reads darker than the shaft.
        float ao = (1.0 - 0.92 * smoothstep(0.0, 0.75, vOcc) * uncovered) * (1.0 - 0.35 * cutFace);
        reflectedLight.indirectDiffuse *= ao;
        reflectedLight.indirectSpecular *= ao;
        reflectedLight.directDiffuse *= ao;
        reflectedLight.directSpecular *= ao;
        // Light scattered in thin bone warms the edges a little, as in a lit specimen.
        float edge = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.5);
        reflectedLight.indirectDiffuse += vec3(0.16, 0.07, 0.03) * edge * ao;
        // A gentle depth cue: the far side of the model steps back a little.
        float far = clamp((-vViewPosition.z - uNear) / uDepth, 0.0, 1.0);
        reflectedLight.directDiffuse *= 1.0 - 0.18 * far;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        vec3 d = regionField(vPos, vBone);
        vec3 w = max(fwidth(d), 1e-4);
        float on = dot(clamp(0.5 - d / w, 0.0, 1.0), uOn);
        // The region's edge on the bone, a line uLine pixels wide.
        float line = dot(clamp(0.5 * uLine + 0.5 - abs(d) / w, 0.0, 1.0), uOn);
        #ifdef GHOST
        line = clamp(on, 0.0, 1.0) * (1.0 - smoothstep(0.12, 0.3, abs(dot(normal, normalize(vViewPosition)))));
        #endif
        if (vBone > 1.5) {
          float y = vPos.y;
          float px = max(fwidth(y), 1e-4);
          // The syndesmosis level, schematic: two hairlines at the plafond and the top of the
          // tibiofibular contact, bracketed in the gutter, so an answered Weber band reads below, at
          // or above it. No fill, so it stays an annotation and never reads as a mark on the bone.
          #ifndef GHOST
          float syndEdge = clamp(1.0 - min(abs(y), abs(y - uSyndesmosis)) / px, 0.0, 1.0);
          // Not across a marked region, where a hairline would read as a fracture line.
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uMark, uShowSyndesmosis * 0.5 * syndEdge * (1.0 - clamp(on, 0.0, 1.0)));
          #endif
          vec4 inside = clamp(0.5 + min(y - uLevelY0, uLevelY1 - y) / px, 0.0, 1.0);
          vec4 edge = min(abs(y - uLevelY0), abs(y - uLevelY1)) / px;
          on = max(on, dot(inside, uLevelOn));
          line = max(line, dot(clamp(0.5 * uLine + 0.5 - edge, 0.0, 1.0), uLevelOn));
        }
        float tint = 0.4;
        #ifdef GHOST
        tint = 0.75;
        gl_FragColor.a = max(gl_FragColor.a, max(line, 0.45 * clamp(on, 0.0, 1.0)));
        #endif
        gl_FragColor.rgb = mix(gl_FragColor.rgb, uTint, tint * clamp(on, 0.0, 1.0));
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

// A radiograph look: bone adds light where the view grazes it, so cortex and overlapping bones read
// bright on black, as on an X-ray film. Drawn with no depth, every surface adds.
const xrayMaterial = () =>
  new ShaderMaterial({
    vertexShader: /* glsl */ `
      varying float vGraze;
      void main() {
        vGraze = 1.0 - abs(normalize(normalMatrix * normal).z);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vGraze;
      void main() {
        float i = 0.17 + 0.45 * pow(vGraze, 2.0);
        gl_FragColor = vec4(i * vec3(0.9, 0.95, 1.0), 1.0);
      }
    `,
    blending: AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    side: DoubleSide,
  });

// A soft elliptical shadow the bones stand in, so they rest on something rather than float.
const contactMaterial = () =>
  new ShaderMaterial({
    uniforms: { uOpacity: { value: 0.3 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        float r = length((vUv - 0.5) * 2.0);
        gl_FragColor = vec4(0.0, 0.0, 0.0, uOpacity * pow(1.0 - smoothstep(0.0, 1.0, r), 1.6));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });

/** createAnkleScene draws the model on canvas and renders only when asked to. */
export function createAnkleScene(
  canvas: HTMLCanvasElement,
  model: AnkleModel,
  onAnchors: (a: Anchors) => void,
  /** A label's height as last drawn, in pixels, so stacked labels keep clear of each other. */
  labelHeight: (key: string) => number = () => 20,
  /** Frames the fracture region, from the talar dome to the far Weber C line, instead of the whole model. */
  closeUp = false,
) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.1;

  // Lights stay with the camera while the bones turn: a warm key raking from the upper left that
  // casts soft shadows and lets the shaft fall off into shade, a faint cool fill so the shade keeps
  // some form, and a rim from behind on the right that separates the silhouette.
  const key = new DirectionalLight(0xfff1e2, 3.6);
  key.position.set(-120, 90, 35);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 10;
  // A softer, lighter cast shadow: the fibula's edge on the tibial shaft reads as shade, not a line.
  key.shadow.intensity = 0.7;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.4;
  const fillLight = new DirectionalLight(0xe4ecff, 0.6);
  fillLight.position.set(90, -20, 70);
  const rim = new DirectionalLight(0xdfe8ff, 1.6);
  rim.position.set(70, 30, -80);
  scene.add(key, fillLight, rim);

  const bones = new Group();
  const pivot = new Group();
  pivot.add(bones);
  scene.add(pivot);

  const { material: fill, overlay } = boneMaterial();
  // From the lateral side the fibula overlies the posterior tibia, so it turns see-through there,
  // as on a lateral radiograph; this material shares the overlay.
  const ghost = boneMaterial(overlay, true).material;
  Object.assign(ghost, { transparent: true, depthWrite: false });
  // Made only with the fracture, so a figure without it renders exactly as before.
  let fractures: { scene: Fractures; fill: MeshPhysicalMaterial; ghost: MeshPhysicalMaterial } | undefined;
  const outline = outlineMaterial();
  const xray = xrayMaterial();
  let xrayOn = false;
  const { lateralTop, medialTop, medialX, posteriorTop, posteriorZ } = model.regions;
  for (const u of [overlay, outline.uniforms]) {
    u.uRegion.value.set(lateralTop, medialTop, medialX, posteriorTop);
    u.uPosteriorZ.value = posteriorZ;
  }
  overlay.uSyndesmosis.value = model.syndesmosis;
  overlay.uLevelY0.value.fromArray(LEVELS.map((l) => model.bands[l].y[0]));
  overlay.uLevelY1.value.fromArray(LEVELS.map((l) => model.bands[l].y[1]));

  const regions: Record<Structure, Vector3[]> = { lateral: [], medial: [], posterior: [] };
  const names = { [Region.lateral]: 'lateral', [Region.medial]: 'medial', [Region.posterior]: 'posterior' } as const;
  const points: Vector3[] = [];
  const meshes: Record<string, { mesh: Mesh; hull: Mesh }> = {};

  for (const part of model.parts) {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(part.positions, 3));
    g.setAttribute('bone', new BufferAttribute(new Float32Array(part.region.length).fill(BONE[part.name] ?? 0), 1));
    g.setAttribute('occlusion', new BufferAttribute(part.occlusion, 1, true));
    g.setIndex(new BufferAttribute(part.index, 1));
    g.computeVertexNormals();
    const mesh = new Mesh(g, fill);
    mesh.castShadow = mesh.receiveShadow = true;
    const hull = new Mesh(g, outline);
    bones.add(mesh, hull);
    meshes[part.name] = { mesh, hull };
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

  let yaw = START.yaw;
  let pitch = START.pitch;
  // Zoom and pan move the camera only; the frame, lights and labels follow from the projection.
  let zoom = 1;

  // The frame fits the tallest the model gets at any allowed turn, so turning never changes the
  // scale or crops a part, plus room below for the contact shadow. The model is tall and narrow,
  // so a portrait frame holds it tighter than a square and leaves the sides for labels.
  const full = 2.04 * fitHeight(rel) + 8;
  const h = closeUp ? full / CLOSE_UP.zoom : full;
  const frame = { w: h * ASPECT, h, cx: 0, cy: closeUp ? CLOSE_UP.y - center.y : -4 };
  const camera = new OrthographicCamera(
    frame.cx - frame.w / 2,
    frame.cx + frame.w / 2,
    frame.cy + frame.h / 2,
    frame.cy - frame.h / 2,
    -radius * 4,
    radius * 4,
  );
  camera.position.z = radius * 2;
  overlay.uNear.value = radius;
  overlay.uDepth.value = 2 * radius;
  const snapCam = camera.clone();
  key.shadow.camera.left = key.shadow.camera.bottom = -radius;
  key.shadow.camera.right = key.shadow.camera.top = radius;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = radius * 6;
  // 2 mm of depth: the near-to-far range of 8 radii maps to 2 units of clip depth.
  outline.uniforms.uDepthBias.value = (2 * 2) / (8 * radius);
  const silhouette = points.filter((_, i) => i % 8 === 0);

  const contact = new Mesh(new PlaneGeometry(1, 1), contactMaterial());
  const raycaster = new Raycaster();
  contact.renderOrder = -1;
  scene.add(contact);
  const turned = new Vector3();
  // The shadow sits under the lowest part of the bones as they stand, spread as wide as their base.
  function placeContact() {
    const ys: number[] = [];
    const xs: number[] = [];
    for (const p of silhouette) {
      turned.copy(p).sub(center).applyQuaternion(pivot.quaternion);
      ys.push(turned.y);
      xs.push(turned.x);
    }
    const low = Math.min(...ys);
    const base = xs.filter((_, i) => ys[i] < low + 12);
    const [x0, x1] = [Math.min(...base), Math.max(...base)];
    contact.position.set((x0 + x1) / 2, low + 1, -radius * 1.5);
    contact.scale.set((x1 - x0) * 1.35 + 10, 9, 1);
  }

  // How see-through the fibula is: opaque until the lateral side nearly faces the camera.
  function placeFibula() {
    const fibula = meshes.fibula;
    if (!fibula) return;
    if (xrayOn) {
      fibula.mesh.material = xray;
      fibula.hull.visible = false;
      overlay.uGhost.value = 0;
      return;
    }
    const facing = FACING.lateral.clone().applyQuaternion(pivot.quaternion).z;
    const t = Math.min(1, Math.max(0, (facing - 0.82) / 0.15));
    const opacity = 1 - 0.68 * t * t * (3 - 2 * t);
    const clear = opacity < 0.995;
    fibula.mesh.material = clear ? ghost : fill;
    fibula.mesh.castShadow = !clear;
    // A see-through bone writes no depth, so its hull would show whole; it keeps the tint and lines.
    fibula.hull.visible = !clear;
    ghost.opacity = opacity;
    if (fractures) {
      // The uncut fibula stays hidden; its cells take the see-through look instead.
      fibula.hull.visible = false;
      fractures.scene.setGhost(clear);
      fractures.ghost.opacity = opacity;
    }
    overlay.uGhost.value = clear ? (1 - opacity) / 0.68 : 0;
  }

  const sides: Partial<Record<Structure, 'left' | 'right'>> = {};

  // Highlights fade: lateral, medial, posterior, the four levels, proximal, syndesmosis.
  const shown: number[] = Array(9).fill(0);
  let marks: Marks = marksFor({ lateral: false, medial: false, posterior: false, complete: false });
  const fibulaPoints = model.parts.find((p) => p.name === 'fibula')!;
  const syndesmosisPoints: Vector3[] = [];
  for (let i = 0; i < fibulaPoints.positions.length; i += 9) {
    const p = new Vector3().fromArray(fibulaPoints.positions, i);
    if (p.y >= 0 && p.y <= model.syndesmosis) syndesmosisPoints.push(p);
  }
  let target = shown;
  let fade = 0;
  function applyShown() {
    for (const u of [overlay, outline.uniforms]) u.uOn.value.set(shown[0], shown[1], shown[2]);
    overlay.uLevelOn.value.set(shown[3], shown[4], shown[5], shown[6]);
    overlay.uShowSyndesmosis.value = shown[8];
    arrowInk.opacity = shown[7];
    arrow.visible = shown[7] > 0.001;
  }

  // Only answered structures are labelled, so only they claim a place in a label column.
  const shownLabel = (key: string) => (key === 'syndesmosis' ? marks.syndesmosis : marks[key as Structure]);

  function render() {
    pivot.rotation.set(pitch, yaw, 0);
    pivot.updateMatrixWorld();
    placeContact();
    placeFibula();
    renderer.render(scene, camera);
    const size = renderer.getSize(new Vector2());
    const toPx = (p: Vector3) => {
      const v = p.clone().applyMatrix4(bones.matrixWorld).project(camera);
      return { x: ((v.x + 1) / 2) * size.x, y: ((1 - v.y) / 2) * size.y };
    };
    const anchors: Anchors = {};
    const back = (key: Structure) => FACING[key].clone().applyQuaternion(pivot.quaternion).z < HIDDEN[key];

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
    // Every label sits whole in the gutter beyond a leader of at least LEADER_MIN, so its backdrop
    // never covers a mark; a name too long for a narrow gutter wraps instead. Moving a label to the
    // other gutter would send its leader across the bone, so labels keep their side.
    const place = (a: Anchor) => {
      a.labelX = a.side === 'left' ? Math.min(gutter.left, a.x - LEADER_MIN) : Math.max(gutter.right, a.x + LEADER_MIN);
      a.maxWidth = Math.max(48, a.side === 'left' ? a.labelX - 4 : size.x - 4 - a.labelX);
    };
    for (const key of Object.keys(regions) as Structure[]) place(anchors[key]!);
    // The syndesmosis bracket sits on the lateral side, beside the fibula from the plafond to the top
    // of the contact.
    const sp = syndesmosisPoints.map(toPx);
    // The fibula's own side, even when the malleolus label moved across to fit.
    const sideS = sides.lateral!;
    const edge = sideS === 'left' ? Math.min(...sp.map((p) => p.x)) : Math.max(...sp.map((p) => p.x));
    const [sy0, sy1] = [Math.min(...sp.map((p) => p.y)), Math.max(...sp.map((p) => p.y))];
    anchors.syndesmosis = {
      x: edge + (sideS === 'left' ? -4 : 4),
      y: sy0,
      y2: sy1,
      labelX: 0,
      labelY: (sy0 + sy1) / 2,
      side: sideS,
      back: FACING.lateral.clone().applyQuaternion(pivot.quaternion).z < -0.8,
    };
    place(anchors.syndesmosis);
    // Labels on one side keep their order but never overlap.
    for (const side of ['left', 'right'] as const) {
      const column = (Object.entries(anchors) as [string, Anchor][])
        .filter(([key, a]) => a.side === side && shownLabel(key))
        .sort(([, a], [, b]) => a.labelY - b.labelY);
      const gap = (i: number) => Math.max(LABEL_STEP, (labelHeight(column[i - 1][0]) + labelHeight(column[i][0])) / 2 + 10);
      for (let i = 1; i < column.length; i++) column[i][1].labelY = Math.max(column[i][1].labelY, column[i - 1][1].labelY + gap(i));
      // Centre the stack on its anchors, so the leaders fan out rather than all running downwards.
      if (column.length > 1) {
        const shift = column.reduce((s, [, a]) => s + a.y - a.labelY, 0) / column.length;
        for (const [, a] of column) a.labelY = Math.max(12, Math.min(size.y - 12, a.labelY + shift));
      }
    }
    onAnchors(anchors);
  }

  function pan(dx: number, dy: number) {
    const size = renderer.getSize(new Vector2());
    const [mx, my] = [(frame.w / 2) * (1 - 1 / zoom), (frame.h / 2) * (1 - 1 / zoom)];
    camera.position.x = Math.max(-mx, Math.min(mx, camera.position.x - (dx / size.x) * (frame.w / zoom)));
    camera.position.y = Math.max(-my, Math.min(my, camera.position.y + (dy / size.y) * (frame.h / zoom)));
    camera.updateProjectionMatrix();
    render();
  }

  function setTarget(next: number[]) {
    target = next;
    cancelAnimationFrame(fade);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.splice(0, 9, ...target);
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

  // The answers last shown, for fractures that arrive after them.
  let latest: AnatomyState | undefined;
  let disposed = false;
  function setState(state: AnatomyState) {
    latest = state;
    marks = marksFor(state);
    // A fracture at the malleolus is one region, topped by its level.
    const top = marks.lateralTop ? model.bands[marks.lateralTop].y[1] : model.regions.lateralTop;
    for (const u of [overlay, outline.uniforms]) u.uRegion.value.x = top;
    // With the fracture drawn, the break itself marks the bone: no tint or level band.
    const tint = !fractures;
    fractures?.scene.setPose(fracturePose(state));
    setTarget([
      +(tint && marks.lateral),
      +(tint && marks.medial),
      +(tint && marks.posterior),
      ...LEVELS.map((l) => +(tint && marks.band === l)),
      +marks.proximal,
      // The bracket label stays; its hairlines on the fibula would read as fracture lines.
      +(tint && marks.syndesmosis),
    ]);
  }

  return {
    render,
    /** rotate turns the model by the given angles in radians; pitch stops at the limits. */
    rotate(dYaw: number, dPitch: number) {
      yaw += dYaw;
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch + dPitch));
      render();
    },
    /** setXray draws the bones as on a radiograph, white on the black the figure puts behind them, or as bone again. */
    setXray(on: boolean) {
      xrayOn = on;
      for (const { mesh, hull } of Object.values(meshes)) {
        mesh.material = on ? xray : fill;
        hull.visible = !on && mesh.visible;
      }
      contact.visible = !on;
      fractures?.scene.setXray(on ? xray : undefined);
      render();
    },
    /** setDisplaced shows the fracture displaced, or closed with every fragment in place. */
    setDisplaced(on: boolean) {
      fractures?.scene.setDisplaced(on);
      render();
    },
    /** pick names the fragment or bone at canvas pixel (px, py), or undefined over the backdrop. */
    pick(px: number, py: number): string | undefined {
      const size = renderer.getSize(new Vector2());
      raycaster.setFromCamera(new Vector2((px / size.x) * 2 - 1, 1 - (py / size.y) * 2), camera);
      const targets = [meshes.talus?.mesh, ...(fractures ? [fractures.scene.root] : [])].filter((o): o is Mesh | Group => !!o);
      for (const hit of raycaster.intersectObjects(targets, true)) {
        if (hit.object === meshes.talus?.mesh) return 'talus';
        const name = fractures?.scene.nameAt(hit.object);
        if (name) return name;
      }
      return undefined;
    },
    /** zoom is the current zoom: 1 frames the whole model, up to ZOOM_MAX. */
    zoom: () => zoom,
    /**
     * zoomAt sets the zoom, keeping the point at canvas pixel (px, py) still; the centre when
     * omitted. The view never pans past the model's frame.
     */
    zoomAt(next: number, px?: number, py?: number) {
      const size = renderer.getSize(new Vector2());
      const [u, v] = [(px ?? size.x / 2) / size.x - 0.5, 0.5 - (py ?? size.y / 2) / size.y];
      const z = Math.max(1, Math.min(ZOOM_MAX, next));
      camera.position.x += u * frame.w * (1 / zoom - 1 / z);
      camera.position.y += v * frame.h * (1 / zoom - 1 / z);
      zoom = camera.zoom = z;
      pan(0, 0);
    },
    /** pan moves the zoomed view by canvas pixels, as if dragging the model. */
    pan,
    /** view is the current turn, in radians. */
    view: () => ({ yaw, pitch }),
    /** setView turns the model to the given yaw and pitch, in radians. */
    setView(next: { yaw: number; pitch: number }) {
      yaw = next.yaw;
      pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, next.pitch));
      render();
    },
    /**
     * snapshot draws the model at a fixed turn into a 2D canvas, framed tightly with an even
     * margin, with the answered marks at full strength. It borrows this renderer for one frame and
     * puts the live view back in the same task, so the page never shows the borrowed frame and no
     * second WebGL context is made.
     */
    snapshot(at: { yaw: number; pitch: number }, out: HTMLCanvasElement) {
      const live = { yaw, pitch, size: renderer.getSize(new Vector2()), ratio: renderer.getPixelRatio(), shown: [...shown] };
      yaw = at.yaw;
      pitch = at.pitch;
      shown.splice(0, 9, ...target);
      applyShown();
      const restore = fractures?.scene.atTarget();
      pivot.rotation.set(pitch, yaw, 0);
      pivot.updateMatrixWorld();
      placeContact();
      placeFibula();
      // Framed on the joint, as a radiograph is: the shafts run off the top edge.
      // Taller when a level band or the proximal arrow runs higher, so the mark stays in frame.
      const top = marks.proximal ? model.proximal.y[0] + 14 : marks.band ? model.bands[marks.band].y[1] + 6 : 0;
      const joint = silhouette.filter((p) => p.y < Math.max(SNAPSHOT_TOP_MM, top));
      const box = new Box3().setFromPoints(joint.map((p) => p.clone().sub(center).applyQuaternion(pivot.quaternion)));
      const aspect = out.width / out.height;
      const [bw, bh] = [box.max.x - box.min.x, box.max.y - box.min.y + 6];
      const half = { h: (Math.max(bh, bw / aspect) * 1.12) / 2 };
      const [cx, cy] = [(box.max.x + box.min.x) / 2, (box.max.y + box.min.y - 6) / 2];
      Object.assign(snapCam, { left: cx - half.h * aspect, right: cx + half.h * aspect, top: cy + half.h, bottom: cy - half.h });
      snapCam.updateProjectionMatrix();
      renderer.setPixelRatio(1);
      renderer.setSize(out.width, out.height, false);
      outline.uniforms.uViewport.value.set(out.width, out.height);
      renderer.render(scene, snapCam);
      const ctx = out.getContext('2d')!;
      ctx.clearRect(0, 0, out.width, out.height);
      ctx.drawImage(canvas, 0, 0);
      yaw = live.yaw;
      pitch = live.pitch;
      shown.splice(0, 9, ...live.shown);
      applyShown();
      restore?.();
      renderer.setPixelRatio(live.ratio);
      renderer.setSize(live.size.x, live.size.y, false);
      outline.uniforms.uViewport.value.set(live.size.x * live.ratio, live.size.y * live.ratio);
      render();
    },
    resize(width: number) {
      const height = width / ASPECT;
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
      // Ivory glares on a dark page; a stop down keeps it bone rather than paper, and the contact
      // shadow deepens to still read on the near-black backdrop.
      const dark = paper.getHSL({ h: 0, s: 0, l: 0 }).l < 0.5;
      renderer.toneMappingExposure = dark ? 0.82 : 1;
      (contact.material as ShaderMaterial).uniforms.uOpacity.value = dark ? 0.6 : 0.28;
      render();
    },
    /** setFractures draws the bones as fracture cells, posed by the latest setState, once their programs compile. */
    async setFractures(fractureModel: FractureModel) {
      const frac = { fill: boneMaterial(overlay, false, true).material, ghost: boneMaterial(overlay, true, true).material };
      Object.assign(frac.ghost, { transparent: true, depthWrite: false });
      const { tibia, fibula, talus } = meshes;
      const uncut = { tibia: tibia.mesh.geometry, fibula: fibula.mesh.geometry };
      // 1 mm of clip depth: the near-to-far range of 8 radii maps to 2 units (see the outline's bias).
      const built = buildFractures(fractureModel, uncut, frac, 2 / (8 * radius), [talus.mesh, talus.hull], render, ease);
      // Compiled before they show, in parallel where the browser can, so the swap does not stall a frame.
      // Ghosting the fibula compiles both materials in one pass; the next render sets it right.
      built.setGhost(true);
      await renderer.compileAsync(built.root, camera, scene);
      if (disposed) {
        built.dispose();
        for (const m of [frac.fill, frac.ghost]) m.dispose();
        return;
      }
      fractures = { scene: built, ...frac };
      bones.add(built.root);
      for (const m of [tibia, fibula]) m.mesh.visible = m.hull.visible = false;
      if (xrayOn) built.setXray(xray);
      if (latest) setState(latest);
    },
    setState,
    dispose() {
      disposed = true;
      cancelAnimationFrame(fade);
      fractures?.scene.dispose();
      if (fractures) for (const m of [fractures.fill, fractures.ghost]) m.dispose();
      scene.traverse((o) => {
        if (o instanceof Mesh) o.geometry.dispose();
      });
      for (const m of [fill, ghost, outline, xray, arrowInk, contact.material] as Material[]) m.dispose();
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
