import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { PRESETS, presetFor, type Focus, type Preset } from './anatomyCamera';
import { marksFor } from './anatomyMarks';
import { setSnapshot } from './anatomySnapshots';
import { getAnatomyState, type AnatomyState } from './anatomyState';
import { parseAnkleModel, type AnkleModel } from './ankleModel';
import { createAnkleScene, ZOOM_MAX, type Anchors, type AnkleScene, type Ink } from './ankleScene';

const DEG = Math.PI / 180;
const DRAG = 0.6 * DEG; // per pixel
const KEY_YAW = 15 * DEG;
const KEY_PITCH = 10 * DEG;
const DECAY_MS = 160; // release glide time constant
const TURN_MS = 600;
const ZOOM_STEP = 1.5; // per button press or key
const WHEEL_ZOOM = 0.01; // per wheel pixel, as a power of e
const HANDS_OFF_MS = 2000; // after a drag or a key, answers do not turn the model for this long
// First open only, with no answer yet: the model swings in from a quarter turn to show that it turns.
const INTRO = { turn: -50 * DEG, ms: 1400 };
let introduced = false;
// In-out on the house curve family: symmetric, no overshoot.
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NONE: Focus = { state: getAnatomyState({}), posteriorAsked: false };

// Highlight changes fade or recolour in 200ms on the house curve.
const fade = 'transition-[color,fill,stroke,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]';

// Only answered structures are labelled; the syndesmosis is labelled while the fibular level is in
// question, as the reference the level is read against.
const LABELS = [
  ['lateral', 'anatomy.structureNames.lateral'],
  ['medial', 'anatomy.structureNames.medial'],
  ['posterior', 'anatomy.structureNames.posterior'],
  ['syndesmosis', 'anatomy.syndesmosis'],
] as const;
type Labelled = (typeof LABELS)[number][0];

const PAIR = [
  ['ap', 'anatomy.model3d.ap', 'anatomy.model3d.showAp'],
  ['lateral', 'anatomy.model3d.lateralView', 'anatomy.model3d.showLateral'],
] as const;

// One download and parse, shared by every figure on the page; a failure lets the next one retry.
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
  labels: Partial<Record<Labelled, HTMLSpanElement | null>>;
  leaders: Partial<Record<Labelled, SVGGElement | null>>;
}

interface Anatomy3DProps {
  state: AnatomyState;
  /** The posterior-fragment question is the one being asked, so the model turns to show it. */
  posteriorAsked?: boolean;
  /** From lg, puts the AP and Lateral pair beside the 3D view, stacked, instead of under it. */
  compact?: boolean;
  /** Called when the model cannot be shown, so the figure falls back to text. */
  onFail: () => void;
  /** Opens on this view instead of following the answers there. */
  view?: Preset;
}

/**
 * Anatomy3D shows the BodyParts3D ankle to turn freely, turns it to what each answer newly
 * involves, and pairs it with AP and Lateral views drawn by the same renderer; loaded on demand.
 */
export default function Anatomy3D({ state, posteriorAsked = false, compact = false, onFail, view }: Anatomy3DProps) {
  const marks = marksFor(state);
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pairRef = useRef<Partial<Record<Preset, HTMLCanvasElement | null>>>({});
  // A stable holder the scene writes label positions into, outside React state.
  const [overlay] = useState<Overlay>(() => ({ labels: {}, leaders: {} }));
  const sceneRef = useRef<AnkleScene | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState(0);
  const [at, setAt] = useState<Preset | undefined>(view ?? 'anterolateral');
  const [zoom, setZoom] = useState(1);
  const drag = useRef<{ id: number; x: number; y: number; t: number; vx: number; vy: number; pan: boolean } | null>(null);
  // Touch points on the canvas, for a two-finger pinch and pan.
  const touches = useRef(new Map<number, { x: number; y: number }>());
  const glide = useRef(0);
  const touched = useRef(-Infinity);
  const seen = useRef<Focus>(NONE);
  const hintId = useId();

  // The scene is made once the canvas has a size, so a hidden figure costs nothing; it then lives
  // as long as the figure, and answers only update its marks.
  useEffect(() => {
    const canvas = canvasRef.current!;
    let scene: AnkleScene | undefined;
    let started = false;
    let cancelled = false;
    const themeObserver = new MutationObserver(() => {
      scene?.setInk(readInk(canvas));
      setTheme((n) => n + 1);
    });
    const resize = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (scene) return scene.resize(width);
      if (started || width === 0) return;
      started = true;
      loadModel()
        .then((m) => {
          if (cancelled) return;
          scene = createAnkleScene(canvas, m, (anchors) => placeLabels(overlay, anchors), (key) => overlay.labels[key as Labelled]?.offsetHeight ?? 20);
          sceneRef.current = scene;
          scene.setInk(readInk(canvas));
          scene.resize(canvas.getBoundingClientRect().width);
          if (view) scene.setView(PRESETS[view]);
          // The theme toggles a class on <html>; redraw in the new ink.
          themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
          setReady(true);
        })
        .catch(() => !cancelled && onFail());
    });
    resize.observe(canvas);
    // Ctrl or Cmd with the wheel, and a trackpad pinch, zoom; a plain wheel still scrolls the page.
    const onWheel = (e: WheelEvent) => {
      if (!scene || !(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      handled();
      const box = canvas.getBoundingClientRect();
      zoomTo(scene.zoom() * Math.exp(-e.deltaY * WHEEL_ZOOM), e.clientX - box.left, e.clientY - box.top);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      cancelled = true;
      cancelAnimationFrame(glide.current);
      resize.disconnect();
      themeObserver.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function zoomTo(next: number, px?: number, py?: number) {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.zoomAt(next, px, py);
    setZoom(scene.zoom());
  }

  // A turn to a view also zooms back out, so the whole of what it shows is in frame.
  function turnTo(preset: Preset) {
    const scene = sceneRef.current;
    if (!scene) return;
    cancelAnimationFrame(glide.current);
    setAt(preset);
    const to = PRESETS[preset];
    const from = scene.view();
    const z0 = scene.zoom();
    // The short way round.
    const dYaw = Math.atan2(Math.sin(to.yaw - from.yaw), Math.cos(to.yaw - from.yaw));
    if (reducedMotion()) {
      zoomTo(1);
      return scene.setView({ ...to, yaw: from.yaw + dYaw });
    }
    const start = performance.now();
    const step = (now: number) => {
      const k = easeInOut(Math.min((now - start) / TURN_MS, 1));
      if (z0 !== 1) zoomTo(z0 + (1 - z0) * k);
      scene.setView({ yaw: from.yaw + dYaw * k, pitch: from.pitch + (to.pitch - from.pitch) * k });
      if (k < 1) glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
  }

  // Marks update in place; a newly involved region turns the model to it unless the rater has just
  // handled the model. The first open turns to the answers already given, or swings once to show
  // that the model turns.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!ready || !scene) return;
    scene.setState(state);
    const focus = { state, posteriorAsked };
    // A figure opened on a set view stays on it for the answers it opened with.
    const preset = view && seen.current === NONE ? undefined : presetFor(seen.current, focus);
    const first = seen.current === NONE && !view;
    seen.current = focus;
    if (preset) {
      if (!drag.current && performance.now() - touched.current > HANDS_OFF_MS) turnTo(preset);
    } else if (first && !introduced && !reducedMotion()) {
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
    }
    // view only sets where a figure opens, and turnTo reads refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, posteriorAsked, ready]);

  // The AP and Lateral pair redraws only when the answers, the theme or its size change.
  useEffect(() => {
    if (!ready) return;
    const draw = () => {
      for (const [preset] of PAIR) {
        const out = pairRef.current[preset];
        if (!out || !out.clientWidth) continue;
        const ratio = Math.min(window.devicePixelRatio, 3);
        out.width = Math.round(out.clientWidth * ratio);
        out.height = Math.round(out.clientHeight * ratio);
        sceneRef.current?.snapshot(PRESETS[preset], out);
        setSnapshot(preset, out.toDataURL());
      }
    };
    // Coalesced to one draw per task; a theme switch redraws at once, so the pair never lags it.
    let timer = window.setTimeout(draw);
    const resize = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(draw);
    });
    Object.values(pairRef.current).forEach((el) => el && resize.observe(el));
    return () => {
      clearTimeout(timer);
      resize.disconnect();
    };
  }, [state, ready, theme]);

  function handled() {
    cancelAnimationFrame(glide.current);
    touched.current = performance.now();
    setAt(undefined);
  }

  function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
    if (e.pointerType === 'touch') touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // A second finger turns the drag into a pinch; a third is ignored.
    if (touches.current.size === 2) drag.current = null;
    if (drag.current || touches.current.size > 2) return;
    handled();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Shift-drag, or a right or middle drag, pans a zoomed view instead of turning it.
    const pan = e.shiftKey || e.button === 1 || e.button === 2;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, vx: 0, vy: 0, pan };
  }

  function onPinch(e: PointerEvent<HTMLCanvasElement>) {
    const [a, b] = [...touches.current.values()];
    const before = { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    touches.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const [c, d] = [...touches.current.values()];
    const after = { d: Math.hypot(c.x - d.x, c.y - d.y), x: (c.x + d.x) / 2, y: (c.y + d.y) / 2 };
    const scene = sceneRef.current;
    if (!scene || !before.d) return;
    const box = e.currentTarget.getBoundingClientRect();
    zoomTo((scene.zoom() * after.d) / before.d, after.x - box.left, after.y - box.top);
    scene.pan(after.x - before.x, after.y - before.y);
    touched.current = performance.now();
  }

  function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
    if (touches.current.size === 2 && touches.current.has(e.pointerId)) return onPinch(e);
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const [dx, dy, dt] = [e.clientX - d.x, e.clientY - d.y, Math.max(e.timeStamp - d.t, 1)];
    if (d.pan) {
      sceneRef.current?.pan(dx, dy);
      Object.assign(d, { x: e.clientX, y: e.clientY, t: e.timeStamp });
      return;
    }
    sceneRef.current?.rotate(dx * DRAG, dy * DRAG);
    // Smoothed velocity in radians per millisecond, for the glide after release.
    d.vx = 0.8 * ((dx * DRAG) / dt) + 0.2 * d.vx;
    d.vy = 0.8 * ((dy * DRAG) / dt) + 0.2 * d.vy;
    Object.assign(d, { x: e.clientX, y: e.clientY, t: e.timeStamp });
  }

  function onPointerUp(e: PointerEvent<HTMLCanvasElement>) {
    touches.current.delete(e.pointerId);
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    touched.current = performance.now();
    // A paused pointer has no momentum; reduced motion gets no glide at all.
    if (d.pan || e.timeStamp - d.t > 80 || reducedMotion()) return;
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
    if (e.key === 'Home') {
      e.preventDefault();
      return turnTo('anterolateral');
    }
    const zoomKey: Record<string, number> = { '+': ZOOM_STEP, '=': ZOOM_STEP, '-': 1 / ZOOM_STEP, '0': 0 };
    if (e.key in zoomKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handled();
      return zoomTo(zoomKey[e.key] ? (sceneRef.current?.zoom() ?? 1) * zoomKey[e.key] : 1);
    }
    if (!turn[e.key]) return;
    handled();
    sceneRef.current?.rotate(...turn[e.key]);
    e.preventDefault();
  }

  return (
    <div className={compact ? 'space-y-2 lg:grid lg:grid-cols-[minmax(0,1fr)_9rem] lg:gap-2 lg:space-y-0' : 'space-y-2'}>
      <div className="space-y-2">
        <div className="relative overflow-hidden rounded-sm bg-(--fig-backdrop)">
          <canvas
            ref={canvasRef}
            tabIndex={0}
            aria-label={t('anatomy.model3d.canvas')}
            aria-describedby={hintId}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={onKeyDown}
            // pan-y keeps the page scrollable on touch while a horizontal drag turns the model; zoomed
            // in, every drag belongs to the model.
            className={cn(
              zoom > 1 ? 'touch-none' : 'touch-pan-y',
              'block aspect-square w-full cursor-grab rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring active:cursor-grabbing',
              fade,
              ready ? 'opacity-100' : 'opacity-0',
            )}
          />
          {/* Labels are drawn for the whole model; zoomed in they would crowd the edges, so they fade out. */}
          <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', fade, zoom > 1 ? 'opacity-0' : 'opacity-100', !ready && 'hidden')}>
            <svg className="absolute inset-0 size-full overflow-visible">
              {LABELS.map(([key]) => (
                <g
                  key={key}
                  ref={(el) => {
                    overlay.leaders[key] = el;
                  }}
                  // A hidden structure gets no leader: it would land on the bone in front.
                  className={cn(fade, 'fill-(--hl) stroke-(--hl) data-[back=true]:opacity-0', marks[key] ? 'opacity-100' : 'opacity-0')}
                >
                  {key === 'syndesmosis' ? (
                    <path fill="none" strokeWidth="1" />
                  ) : (
                    <>
                      <line strokeWidth="1" />
                      <circle r="2" className="stroke-(--hl-halo)" strokeWidth="1.5" />
                    </>
                  )}
                </g>
              ))}
            </svg>
            {LABELS.map(([key, text]) => (
              <span
                key={key}
                ref={(el) => {
                  overlay.labels[key] = el;
                }}
                className={cn('group absolute left-0 top-0', fade, marks[key] ? 'opacity-100' : 'opacity-0', key === 'syndesmosis' && 'data-[back=true]:opacity-0')}
              >
                <span
                  className={cn(
                    'block w-max -translate-y-1/2 rounded-sm bg-(--fig-backdrop)/85 px-1 text-xs leading-4 group-data-[side=left]:-translate-x-full',
                    !compact && 'lg:text-sm lg:leading-5',
                    // Facing away, the name becomes a chip in the gutter that says so.
                    'group-data-[back=true]:rounded-sm group-data-[back=true]:border group-data-[back=true]:bg-(--fig-backdrop) group-data-[back=true]:font-normal group-data-[back=true]:text-muted-foreground',
                    key === 'syndesmosis' ? 'text-muted-foreground' : 'font-semibold text-primary',
                  )}
                >
                  {t(text)}
                  <span className="hidden group-data-[back=true]:inline"> {t('anatomy.behind')}</span>
                </span>
              </span>
            ))}
          </div>
          {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{t('anatomy.model3d.loading')}</p>}
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => {
                touched.current = -Infinity;
                turnTo('anterolateral');
              }}
              aria-label={t('anatomy.model3d.reset')}
              title={t('anatomy.model3d.reset')}
              disabled={!ready}
            >
              <RotateCcw />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => {
                handled();
                zoomTo(zoom * ZOOM_STEP);
              }}
              aria-label={t('anatomy.model3d.zoomIn')}
              title={t('anatomy.model3d.zoomIn')}
              disabled={!ready || zoom >= ZOOM_MAX}
            >
              <ZoomIn />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => {
                handled();
                zoomTo(zoom / ZOOM_STEP);
              }}
              aria-label={t('anatomy.model3d.zoomOut')}
              title={t('anatomy.model3d.zoomOut')}
              disabled={!ready || zoom <= 1}
            >
              <ZoomOut />
            </Button>
          </div>
        </div>
        <p aria-hidden="true" className="text-xs leading-4 text-muted-foreground">
          {t('anatomy.model3d.hintShort')}
        </p>
        <p id={hintId} className="sr-only">
          {t('anatomy.model3d.hint')}
        </p>
      </div>

      {/* The radiographic pair: each view shows every mark, and turns the model to itself. */}
      <div className={cn('grid grid-cols-2 gap-2', compact && 'lg:grid-cols-1 lg:content-start')}>
        {PAIR.map(([preset, caption, action]) => (
          <button
            key={preset}
            type="button"
            aria-pressed={at === preset}
            aria-label={t(action)}
            disabled={!ready}
            onClick={() => {
              touched.current = -Infinity;
              turnTo(preset);
            }}
            className={cn(
              'group rounded-sm border bg-(--fig-plate) p-1 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-default',
              fade,
              'transition-[border-color] hover:border-input aria-pressed:border-(--hl)',
            )}
          >
            <canvas
              ref={(el) => {
                pairRef.current[preset] = el;
              }}
              aria-hidden="true"
              className={cn('block aspect-square w-full sm:aspect-[5/4]', compact && 'lg:aspect-[5/4]')}
            />
            <span className={cn('block px-1 pt-1 text-xs leading-4 text-muted-foreground group-aria-pressed:font-semibold group-aria-pressed:text-primary', !compact && 'lg:text-sm lg:leading-5')}>{t(caption)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Labels move with every rendered frame, so they are placed directly rather than through React state.
function placeLabels({ labels, leaders }: Overlay, anchors: Anchors) {
  for (const key of Object.keys(anchors) as Labelled[]) {
    const a = anchors[key]!;
    const label = labels[key];
    const leader = leaders[key];
    if (label) {
      (label.firstElementChild as HTMLElement).style.maxWidth = `${a.maxWidth ?? 9999}px`;
      label.style.transform = `translate(${a.labelX}px, ${a.labelY}px)`;
      label.dataset.back = String(a.back);
      label.dataset.side = a.side;
    }
    if (!leader) continue;
    leader.dataset.back = String(a.back);
    if (a.y2 !== undefined) {
      // The syndesmosis bracket: a vertical rule beside the fibula with ticks towards it, and a stub to its name.
      const tick = a.side === 'left' ? 4 : -4;
      const mid = (a.y + a.y2) / 2;
      leader.children[0].setAttribute('d', `M${a.x + tick},${a.y} H${a.x} V${a.y2} H${a.x + tick} M${a.x},${mid} H${a.labelX}`);
      continue;
    }
    const [line, dot] = leader.children;
    line.setAttribute('x1', String(a.x));
    line.setAttribute('y1', String(a.y));
    line.setAttribute('x2', String(a.labelX));
    line.setAttribute('y2', String(a.labelY));
    dot.setAttribute('cx', String(a.x));
    dot.setAttribute('cy', String(a.y));
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
