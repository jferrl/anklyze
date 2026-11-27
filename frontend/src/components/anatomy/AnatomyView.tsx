import { lazy, Suspense, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getLocalFormOptions } from '@/utils/formOptions';
import { getQuestionSteps } from '@/features/fracture-classification/utils/questionSteps';
import type { FractureInput } from '@/types';
import { getAnatomyState, type AnatomyState } from './anatomyState';
import type { Preset } from './anatomyCamera';

interface AnatomyViewProps {
  formData: Partial<FractureInput>;
  /** Case context: CT availability comes from the case images, as in the form. */
  hasTACImages?: boolean;
  /** Lists the answers under the figure; off where the answer path is already shown beside it. */
  showReading?: boolean;
  /** From lg, lays the 3D view and the AP and Lateral pair side by side, for a pinned figure over a form. */
  compact?: boolean;
  /** Opens the 3D model on this view rather than following the answers. */
  view?: Preset;
  /** Draws the fracture itself rather than the tint; off where a study needs today's figure. */
  fracture?: boolean;
  className?: string;
}

// three.js and the model load after the page, once per page.
const Anatomy3D = lazy(() => import('./Anatomy3D'));

function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

// State changes fade or recolour in 200ms on the house curve; nothing moves.
const ink = 'transition-[color,fill,stroke,opacity] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]';
const on = (visible: boolean) => cn(ink, visible ? 'opacity-100' : 'opacity-0');

/**
 * AnatomyView renders a model of the ankle to turn in 3D, with an AP and Lateral pair under it, and
 * highlights what the answers describe: the fractured malleoli and the level of the fibular
 * fracture. Everything shown is also stated in text.
 */
export function AnatomyView({ formData, hasTACImages, showReading = true, compact = false, view, fracture = false, className }: AnatomyViewProps) {
  const { t, i18n } = useTranslation();
  // A new state object only when what is shown changes, so the model is not redrawn on every render.
  const stateKey = JSON.stringify(getAnatomyState(formData));
  const state = useMemo<AnatomyState>(() => JSON.parse(stateKey), [stateKey]);
  // Without WebGL 2 the model cannot be shown at all; the summary then stands in as text.
  const [notice, setNotice] = useState<'noWebGL' | 'loadFailed' | undefined>(() => (hasWebGL2() ? undefined : 'noWebGL'));
  const summary = useSummary(state);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const options = useMemo(() => getLocalFormOptions(), [i18n.language]);
  const steps = getQuestionSteps(formData, options, hasTACImages);
  // The question being asked is the first unanswered one; when it is the posterior fragment, the
  // model turns to show the posterior malleolus.
  const posteriorAsked = steps.find((step) => step.value === undefined)?.id === 'posterior_fracture_type';
  const answered = state.lateral || state.medial || state.posterior || !!state.fibula;
  const reading = showReading
    ? steps
        .filter((step) => step.value !== undefined && step.id !== 'has_ct_scan')
        .map((step) => ({
          id: step.id,
          field: t(`anatomy.fields.${step.id}`),
          answer: step.options.find((opt) => opt.value === step.value)?.label ?? String(step.value),
        }))
    : [];

  const fibulaCaption = (
    <Caption
      title={t('anatomy.fibularLevel')}
      shown={state.lateral || !!state.fibula}
      value={state.fibula && t(`anatomy.level.${state.fibula}`)}
    />
  );
  const posteriorCaption = (
    <Caption
      title={t('anatomy.posteriorMalleolus')}
      shown={state.posterior}
      value={state.posteriorType && t(`form.options.posteriorType.${state.posteriorType}`)}
    />
  );

  return (
    <figure className={cn('fig-card space-y-3', className)}>
      {notice ? (
        <>
          <p className="rounded-sm bg-(--fig-backdrop) p-3 text-sm">{summary}</p>
          <p role="status" className="text-xs text-muted-foreground">
            {t(`anatomy.model3d.${notice}`)}
          </p>
        </>
      ) : (
        <Suspense fallback={<FigurePlaceholder compact={compact} />}>
          <Anatomy3D state={state} posteriorAsked={posteriorAsked} compact={compact} view={view} fracture={fracture} onFail={() => setNotice('loadFailed')} />
        </Suspense>
      )}
      {/* Before the first answer there is nothing to caption, so no space is held for it. */}
      {answered && (
        <div className="grid grid-cols-2 gap-x-3">
          {fibulaCaption}
          {posteriorCaption}
        </div>
      )}

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
        {answered && <p>{t('anatomy.note')}</p>}
        <Sources />
      </figcaption>
    </figure>
  );
}

/** FigurePlaceholder holds the figure's size while three.js loads, so nothing shifts when it lands. */
function FigurePlaceholder({ compact }: { compact: boolean }) {
  const { t } = useTranslation();
  return (
    <div aria-hidden="true" className={compact ? 'space-y-2 lg:grid lg:grid-cols-[minmax(0,1fr)_9rem] lg:gap-2 lg:space-y-0' : 'space-y-2'}>
      <div>
        <p className="grid aspect-square place-items-center rounded-sm bg-(--fig-backdrop) text-sm text-muted-foreground">{t('anatomy.model3d.loading')}</p>
        <p className="mt-2 h-4" />
      </div>
      <div className={cn('grid grid-cols-2 gap-2', compact && 'lg:grid-cols-1')}>
        {[0, 1].map((i) => (
          <div key={i} className="rounded-sm border bg-(--fig-plate) p-1">
            <div className="aspect-square sm:aspect-[5/4]" />
            <div className="h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Caption names a structure the answers involve and its answer, or says the answer is pending. */
function Caption({ title, shown, value }: { title: string; shown: boolean; value?: string }) {
  const { t } = useTranslation();
  return (
    <p aria-hidden="true" className={cn(on(shown), 'text-xs')}>
      <span className="block font-medium">{title}</span>
      {/* The key restarts the fade when the answer changes. */}
      <span key={value ?? ''} className={cn('block min-h-4 animate-fade-in', value ? 'text-primary' : 'text-muted-foreground')}>
        {value ?? t('anatomy.notAnswered')}
      </span>
    </p>
  );
}

function useSummary(state: AnatomyState): string {
  const { t, i18n } = useTranslation();
  const parts = [
    state.lateral && t('anatomy.structures.lateral'),
    state.medial && t('anatomy.structures.medial'),
    state.posterior && t('anatomy.structures.posterior'),
  ].filter((part): part is string => !!part);
  if (parts.length === 0 && !state.fibula) return t('anatomy.model3d.empty');

  const sentences = [t('anatomy.model3d.views')];
  if (parts.length > 0) {
    sentences.push(t('anatomy.summary.highlighted', { list: new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(parts) }));
  }
  if (state.fibula) sentences.push(t(`anatomy.summary.fibula.${state.fibula}`));
  if (state.posteriorType) {
    sentences.push(t('anatomy.summary.posteriorType', { type: t(`form.options.posteriorType.${state.posteriorType}`) }));
  }
  return sentences.join(' ');
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
            i18nKey="anatomy.sources.model"
            components={{ work: link('https://lifesciencedb.jp/bp3d/'), license: link('https://creativecommons.org/licenses/by-sa/4.0/') }}
          />
        </li>
        <li>{t('anatomy.sources.syndesmosis')}</li>
      </ul>
    </details>
  );
}
