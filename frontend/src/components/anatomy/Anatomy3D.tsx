import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { PRESETS, presetFor, type Preset } from './anatomyCamera';
import { getAnatomyState, type AnatomyState } from './anatomyState';
import { parseAnkleModel, type AnkleModel } from './ankleModel';
import { createAnkleScene, type Anchors, type AnkleScene, type Ink, type Structure } from './ankleScene';

const DEG = Math.PI / 180;
const DRAG = 0.6 * DEG; // per pixel
const KEY_YAW = 15 * DEG;
const KEY_PITCH = 10 * DEG;
const DECAY_MS = 160; // release glide time constant
const TURN_MS = 600;
const HANDS_OFF_MS = 2000; // after a drag or a key, answers do not turn the model for this long
// First open only, with no answer yet: the model swings in from a quarter turn to show that it turns.
const INTRO = { turn: -50 * DEG, ms: 1400 };
let introduced = false;
// In-out on the house curve family: symmetric, no overshoot.
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const NONE = getAnatomyState({});

// Highlight changes fade or recolour in 200ms on the house curve.
const fade = 'transition-[color,fill,stroke,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]';

// A structure facing away keeps its label only while highlighted, faded and on a dashed leader.
const behind = (on: boolean) => (on ? 'data-[back=true]:opacity-70' : 'data-[back=true]:opacity-0');

const LABELS = [
  ['lateral', 'anatomy.lateral'],
  ['medial', 'anatomy.medial'],
  ['posterior', 'anatomy.model3d.posterior'],
] as const;

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
  labels: Partial<Record<Structure, HTMLSpanElement | null>>;
  leaders: Partial<Record<Structure, SVGGElement | null>>;
}

interface Anatomy3DProps {
  state: AnatomyState;
  /** From lg, puts the AP and Lateral pair beside the 3D view, stacked, instead of under it. */
  compact?: boolean;
  /** Called when the model cannot be shown, so the figure falls back to text. */
  onFail: () => void;
}

/**
 * Anatomy3D shows the BodyParts3D ankle to turn freely, turns it to what each answer newly
 * involves, and pairs it with AP and Lateral views drawn by the same renderer; loaded on demand.
 */
export default function Anatomy3D({ state, compact = false, onFail }: Anatomy3DProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pairRef = useRef<Partial<Record<Preset, HTMLCanvasElement | null>>>({});
  // A stable holder the scene writes label positions into, outside React state.
  const [overlay] = useState<Overlay>(() => ({ labels: {}, leaders: {} }));
  const sceneRef = useRef<AnkleScene | null>(null);
  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState(0);
  const [at, setAt] = useState<Preset | undefined>('anterolateral');
  const drag = useRef<{ id: number; x: number; y: number; t: number; vx: number; vy: number } | null>(null);
  const glide = useRef(0);
  const touched = useRef(-Infinity);
  const seen = useRef<AnatomyState>(NONE);
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
          scene = createAnkleScene(canvas, m, (anchors) => placeLabels(overlay, anchors));
          sceneRef.current = scene;
          scene.setInk(readInk(canvas));
          scene.resize(canvas.getBoundingClientRect().width);
          // The theme toggles a class on <html>; redraw in the new ink.
          themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
          setReady(true);
        })
        .catch(() => !cancelled && onFail());
    });
    resize.observe(canvas);
    return () => {
      cancelled = true;
      cancelAnimationFrame(glide.current);
      resize.disconnect();
      themeObserver.disconnect();
      scene?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function turnTo(preset: Preset) {
    const scene = sceneRef.current;
    if (!scene) return;
    cancelAnimationFrame(glide.current);
    setAt(preset);
    const to = PRESETS[preset];
    const from = scene.view();
    // The short way round.
    const dYaw = Math.atan2(Math.sin(to.yaw - from.yaw), Math.cos(to.yaw - from.yaw));
    if (reducedMotion()) return scene.setView({ ...to, yaw: from.yaw + dYaw });
    const start = performance.now();
    const step = (now: number) => {
      const k = easeInOut(Math.min((now - start) / TURN_MS, 1));
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
    const preset = presetFor(seen.current, state);
    const first = seen.current === NONE;
    seen.current = state;
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
    // turnTo reads only refs and stable setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ready]);

  // The AP and Lateral pair redraws only when the answers, the theme or its size change.
  useEffect(() => {
    if (!ready) return;
    const draw = () => {
      for (const [preset] of PAIR) {
        const out = pairRef.current[preset];
        if (!out || !out.clientWidth) continue;
        const ratio = Math.min(window.devicePixelRatio, 2);
        out.width = Math.round(out.clientWidth * ratio);
        out.height = Math.round(out.clientHeight * ratio);
        sceneRef.current?.snapshot(PRESETS[preset], out);
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
    if (drag.current) return; // a second finger does not take over the drag
    handled();
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
    touched.current = performance.now();
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
    if (e.key === 'Home') {
      e.preventDefault();
      return turnTo('anterolateral');
    }
    if (!turn[e.key]) return;
    handled();
    sceneRef.current?.rotate(...turn[e.key]);
    e.preventDefault();
  }

  return (
    <div className={compact ? 'space-y-2 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-2 lg:space-y-0' : 'space-y-2'}>
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
            onKeyDown={onKeyDown}
            // pan-y keeps the page scrollable on touch; a horizontal drag turns the model.
            className={cn(
              'block aspect-[4/5] w-full cursor-grab touch-pan-y rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring active:cursor-grabbing',
              fade,
              ready ? 'opacity-100' : 'opacity-0',
            )}
          />
          <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0', !ready && 'hidden')}>
            <svg className="absolute inset-0 size-full overflow-visible">
              {LABELS.map(([key]) => (
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
            {LABELS.map(([key, text]) => (
              <span
                key={key}
                ref={(el) => {
                  overlay.labels[key] = el;
                }}
                className={cn('group absolute left-0 top-0', fade, behind(state[key]))}
              >
                <span
                  className={cn(
                    'block -translate-y-1/2 whitespace-nowrap px-1 text-xs leading-4 group-data-[side=left]:-translate-x-full',
                    fade,
                    state[key] ? 'font-semibold text-primary' : 'text-muted-foreground',
                  )}
                >
                  {t(text)}
                </span>
              </span>
            ))}
          </div>
          {!ready && <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">{t('anatomy.model3d.loading')}</p>}
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

      {/* The radiographic pair: each view shows every mark, and turns the model to itself. */}
      <div className={cn('grid grid-cols-2 gap-2', compact && 'lg:grid-cols-1')}>
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
              className={cn('block aspect-[4/5] w-full', compact && 'lg:aspect-[5/4]')}
            />
            <span className="block px-1 pt-1 text-xs leading-4 text-muted-foreground group-aria-pressed:font-semibold group-aria-pressed:text-primary">{t(caption)}</span>
          </button>
        ))}
      </div>
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
      // Keep the whole label inside the view: a narrow figure has narrow gutters.
      const [w, room] = [label.offsetWidth, label.parentElement?.clientWidth ?? Infinity];
      a.labelX = a.side === 'left' ? Math.max(a.labelX, w + 2) : Math.min(a.labelX, room - w - 2);
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
