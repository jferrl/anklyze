import { lazy, Suspense, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { ChevronDown, Rotate3d } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getLocalFormOptions } from '@/utils/formOptions';
import { getQuestionSteps } from '@/features/fracture-classification/utils/questionSteps';
import type { FractureInput } from '@/types';
import { getAnatomyState, type AnatomyState } from './anatomyState';

interface AnatomyViewProps {
  formData: Partial<FractureInput>;
  /** Case context: CT availability comes from the case images, as in the form. */
  hasTACImages?: boolean;
  /** Lists the answers under the figure; off where the answer path is already shown beside it. */
  showReading?: boolean;
  className?: string;
}

// three.js and the model load after the page, once per page, for the views and the 3D model alike.
const Anatomy3D = lazy(() => import('./Anatomy3D'));
const AnkleView = lazy(() => import('./Anatomy3D').then((m) => ({ default: m.AnkleView })));

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
 * AnatomyView renders a model of the ankle from the front and the side, or free to turn in 3D, and
 * highlights what the answers describe: the fractured malleoli and the level of the fibular
 * fracture. Everything shown is also stated in text.
 */
export function AnatomyView({ formData, hasTACImages, showReading = true, className }: AnatomyViewProps) {
  const { t, i18n } = useTranslation();
  const state = getAnatomyState(formData);
  const [view3d, setView3d] = useState(false);
  // Without WebGL 2 the model cannot be shown at all; the summary then stands in as text.
  const [notice, setNotice] = useState<'noWebGL' | 'loadFailed' | undefined>(() => (hasWebGL2() ? undefined : 'noWebGL'));
  const summary = useSummary(state, view3d);
  const failed = () => {
    setView3d(false);
    setNotice('loadFailed');
  };

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
        <p className="rounded-sm bg-(--fig-backdrop) p-3 text-sm">{summary}</p>
      ) : view3d ? (
        <Suspense fallback={<p className="grid aspect-[4/5] place-items-center text-sm text-muted-foreground">{t('anatomy.model3d.loading')}</p>}>
          <Anatomy3D state={state} onFail={failed} />
        </Suspense>
      ) : (
        <div role="img" aria-label={summary} className="grid grid-cols-[minmax(0,5fr)_minmax(0,4fr)] items-end gap-x-3 gap-y-1">
          <p aria-hidden="true" className="self-start text-xs text-muted-foreground">{t('anatomy.front')}</p>
          <p aria-hidden="true" className="self-start text-xs text-muted-foreground">{t('anatomy.side')}</p>
          <Suspense fallback={<div className="aspect-[3/4] rounded-sm bg-(--fig-backdrop)" />}>
            <AnkleView state={state} view="front" onFail={failed} />
          </Suspense>
          <div className="self-start">
            <Suspense fallback={<div className="aspect-square rounded-sm bg-(--fig-backdrop)" />}>
              <AnkleView state={state} view="side" onFail={failed} />
            </Suspense>
            <p aria-hidden="true" className="mt-1 flex justify-between gap-2 text-xs leading-4 text-muted-foreground">
              <span>{t('anatomy.back')}</span>
              <span>{t('anatomy.frontSide')}</span>
            </p>
          </div>
        </div>
      )}
      {/* One caption row for both views, in the figure's columns, so switching keeps it in place. */}
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,4fr)] gap-x-3">
        {fibulaCaption}
        {posteriorCaption}
      </div>

      {notice ? (
        <p role="status" className="text-xs text-muted-foreground">
          {t(`anatomy.model3d.${notice}`)}
        </p>
      ) : (
        <Button type="button" variant="outline" size="sm" aria-pressed={view3d} onClick={() => setView3d(!view3d)}>
          <Rotate3d />
          {view3d ? t('anatomy.model3d.close') : t('anatomy.model3d.open')}
        </Button>
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
        <p>{t('anatomy.note')}</p>
        <Sources />
      </figcaption>
    </figure>
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

function useSummary(state: AnatomyState, model3d: boolean): string {
  const { t, i18n } = useTranslation();
  const parts = [
    state.lateral && t('anatomy.structures.lateral'),
    state.medial && t('anatomy.structures.medial'),
    state.posterior && t('anatomy.structures.posterior'),
  ].filter((part): part is string => !!part);
  if (parts.length === 0 && !state.fibula) return t(model3d ? 'anatomy.model3d.empty' : 'anatomy.summary.empty');

  const sentences = [t(model3d ? 'anatomy.model3d.views' : 'anatomy.summary.views')];
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
      </ul>
    </details>
  );
}
