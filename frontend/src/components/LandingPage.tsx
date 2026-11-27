import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Logo } from './Logo';
import { AnklePlate, StepBadge } from './AnklePlate';

const FIGURE_SOURCE_URL = 'https://lifesciencedb.jp/bp3d/';
const CC_BY_SA_URL = 'https://creativecommons.org/licenses/by-sa/4.0/';

// Hero figure, once on load (ms): the answers and codes are there from the first frame; only the
// plate's marks for answers 1 and 2 land, then the fracture draws. See .fig-in in index.css.
const MARK_AT = [100, 400];

// One real terminal path of the decision tree (docs/decision_table.txt, lateral branch).
const EXAMPLE_PATH = [
  ['form.questions.involved_malleoli', 'form.options.involvedMalleoli.lateral_only'],
  ['form.questions.fibular_level', 'form.options.fibularLevel.transindesmal'],
  ['form.questions.fibulaTraceCount', 'form.options.fibulaTraceCount.single'],
  ['form.questions.lateral_morphology', 'form.options.lateralMorphology.spiral'],
  ['form.questions.lateralSubtype', 'form.options.lateralSubtype.simple'],
] as const;

const SYSTEMS = [
  { key: 'laugeHansen', name: 'Lauge-Hansen', swatch: 'bg-sys-lh', code: 'SER' },
  { key: 'danisWeber', name: 'Danis-Weber', swatch: 'bg-sys-dw', code: 'B' },
  { key: 'aoota', name: 'AO/OTA', swatch: 'bg-sys-ao', code: '44-B1.1' },
  { key: 'bartonicek', name: 'Bartoníček', swatch: 'bg-sys-bt', code: null },
] as const;

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const methodFacts = ['tree', 'tested', 'notClassifiable', 'judgement'] as const;
  const studyFacts = ['cases', 'agreement', 'gold'] as const;
  const figureRef = useRef<HTMLElement>(null);
  // The Spanish headline is a third longer; a step smaller keeps it to four lines.
  const es = i18n.language.startsWith('es');

  // Start the plate's marks once the font and the plate are ready, waiting at most 400ms.
  useEffect(() => {
    const figure = figureRef.current!;
    const plate = figure.querySelector<HTMLImageElement>('[data-plate-image]');
    const ready = () => figure.setAttribute('data-ready', '');
    const timer = setTimeout(ready, 400);
    Promise.all([document.fonts.ready, plate?.decode().catch(() => {})]).then(ready);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="landing min-h-screen bg-background">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-primary-fill">
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-foreground">Anklyze</span>
          </Link>
          <div className="flex items-center gap-1">
            <a href="#method" className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground md:block">
              {t('landing.nav.method')}
            </a>
            <a href="#systems" className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground md:block">
              {t('landing.nav.systems')}
            </a>
            <a href="#studies" className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground md:block">
              {t('landing.nav.studies')}
            </a>
            <a href="#source" className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:text-foreground md:block">
              {t('landing.nav.source')}
            </a>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">{t('landing.nav.signIn')}</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="field-navy">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:py-12 xl:py-16">
            <div className="lg:col-span-6 lg:self-center">
              <h1 className={`font-display ${es ? 'text-[clamp(2.25rem,4.1vw,3.75rem)]' : 'text-[clamp(2.25rem,4.6vw,4.25rem)]'}`}>{t('landing.hero.title')}</h1>
              <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-white/80">{t('landing.hero.lede')}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  to="/classify"
                  className="inline-flex h-11 items-center gap-2 rounded-sm bg-sheet px-5 text-sm font-semibold text-field-ink transition-[background-color,transform] duration-150 ease-out hover:bg-sheet/90 active:scale-[0.98]"
                >
                  {t('landing.startClassifying')}
                  <ArrowRight className="size-4" />
                </Link>
                <a href="#method" className="text-sm font-medium text-white underline decoration-white/50 underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-white">
                  {t('landing.hero.secondary')}
                </a>
              </div>
            </div>

            <figure ref={figureRef} data-landing-figure className="lg:col-span-6 lg:self-center">
              <div className="fig-sheet rounded-md bg-sheet text-sheet-ink">
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                  <AnklePlate lateralAt={MARK_AT[0]} levelAt={MARK_AT[1]} />
                </div>
                <ol className="border-t border-sheet-rule">
                  {EXAMPLE_PATH.map(([question, answer], i) => (
                    <li key={question} className="grid grid-cols-[2.5rem_1fr] border-b border-sheet-rule">
                      <span className="flex items-center justify-center border-r border-sheet-rule text-xs font-semibold tabular-nums text-sheet-muted">
                        {i < 2 ? <StepBadge n={i + 1} atMs={MARK_AT[i]} /> : i + 1}
                      </span>
                      <div className="px-4 py-2 lg:py-1.5">
                        <p className="text-[0.8125rem] leading-snug text-sheet-muted">{t(question)}</p>
                        <p className="text-[0.9375rem] font-medium leading-snug">{t(answer)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-md bg-sheet-rule sm:grid-cols-4">
                  {SYSTEMS.map((s) => (
                    <div key={s.key} className="bg-sheet px-4 py-3">
                      <p className="flex items-center gap-1.5 text-[0.8125rem] text-sheet-muted">
                        <span className={`size-2 ${s.swatch}`} />
                        {s.name}
                      </p>
                      <p className="font-display mt-2 text-[1.75rem]" data-numeric>
                        {s.code ?? <span className="text-sheet-muted">N/C</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <figcaption className="mt-4 text-sm leading-relaxed text-white/85">
                {t('landing.figure.caption')}
                <details className="mt-2 text-[0.8125rem] leading-relaxed text-white/80">
                  <summary className="w-fit underline decoration-white/40 underline-offset-4 transition-colors duration-150 hover:text-white">
                    {t('landing.figure.sources')}
                  </summary>
                  <p className="mt-1.5 max-w-[60ch]">
                    {t('landing.figure.creditPrefix')}{' '}
                    <a href={FIGURE_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-white/40 hover:decoration-white">
                      BodyParts3D
                    </a>{' '}
                    {t('landing.figure.creditBy')}{' '}
                    <a href={CC_BY_SA_URL} target="_blank" rel="noopener noreferrer" className="underline decoration-white/40 hover:decoration-white">
                      CC BY-SA 4.0
                    </a>
                    . {t('landing.figure.changes')}
                  </p>
                </details>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="method" className="scroll-mt-8 border-b">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24">
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl lg:text-4xl">{t('landing.method.title')}</h2>
              <p className="mt-4 max-w-[52ch] leading-relaxed text-muted-foreground">{t('landing.method.lede')}</p>
            </div>
            <dl className="divide-y border-y lg:col-span-7">
              {methodFacts.map((fact) => (
                <div key={fact} className="grid gap-1 py-6 sm:grid-cols-[12rem_1fr] sm:gap-6">
                  <dt className="font-semibold">{t(`landing.method.${fact}.term`)}</dt>
                  <dd className="max-w-[65ch] leading-relaxed text-muted-foreground">{t(`landing.method.${fact}.body`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="systems" className="scroll-mt-8 border-b">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <h2 className="font-display text-3xl lg:text-4xl">{t('landing.systems.title')}</h2>
            <p className="mt-4 max-w-[65ch] leading-relaxed text-muted-foreground">{t('landing.systems.lede')}</p>
            <div className="mt-10">
              <table className="w-full border-y text-left">
                <thead className="max-sm:hidden">
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="py-3 pr-6 font-medium">{t('landing.systems.colSystem')}</th>
                    <th className="py-3 pr-6 font-medium">{t('landing.systems.colBasis')}</th>
                    <th className="py-3 text-right font-medium">{t('landing.systems.colExample')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {SYSTEMS.map((s) => (
                    <tr key={s.key}>
                      <th scope="row" className="py-5 pr-6 align-top text-lg font-semibold sm:whitespace-nowrap">
                        <span className={`mr-3 inline-block size-2.5 -translate-y-px align-middle ${s.swatch}`} />
                        {s.name}
                        <span className="mt-1.5 block text-sm font-normal text-muted-foreground sm:hidden">
                          {t(`landing.systems.${s.key}`)}
                        </span>
                        <span className="font-display mt-3 block text-lg sm:hidden">{t(`landing.systems.notation.${s.key}`)}</span>
                      </th>
                      <td className="py-5 pr-6 text-muted-foreground max-sm:hidden">{t(`landing.systems.${s.key}`)}</td>
                      <td className="font-display py-5 text-right align-top text-xl whitespace-nowrap max-sm:hidden">{t(`landing.systems.notation.${s.key}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="studies" className="scroll-mt-8 bg-muted">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24">
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl lg:text-4xl">{t('landing.studies.title')}</h2>
              <p className="mt-4 max-w-[52ch] leading-relaxed text-muted-foreground">{t('landing.studies.lede')}</p>
            </div>
            <dl className="divide-y divide-input border-y border-input lg:col-span-7">
              {studyFacts.map((fact) => (
                <div key={fact} className="grid gap-1 py-5 sm:grid-cols-[11rem_1fr] sm:gap-6">
                  <dt className="font-semibold">{t(`landing.studies.${fact}.term`)}</dt>
                  <dd className="text-muted-foreground">{t(`landing.studies.${fact}.body`)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section id="source" className="scroll-mt-8 border-b">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24">
            <div className="lg:col-span-5">
              <h2 className="font-display text-3xl lg:text-4xl">{t('landing.source.title')}</h2>
              <p className="mt-4 max-w-[52ch] leading-relaxed text-muted-foreground">{t('landing.source.body')}</p>
              <p className="mt-4 max-w-[52ch] text-sm leading-relaxed text-muted-foreground">{t('landing.source.authors')}</p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-4 px-4 pt-10 pb-8 text-sm sm:px-6 md:grid-cols-[1fr_auto] md:items-center">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <span className="text-primary-fill">
              <Logo />
            </span>
            Anklyze
          </p>
          <p className="text-muted-foreground md:text-right">{t('landing.footer.license')}</p>
          <p className="text-muted-foreground md:col-span-2">{t('landing.footer.disclaimer')}</p>
        </div>
      </footer>
    </div>
  );
}
