import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { AnatomyState } from './anatomyState';
import { parseAnkleModel, type AnkleModel } from './ankleModel';
import { createAnkleScene, type Anchors, type AnkleScene, type Ink, type View } from './ankleScene';

const DEG = Math.PI / 180;
const DRAG = 0.6 * DEG; // per pixel
const KEY_YAW = 15 * DEG;
const KEY_PITCH = 10 * DEG;
const DECAY_MS = 160; // release glide time constant
// First open only: the model swings in from a quarter turn to show that it turns.
const INTRO = { turn: -50 * DEG, ms: 1400 };
let introduced = false;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** VIEWS are the fixed front (AP) and side (lateral) views; the side view looks at the lateral malleolus with the front to the right. */
const VIEWS = {
  front: { yaw: 0, pitch: 0, labels: ['lateral', 'medial'] },
  // The fibula overlies the posterior tibia from the side, so it is see-through there.
  side: { yaw: 90 * DEG, pitch: 0, labels: [], ghost: 'fibula' },
} satisfies Record<string, View>;

// Highlight changes fade or recolour in 200ms on the house curve.
const fade = 'transition-[color,fill,stroke,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]';

// A structure facing away keeps its label only while highlighted, faded and on a dashed leader.
const behind = (on: boolean) => (on ? 'data-[back=true]:opacity-70' : 'data-[back=true]:opacity-0');

const LABELS = [
  ['lateral', 'anatomy.lateral'],
  ['medial', 'anatomy.medial'],
  ['posterior', 'anatomy.model3d.posterior'],
] as const;
type Structure = (typeof LABELS)[number][0];

// One download and parse, shared by every view on the page; a failure lets the next view retry.
let model: Promise<AnkleModel> | undefined;
function loadModel() {
  model ??= fetch('/models/ankle/ankle.bin')
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`ankle.bin ${r.status}`))))
    .then(parseAnkleModel)
    .catch((e) => {
      model = undefined;
      throw e;
    });
  return model;
}

interface Overlay {
  labels: Partial<Record<Structure, HTMLSpanElement | null>>;
  leaders: Partial<Record<Structure, SVGGElement | null>>;
}

/** useAnkleScene draws the model on the canvas once it has a size, so a hidden view costs nothing. */
function useAnkleScene(canvasRef: RefObject<HTMLCanvasElement | null>, overlay: Overlay, state: AnatomyState, onFail: () => void, view?: View) {
  const sceneRef = useRef<AnkleScene | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let scene: AnkleScene | undefined;
    let started = false;
    let cancelled = false;
    const theme = new MutationObserver(() => scene?.setInk(readInk(canvas)));
    const resize = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (scene) return scene.resize(width);
      if (started || width === 0) return;
      started = true;
      loadModel()
        .then((m) => {
          if (cancelled) return;
          scene = createAnkleScene(canvas, m, (anchors) => placeLabels(overlay, anchors), view);
          sceneRef.current = scene;
          canvas.style.aspectRatio = String(scene.aspect);
          scene.setInk(readInk(canvas));
          scene.resize(canvas.getBoundingClientRect().width);
          // The theme toggles a class on <html>; redraw in the new ink.
          theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
          setReady(true);
        })
        .catch(() => !cancelled && onFail());
    });
    resize.observe(canvas);

    return () => {
      cancelled = true;
      resize.disconnect();
      theme.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => sceneRef.current?.setState(state), [state, ready]);
  return { sceneRef, ready };
}

/** Labels draws the structure names and their leaders over a view; the scene places them every frame. */
function Labels({ overlay, state, keys, ready }: { overlay: Overlay; state: AnatomyState; keys: readonly Structure[]; ready: boolean }) {
  const { t } = useTranslation();
  const shown = LABELS.filter(([key]) => keys.includes(key));
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', !ready && 'hidden')}>
      <svg className="absolute inset-0 size-full overflow-visible">
        {shown.map(([key]) => (
          <g
            key={key}
            ref={(el) => {
              overlay.leaders[key] = el;
            }}
            className={cn(fade, behind(state[key]), state[key] ? 'fill-(--hl) stroke-(--hl)' : 'fill-(--bone-line) stroke-(--bone-line)')}
          >
            <line strokeWidth="1" />
            <circle r="2" className="stroke-(--hl-halo)" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
      {shown.map(([key, text]) => (
        <span
          key={key}
          ref={(el) => {
            overlay.labels[key] = el;
          }}
          className={cn('group absolute left-0 top-0', fade, behind(state[key]))}
        >
          <span
            className={cn(
              'block whitespace-nowrap px-1 text-xs leading-4',
              fade,
              'group-data-[side=left]:-translate-x-full group-data-[side=left]:-translate-y-1/2 group-data-[side=right]:-translate-y-1/2 group-data-[side=below]:-translate-x-1/2',
              state[key] ? 'font-semibold text-primary' : 'text-muted-foreground',
            )}
          >
            {t(text)}
          </span>
        </span>
      ))}
    </div>
  );
}

const backdrop = 'block w-full rounded-sm bg-(--fig-backdrop)';

/** AnkleView is one fixed view of the model, for the figure's front and side panels. */
export function AnkleView({ state, view, onFail }: { state: AnatomyState; view: keyof typeof VIEWS; onFail: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // A stable holder the scene writes label positions into, outside React state.
  const [overlay] = useState<Overlay>(() => ({ labels: {}, leaders: {} }));
  const { labels } = VIEWS[view];
  const { ready } = useAnkleScene(canvasRef, overlay, state, onFail, VIEWS[view]);
  return (
    // The labels hang under the view, so it keeps a line of room for them.
    <div className={cn('relative', labels.length > 0 && 'pb-5')}>
      <canvas ref={canvasRef} aria-hidden="true" className={cn(backdrop, view === 'front' ? 'aspect-[3/4]' : 'aspect-square', fade, ready ? 'opacity-100' : 'opacity-0')} />
      <Labels overlay={overlay} state={state} keys={labels} ready={ready} />
    </div>
  );
}

interface Anatomy3DProps {
  state: AnatomyState;
  /** Called when the model cannot be shown, so the figure comes back. */
  onFail: () => void;
}

/** Anatomy3D shows the BodyParts3D ankle to turn freely, with the same highlights as the figure; loaded on demand. */
export default function Anatomy3D({ state, onFail }: Anatomy3DProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // A stable holder the scene writes label positions into, outside React state.
  const [overlay] = useState<Overlay>(() => ({ labels: {}, leaders: {} }));
  const { sceneRef, ready } = useAnkleScene(canvasRef, overlay, state, onFail);
  const drag = useRef<{ id: number; x: number; y: number; t: number; vx: number; vy: number } | null>(null);
  const glide = useRef(0);
  const hintId = useId();

  // A one-time swing on first open shows that the model turns; a drag, a key or Reset stops it.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!ready || !scene || introduced || reducedMotion()) return;
    introduced = true;
    scene.rotate(INTRO.turn, 0);
    const start = performance.now();
    let done = 0;
    const step = (now: number) => {
      const k = easeInOut(Math.min((now - start) / INTRO.ms, 1));
      scene.rotate(-INTRO.turn * (k - done), 0);
      done = k;
      if (k < 1) glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(glide.current);
  }, [ready, sceneRef]);

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (drag.current) return; // a second finger does not take over the drag
    cancelAnimationFrame(glide.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, vx: 0, vy: 0 };
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const [dx, dy, dt] = [e.clientX - d.x, e.clientY - d.y, Math.max(e.timeStamp - d.t, 1)];
    sceneRef.current?.rotate(dx * DRAG, dy * DRAG);
    // Smoothed velocity in radians per millisecond, for the glide after release.
    d.vx = 0.8 * ((dx * DRAG) / dt) + 0.2 * d.vx;
    d.vy = 0.8 * ((dy * DRAG) / dt) + 0.2 * d.vy;
    Object.assign(d, { x: e.clientX, y: e.clientY, t: e.timeStamp });
  }

  function onPointerUp(e: PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    // A paused pointer has no momentum; reduced motion gets no glide at all.
    if (e.timeStamp - d.t > 80 || reducedMotion()) return;
    let { vx, vy } = d;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      sceneRef.current?.rotate(vx * dt, vy * dt);
      const k = Math.exp(-dt / DECAY_MS);
      vx *= k;
      vy *= k;
      if (Math.abs(vx) + Math.abs(vy) > 0.00002) glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
  }

  function onKeyDown(e: KeyboardEvent<HTMLCanvasElement>) {
    const turn: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_YAW, 0],
      ArrowRight: [KEY_YAW, 0],
      ArrowUp: [0, -KEY_PITCH],
      ArrowDown: [0, KEY_PITCH],
    };
    if (e.key === 'Home') sceneRef.current?.reset();
    else if (turn[e.key]) sceneRef.current?.rotate(...turn[e.key]);
    else return;
    cancelAnimationFrame(glide.current);
    e.preventDefault();
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={t('anatomy.model3d.canvas')}
          aria-describedby={hintId}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          // pan-y keeps the page scrollable on touch; a horizontal drag turns the model.
          className={cn(
            backdrop,
            'aspect-[4/5] cursor-grab touch-pan-y outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring active:cursor-grabbing',
            fade,
            ready ? 'opacity-100' : 'opacity-0',
          )}
        />
        <Labels overlay={overlay} state={state} keys={['lateral', 'medial', 'posterior']} ready={ready} />
        {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{t('anatomy.model3d.loading')}</p>}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => {
            cancelAnimationFrame(glide.current);
            sceneRef.current?.reset();
          }}
          aria-label={t('anatomy.model3d.reset')}
          title={t('anatomy.model3d.reset')}
          className="absolute right-2 top-2"
          disabled={!ready}
        >
          <RotateCcw />
        </Button>
      </div>
      <p aria-hidden="true" className="text-xs leading-4 text-muted-foreground">
        {t('anatomy.model3d.hintShort')}
      </p>
      <p id={hintId} className="sr-only">
        {t('anatomy.model3d.hint')}
      </p>
    </div>
  );
}

// Labels move with every rendered frame, so they are placed directly rather than through React state.
function placeLabels({ labels, leaders }: Overlay, anchors: Anchors) {
  for (const key of Object.keys(anchors) as Structure[]) {
    const a = anchors[key]!;
    const label = labels[key];
    const leader = leaders[key];
    if (label) {
      label.style.transform = `translate(${a.labelX}px, ${a.labelY}px)`;
      label.dataset.back = String(a.back);
      label.dataset.side = a.side;
    }
    if (leader) {
      leader.dataset.back = String(a.back);
      const [line, dot] = leader.children;
      line.setAttribute('x1', String(a.x));
      line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(a.labelX));
      line.setAttribute('y2', String(a.labelY));
      line.setAttribute('stroke-dasharray', a.back ? '2 3' : 'none');
      dot.setAttribute('cx', String(a.x));
      dot.setAttribute('cy', String(a.y));
    }
  }
}

// A probe resolves each token (color-mix included) to a colour, and canvas 2D turns that into
// sRGB bytes that three.js can parse.
function readInk(el: HTMLElement): Ink {
  const probe = el.parentElement!.appendChild(document.createElement('span'));
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  const rgb = (name: string) => {
    probe.style.color = `var(${name})`;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = getComputedStyle(probe).color;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  };
  const ink = { paper: rgb('--card'), mark: rgb('--hl'), tint: rgb('--hl-tint') };
  probe.remove();
  return ink;
}
