import { useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { getLocalFormOptions } from '@/utils/formOptions';
import { getQuestionSteps } from '@/features/fracture-classification/utils/questionSteps';
import type { FractureInput } from '@/types';
import { getAnatomyState, type AnatomyState, type FibulaMark } from './anatomyState';
import { CALCANEUS, FIBULA_INTACT, TALUS, TIBIA } from './frontBones';
import { LAT_FIBULA, LAT_POSTERIOR_LIP, LAT_TALUS, LAT_TIBIA } from './lateralBones';

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

  return (
    <figure className={cn('space-y-3', className)}>
      <div role="img" aria-label={summary} className="grid grid-cols-[minmax(0,5fr)_minmax(0,3fr)] gap-4">
        <div className="space-y-1">
          <p aria-hidden="true" className="text-xs text-muted-foreground">{t('anatomy.front')}</p>
          <FrontView state={state} />
          <p aria-hidden="true" className="text-xs">
            <span className={cn(on(state.lateral || !!state.fibula), 'block', state.fibula ? 'font-medium text-primary' : 'text-muted-foreground')}>
              {t('anatomy.fibularLevel')}
            </span>
            <span className={cn('block min-h-4 text-primary', on(!!state.fibula))}>
              {state.fibula && t(`anatomy.level.${state.fibula}`)}
            </span>
          </p>
        </div>
        <div className="space-y-1">
          <p aria-hidden="true" className="text-xs text-muted-foreground">{t('anatomy.side')}</p>
          <SideView state={state} />
          <p aria-hidden="true" className="text-xs">
            <span className={cn(ink, 'block', state.posterior ? 'font-medium text-primary' : 'text-muted-foreground')}>
              {t('anatomy.posteriorMalleolus')}
            </span>
            <span className={cn('block min-h-4 text-primary', on(!!state.posteriorType))}>
              {state.posteriorType && t(`form.options.posteriorType.${state.posteriorType}`)}
            </span>
          </p>
        </div>
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

      <figcaption className="text-xs text-muted-foreground">
        {t('anatomy.schematic')}{' '}
        {t('anatomy.creditFront')}{' '}
        <a href="https://commons.wikimedia.org/wiki/File:Weber_Classification_-_latin.svg" target="_blank" rel="noopener noreferrer" className="underline">
          ‘Weber Classification – latin.svg’
        </a>{' '}
        {t('anatomy.creditFrontBy')}{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">
          CC BY 4.0
        </a>
        {t('anatomy.creditSide')}{' '}
        <a href="https://commons.wikimedia.org/wiki/File:Ankle.svg" target="_blank" rel="noopener noreferrer" className="underline">
          ‘Ankle.svg’
        </a>
        {t('anatomy.creditSideLicense')}
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

function FrontView({ state }: { state: AnatomyState }) {
  const { t } = useTranslation();
  // useId's punctuation is not safe inside url(#...).
  const id = 'anatomy' + useId().replace(/[^\w-]/g, '');
  const stroke = 'stroke-primary';

  return (
    <svg
      viewBox="200 100 210 212"
      aria-hidden="true"
      className="w-full text-[11.5px]"
      fill="var(--card)"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <clipPath id={`${id}-lateral`}>
          <rect x="200" y="214" width="90" height="70" />
        </clipPath>
        <clipPath id={`${id}-medial`}>
          <rect x="341" y="220" width="60" height="50" />
        </clipPath>
      </defs>

      {/* Back to front; each fill hides what lies behind it. */}
      <g className="stroke-muted-foreground" strokeWidth="1">
        <path d={CALCANEUS} />
        <path d={TALUS} />
        <path d={TIBIA} />
        <path d={FIBULA_INTACT} />
      </g>

      <path d={FIBULA_INTACT} fill="none" strokeWidth="2.2" clipPath={`url(#${id}-lateral)`} className={cn(stroke, on(state.lateral))} />
      <path d={TIBIA} fill="none" strokeWidth="2.2" clipPath={`url(#${id}-medial)`} className={cn(stroke, on(state.medial))} />

      {(Object.keys(BANDS) as (keyof typeof BANDS)[]).map((mark) => {
        const [top, bottom] = BANDS[mark];
        return (
          <g key={mark} className={on(state.fibula === mark)}>
            <rect x="222" y={top} width="56" height={bottom - top} className="fill-primary" fillOpacity="0.12" stroke="none" />
            <path d={`M219,${top} h-4 V${bottom} h4`} fill="none" strokeWidth="1" className={stroke} />
          </g>
        );
      })}

      {/* Proximal fibula: outside the drawing, so only an arrow up the shaft. */}
      <path d="M255,142 V106 M249,113 L255,105 L261,113" fill="none" strokeWidth="1.6" className={cn(stroke, on(state.fibula === 'proximal'))} />

      <g stroke="none">
        <text x="236" y="292" textAnchor="middle" className={cn(ink, state.lateral ? 'fill-primary font-medium' : 'fill-muted-foreground')}>
          {t('anatomy.lateral')}
        </text>
        <text x="384" y="270" textAnchor="middle" className={cn(ink, state.medial ? 'fill-primary font-medium' : 'fill-muted-foreground')}>
          {t('anatomy.medial')}
        </text>
      </g>
    </svg>
  );
}

function SideView({ state }: { state: AnatomyState }) {
  const { t } = useTranslation();

  return (
    <svg
      viewBox="94 66 150 216"
      aria-hidden="true"
      className="w-full max-w-56 text-[12px]"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g className="stroke-muted-foreground" strokeWidth="1">
        <path d={LAT_TALUS} />
        <path d={LAT_TIBIA} />
        <path d={LAT_FIBULA} strokeOpacity="0.45" />
      </g>
      <path d={LAT_POSTERIOR_LIP} strokeWidth="2.2" className={cn('stroke-primary', on(state.posterior))} />

      <g stroke="none">
        <text x="96" y="278" className="fill-muted-foreground">{t('anatomy.back')}</text>
        <text x="242" y="278" textAnchor="end" className="fill-muted-foreground">{t('anatomy.frontSide')}</text>
      </g>
    </svg>
  );
}
