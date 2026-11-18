import { useId, useMemo, type ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalFormOptions } from '@/utils/formOptions';
import { getQuestionSteps } from '@/features/fracture-classification/utils/questionSteps';
import type { FractureInput } from '@/types';
import { getAnatomyState, type AnatomyState, type FibulaMark } from './anatomyState';
import { CALCANEUS, FIBULA_INTACT, TALUS, TIBIA } from './frontBones';
import { LAT_FIBULA, LAT_TALUS, LAT_TIBIA } from './lateralBones';

interface AnatomyViewProps {
  formData: Partial<FractureInput>;
  /** Case context: CT availability comes from the case images, as in the form. */
  hasTACImages?: boolean;
  /** Lists the answers under the drawing; off where the answer path is already shown beside it. */
  showReading?: boolean;
  className?: string;
}

// Vertical extent of each fibular level in frontBones units. The plafond is at y≈246, the top of
// the tibiofibular contact (syndesmosis) at y≈196, and 6 cm above the joint at y≈145 (the distal
// tibia, about 5 cm wide, spans ~88 units).
const BANDS: Record<Exclude<FibulaMark, 'proximal'>, [number, number]> = {
  infra: [249, 268],
  trans: [199, 244],
  supra: [149, 194],
  supra_far: [104, 143],
};

// State changes fade or recolour in 150ms on the house curve; nothing moves.
const ink = 'transition-[color,fill,stroke,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]';
const on = (visible: boolean) => cn(ink, visible ? 'opacity-100' : 'opacity-0');

/**
 * AnatomyView draws the ankle from the front and the side and highlights what the answers
 * describe: the fractured malleoli and the level of the fibular fracture. Everything drawn is
 * also stated in text.
 */
export function AnatomyView({ formData, hasTACImages, showReading = true, className }: AnatomyViewProps) {
  const { t, i18n } = useTranslation();
  const state = getAnatomyState(formData);
  const summary = useSummary(state);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getLocalFormOptions(), [i18n.language]);
  const reading = showReading
    ? getQuestionSteps(formData, options, hasTACImages)
        .filter((step) => step.value !== undefined && step.id !== 'has_ct_scan')
        .map((step) => ({
          id: step.id,
          field: t(`anatomy.fields.${step.id}`),
          answer: step.options.find((opt) => opt.value === step.value)?.label ?? String(step.value),
        }))
    : [];

  const fibulaCaption = (
    <p aria-hidden="true" className="text-xs">
      <span className={cn(on(state.lateral || !!state.fibula), 'block', state.fibula ? 'font-medium text-primary' : 'text-muted-foreground')}>
        {t('anatomy.fibularLevel')}
      </span>
      <span className={cn('block min-h-4 text-primary', on(!!state.fibula))}>
        {state.fibula && t(`anatomy.level.${state.fibula}`)}
      </span>
    </p>
  );
  const posteriorCaption = (
    <p aria-hidden="true" className="text-xs">
      <span className={cn(ink, 'block', state.posterior ? 'font-medium text-primary' : 'text-muted-foreground')}>
        {t('anatomy.posteriorMalleolus')}
      </span>
      <span className={cn('block min-h-4 text-primary', on(!!state.posteriorType))}>
        {state.posteriorType && t(`form.options.posteriorType.${state.posteriorType}`)}
      </span>
    </p>
  );

  return (
    <figure className={cn('space-y-3', className)}>
      {/* Headings, drawings and captions are rows of one grid, so both views share a baseline. */}
      <div role="img" aria-label={summary} className="grid grid-cols-[minmax(0,5fr)_minmax(0,3fr)] gap-x-4 gap-y-1">
        <p aria-hidden="true" className="text-xs text-muted-foreground">{t('anatomy.front')}</p>
        <p aria-hidden="true" className="text-xs text-muted-foreground">{t('anatomy.side')}</p>
        <FrontView state={state} />
        <SideView state={state} />
        <div className="pt-2">{fibulaCaption}</div>
        <div className="pt-2">{posteriorCaption}</div>
      </div>

      <p className="sr-only" aria-live="polite">{summary}</p>

      {reading.length > 0 && (
        <dl className="divide-y rounded-md border text-sm">
          {reading.map((row) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{row.field}</dt>
              <dd className="font-medium">{row.answer}</dd>
            </div>
          ))}
        </dl>
      )}

      <figcaption className="space-y-1 text-xs text-muted-foreground">
        <p>{t('anatomy.note')}</p>
        <Sources />
      </figcaption>
    </figure>
  );
}

function useSummary(state: AnatomyState): string {
  const { t, i18n } = useTranslation();
  const parts = [
    state.lateral && t('anatomy.structures.lateral'),
    state.medial && t('anatomy.structures.medial'),
    state.posterior && t('anatomy.structures.posterior'),
  ].filter((part): part is string => !!part);
  if (parts.length === 0 && !state.fibula) return t('anatomy.summary.empty');

  const sentences = [t('anatomy.summary.views')];
  if (parts.length > 0) {
    sentences.push(t('anatomy.summary.highlighted', { list: new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(parts) }));
  }
  if (state.fibula) sentences.push(t(`anatomy.summary.fibula.${state.fibula}`));
  if (state.posteriorType) {
    sentences.push(t('anatomy.summary.posteriorType', { type: t(`form.options.posteriorType.${state.posteriorType}`) }));
  }
  return sentences.join(' ');
}

// Both drawings share one language: 1.25px outlines and 2.25px highlights at any size, highlights
// as a tint plus a bolder outline that fade out at their ends, and HTML labels on leader lines.
const LINE = { strokeWidth: 1.25, vectorEffect: 'non-scaling-stroke' } as const;
const BOLD = { strokeWidth: 2.25, vectorEffect: 'non-scaling-stroke' } as const;
const TINT = 0.14;

type ViewBox = [number, number, number, number];
const FRONT_BOX: ViewBox = [200, 100, 210, 212];
const SIDE_BOX: ViewBox = [94, 66, 150, 196];

/**
 * Spot limits a highlight to a disc round its structure: the tint ends on a clean arc (`${id}`),
 * and the bold outline tapers out across it (`${id}-line`) instead of stopping square.
 */
function Spot({ id, cx, cy, r }: { id: string; cx: number; cy: number; r: number }) {
  const disc = (suffix: string, radius: number, fade: number) => (
    <>
      <radialGradient id={`${id}${suffix}-g`} cx={cx} cy={cy} r={radius} gradientUnits="userSpaceOnUse">
        <stop offset={1 - fade / radius} stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </radialGradient>
      <mask id={`${id}${suffix}`} maskUnits="userSpaceOnUse" x={cx - radius} y={cy - radius} width={2 * radius} height={2 * radius}>
        <circle cx={cx} cy={cy} r={radius} fill={`url(#${id}${suffix}-g)`} />
      </mask>
    </>
  );
  return (
    <>
      {disc('', r, 1)}
      {disc('-line', r + 4, 10)}
    </>
  );
}

/** Label sets a structure's name in the page type over a drawing, hanging below a point of its viewBox. */
function Label({ box, x, y, on, children }: { box: ViewBox; x: number; y: number; on: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      style={{ left: `${((x - box[0]) / box[2]) * 100}%`, top: `${((y - box[1]) / box[3]) * 100}%` }}
      className={cn(ink, 'absolute -translate-x-1/2 whitespace-nowrap text-xs leading-4', on ? 'font-medium text-primary' : 'text-muted-foreground')}
    >
      {children}
    </span>
  );
}

/** Leader joins a structure (the dot) to the label below it. */
function Leader({ x, y, to, on }: { x: number; y: number; to: number; on: boolean }) {
  return (
    <g className={cn(ink, on ? 'fill-primary stroke-primary' : 'fill-muted-foreground/60 stroke-muted-foreground/60')}>
      <path d={`M${x},${y} V${to}`} vectorEffect="non-scaling-stroke" strokeWidth="1" />
      <circle cx={x} cy={y} r="1.8" stroke="none" />
    </g>
  );
}

function useSvgId() {
  // useId's punctuation is not safe inside url(#...).
  return 'anatomy' + useId().replace(/[^\w-]/g, '');
}

function FrontView({ state }: { state: AnatomyState }) {
  const { t } = useTranslation();
  const id = useSvgId();

  return (
    <div className="relative self-end">
      <svg viewBox={FRONT_BOX.join(' ')} aria-hidden="true" className="block w-full" fill="var(--card)" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <Spot id={`${id}-lateral`} cx={244} cy={330} r={124} />
          <Spot id={`${id}-medial`} cx={395} cy={262} r={52} />
          <clipPath id={`${id}-fibula`}>
            <path d={FIBULA_INTACT} />
          </clipPath>
        </defs>

        {/* Back to front; each fill hides what lies behind it. */}
        <g className="stroke-muted-foreground" {...LINE}>
          <path d={CALCANEUS} />
          <path d={TALUS} />
          <path d={TIBIA} />
          <path d={FIBULA_INTACT} />
        </g>

        <g className={cn('fill-primary stroke-primary', on(state.lateral))}>
          <path d={FIBULA_INTACT} mask={`url(#${id}-lateral)`} fillOpacity={TINT} stroke="none" />
          <path d={FIBULA_INTACT} mask={`url(#${id}-lateral-line)`} fill="none" {...BOLD} />
        </g>
        <g className={cn('fill-primary stroke-primary', on(state.medial))}>
          <path d={TIBIA} mask={`url(#${id}-medial)`} fillOpacity={TINT} stroke="none" />
          <path d={TIBIA} mask={`url(#${id}-medial-line)`} fill="none" {...BOLD} />
        </g>

        {/* The fibular level: the fibula tinted between two rings, with a bracket beside it. */}
        {(Object.keys(BANDS) as (keyof typeof BANDS)[]).map((mark) => {
          const [top, bottom] = BANDS[mark];
          return (
            <g key={mark} className={cn('fill-primary stroke-primary', on(state.fibula === mark))}>
              <g clipPath={`url(#${id}-fibula)`}>
                <rect x="220" y={top} width="60" height={bottom - top} fillOpacity={TINT} stroke="none" />
                <path d={`M220,${top} h60 M220,${bottom} h60`} fill="none" {...LINE} />
              </g>
              <path d={`M219,${top} h-4 V${bottom} h4`} fill="none" {...LINE} />
            </g>
          );
        })}

        {/* Proximal fibula: outside the drawing, so only an arrow up the shaft. */}
        <path d="M255,142 V106 M249,113 L255,105 L261,113" fill="none" {...BOLD} className={cn('stroke-primary', on(state.fibula === 'proximal'))} />

        <Leader x={232.5} y={270.5} to={282} on={state.lateral} />
        <Leader x={374} y={252} to={265} on={state.medial} />
      </svg>
      <Label box={FRONT_BOX} x={232.5} y={284} on={state.lateral}>
        {t('anatomy.lateral')}
      </Label>
      <Label box={FRONT_BOX} x={374} y={267} on={state.medial}>
        {t('anatomy.medial')}
      </Label>
    </div>
  );
}

function SideView({ state }: { state: AnatomyState }) {
  const { t } = useTranslation();
  const id = useSvgId();

  return (
    <div className="w-full max-w-56 self-end">
      <svg viewBox={SIDE_BOX.join(' ')} aria-hidden="true" className="block w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <defs>
          <Spot id={`${id}-posterior`} cx={118} cy={205} r={48.5} />
        </defs>
        <g className="stroke-muted-foreground" {...LINE}>
          <path d={LAT_TALUS} />
          <path d={LAT_TIBIA} />
          <path d={LAT_FIBULA} strokeOpacity="0.45" />
        </g>
        {/* The posterior lip of the tibia; its extent is schematic, not a fragment. */}
        <g className={cn('fill-primary stroke-primary', on(state.posterior))}>
          <path d={`${LAT_TIBIA} Z`} mask={`url(#${id}-posterior)`} fillOpacity={TINT} stroke="none" />
          <path d={LAT_TIBIA} mask={`url(#${id}-posterior-line)`} fill="none" {...BOLD} />
        </g>
      </svg>
      <p aria-hidden="true" className="flex justify-between gap-2 text-xs leading-4 text-muted-foreground">
        <span>{t('anatomy.back')}</span>
        <span>{t('anatomy.frontSide')}</span>
      </p>
    </div>
  );
}

// The full credits stay in the page, one click away; NOTICE has the complete text.
function Sources() {
  const { t } = useTranslation();
  const link = (href: string) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground" />;

  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-0.5 rounded-sm outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        {t('anatomy.sources.title')}
        <ChevronDown aria-hidden="true" className="size-3.5 transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <ul className="mt-1 space-y-1">
        <li>
          <Trans
            i18nKey="anatomy.sources.front"
            components={{ work: link('https://commons.wikimedia.org/wiki/File:Weber_Classification_-_latin.svg'), license: link('https://creativecommons.org/licenses/by/4.0/') }}
          />
        </li>
        <li>
          <Trans i18nKey="anatomy.sources.side" components={{ work: link('https://commons.wikimedia.org/wiki/File:Ankle.svg') }} />
        </li>
      </ul>
    </details>
  );
}
