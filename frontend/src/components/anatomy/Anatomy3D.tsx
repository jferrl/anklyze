import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { AnatomyState } from './anatomyState';
import { parseAnkleModel } from './ankleModel';
import { createAnkleScene, type Anchors, type AnkleScene, type Ink } from './ankleScene';

const DEG = Math.PI / 180;
const DRAG = 0.6 * DEG; // per pixel
const KEY_YAW = 15 * DEG;
const KEY_PITCH = 10 * DEG;
const DECAY_MS = 160; // release glide time constant

// Highlight changes fade or recolour in 150ms on the house curve, as in the drawing.
const fade = 'transition-[color,fill,stroke,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]';

// A structure facing away keeps its label only while highlighted, faded and on a dashed leader.
const behind = (on: boolean) => (on ? 'data-[back=true]:opacity-70' : 'data-[back=true]:opacity-0');

const LABELS = [
  ['lateral', 'anatomy.lateral'],
  ['medial', 'anatomy.medial'],
  ['posterior', 'anatomy.model3d.posterior'],
] as const;

interface Anatomy3DProps {
  state: AnatomyState;
  /** Called when the model cannot be shown, so the drawing comes back. */
  onFail: () => void;
}

/** Anatomy3D shows the BodyParts3D ankle with the same highlights as the drawing; loaded on demand. */
export default function Anatomy3D({ state, onFail }: Anatomy3DProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<Partial<Record<keyof Anchors, HTMLSpanElement | null>>>({});
  const leadersRef = useRef<Partial<Record<keyof Anchors, SVGGElement | null>>>({});
  const sceneRef = useRef<AnkleScene | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; t: number; vx: number; vy: number } | null>(null);
  const glide = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let scene: AnkleScene | undefined;
    let cancelled = false;
    const observers: { disconnect(): void }[] = [];

    fetch('/models/ankle/ankle.bin')
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`ankle.bin ${r.status}`))))
      .then((buffer) => {
        if (cancelled) return;
        scene = createAnkleScene(canvas, parseAnkleModel(buffer), (anchors) => placeLabels(labelsRef.current, leadersRef.current, anchors));
        sceneRef.current = scene;
        scene.setInk(readInk(canvas));
        const resize = new ResizeObserver(([entry]) => scene!.resize(entry.contentRect.width));
        resize.observe(canvas);
        // The theme toggles a class on <html>; redraw in the new ink.
        const theme = new MutationObserver(() => scene!.setInk(readInk(canvas)));
        theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        observers.push(resize, theme);
        setReady(true);
      })
      .catch(() => !cancelled && onFail());

    return () => {
      cancelled = true;
      cancelAnimationFrame(glide.current);
      observers.forEach((o) => o.disconnect());
      scene?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => sceneRef.current?.setState(state), [state, ready]);

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
    if (e.timeStamp - d.t > 80 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
      <div className="relative">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label={t('anatomy.model3d.canvas')}
          aria-describedby="anatomy-3d-hint"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          // pan-y keeps the page scrollable on touch; a horizontal drag turns the model.
          className={cn(
            'block aspect-square w-full cursor-grab touch-pan-y rounded-sm outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring active:cursor-grabbing',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        />
        {/* Labels follow the structures: the scene places each label beside the model and its leader to the structure. */}
        <div aria-hidden="true" className={cn('pointer-events-none absolute inset-0 overflow-hidden', !ready && 'hidden')}>
          <svg className="absolute inset-0 size-full">
            {LABELS.map(([key]) => (
              <g
                key={key}
                ref={(el) => {
                  leadersRef.current[key] = el;
                }}
                className={cn(fade, behind(state[key]), state[key] ? 'stroke-primary' : 'stroke-muted-foreground/50')}
              >
                <line strokeWidth="1" />
                <circle r="2" className={cn(fade, state[key] ? 'fill-primary' : 'fill-muted-foreground/50')} stroke="none" />
              </g>
            ))}
          </svg>
          {LABELS.map(([key, text]) => (
            <span
              key={key}
              ref={(el) => {
                labelsRef.current[key] = el;
              }}
              className={cn('group absolute left-0 top-0', fade, behind(state[key]))}
            >
              <span
                className={cn(
                  'block -translate-y-1/2 whitespace-nowrap px-1 text-xs',
                  fade,
                  'group-data-[side=left]:-translate-x-full',
                  state[key] ? 'font-medium text-primary' : 'text-muted-foreground',
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
            cancelAnimationFrame(glide.current);
            sceneRef.current?.reset();
          }}
          aria-label={t('anatomy.model3d.reset')}
          title={t('anatomy.model3d.reset')}
          className="absolute right-0 top-0"
          disabled={!ready}
        >
          <RotateCcw />
        </Button>
      </div>
      <p id="anatomy-3d-hint" className="text-xs text-muted-foreground">
        {t('anatomy.model3d.hint')}
      </p>
    </div>
  );
}

// Labels move with every rendered frame, so they are placed directly rather than through React state.
function placeLabels(
  labels: Partial<Record<keyof Anchors, HTMLSpanElement | null>>,
  leaders: Partial<Record<keyof Anchors, SVGGElement | null>>,
  anchors: Anchors,
) {
  for (const key of Object.keys(anchors) as (keyof Anchors)[]) {
    const a = anchors[key];
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

// Canvas 2D resolves any CSS colour, oklch included, to sRGB bytes that three.js can parse.
function readInk(el: HTMLElement): Ink {
  const style = getComputedStyle(el);
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  const rgb = (name: string) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = style.getPropertyValue(name).trim();
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  };
  return { paper: rgb('--card'), pencil: rgb('--muted-foreground'), mark: rgb('--primary') };
}
