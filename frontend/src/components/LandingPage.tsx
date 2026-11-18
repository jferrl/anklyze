import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Logo } from './Logo';

const REPO_URL = 'https://github.com/jferrl/anklyze';
const DECISION_TABLE_URL = `${REPO_URL}/blob/main/docs/decision_table.txt`;
const METHODOLOGY_URL = `${REPO_URL}/blob/main/docs/RELIABILITY_ANALYSIS.md`;

// One real terminal path of the decision tree (docs/decision_table.txt, lateral branch).
const EXAMPLE_PATH = [
  ['form.questions.involved_malleoli', 'form.options.involvedMalleoli.lateral_only'],
  ['form.questions.fibular_level', 'form.options.fibularLevel.transindesmal'],
  ['form.questions.fibulaTraceCount', 'form.options.fibulaTraceCount.single'],
  ['form.questions.lateral_morphology', 'form.options.lateralMorphology.spiral'],
  ['form.questions.lateralSubtype', 'form.options.lateralSubtype.simple'],
] as const;

const SYSTEMS = [
  { key: 'laugeHansen', name: 'Lauge-Hansen', swatch: 'bg-sys-lh', code: 'SER', example: 'SA · SER · PA · PER' },
  { key: 'danisWeber', name: 'Danis-Weber', swatch: 'bg-sys-dw', code: 'B', example: 'A · B · C' },
  { key: 'aoota', name: 'AO/OTA', swatch: 'bg-sys-ao', code: '44-B1.1', example: '44-A1 … 44-C3' },
  { key: 'bartonicek', name: 'Bartonicek', swatch: 'bg-sys-bt', code: null, example: '1 – 4' },
] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const methodFacts = ['tree', 'tested', 'notClassifiable', 'judgement'] as const;
  const studyFacts = ['cases', 'agreement', 'gold'] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-foreground">Anklyze</span>
          </Link>
          <div className="flex items-center gap-1">
            <a href="#method" className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:block">
              {t('landing.nav.method')}
            </a>
            <a href="#systems" className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:block">
              {t('landing.nav.systems')}
            </a>
            <a href="#studies" className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:block">
              {t('landing.nav.studies')}
            </a>
            <a href="#source" className="hidden px-3 py-2 text-sm text-muted-foreground hover:text-foreground md:block">
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
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:gap-10 lg:py-20">
            <div className="lg:col-span-7 lg:pt-4">
              <h1 className="font-display text-[clamp(2.25rem,4.6vw,4.25rem)]">{t('landing.hero.title')}</h1>
              <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-white/80">{t('landing.hero.lede')}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link
                  to="/classify"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-field-ink transition-colors duration-150 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {t('landing.startClassifying')}
                  <ArrowRight className="size-4" />
                </Link>
                <a href="#method" className="text-sm font-medium text-white underline decoration-white/40 hover:decoration-white">
                  {t('landing.hero.secondary')}
                </a>
              </div>
            </div>

            <figure className="lg:col-span-5">
              <ol className="border border-white/25">
                {EXAMPLE_PATH.map(([question, answer], i) => (
                  <li key={question} className="grid grid-cols-[2.5rem_1fr] border-b border-white/25">
                    <span className="flex items-center justify-center border-r border-white/25 text-sm tabular-nums text-white/60">
                      {i + 1}
                    </span>
                    <div className="px-4 py-3">
                      <p className="text-sm text-white/65">{t(question)}</p>
                      <p className="path-answer mt-0.5 font-medium" style={{ '--step': i } as React.CSSProperties}>
                        {t(answer)}
                      </p>
                    </div>
                  </li>
                ))}
                <li className="grid grid-cols-2 gap-px bg-sheet-rule text-sheet-ink sm:grid-cols-4 lg:grid-cols-2">
                  {SYSTEMS.map((s) => (
                    <div key={s.key} className="bg-white px-4 py-4">
                      <p className="flex items-center gap-1.5 text-xs text-sheet-muted">
                        <span className={`size-2 ${s.swatch}`} />
                        {s.name}
                      </p>
                      <p className="path-result font-display mt-2 text-2xl" data-numeric>
                        {s.code ?? <span className="text-sheet-muted">N/C</span>}
                      </p>
                    </div>
                  ))}
                </li>
              </ol>
              <figcaption className="mt-3 text-sm text-white/65">{t('landing.example.caption')}</figcaption>
            </figure>
          </div>
        </section>

        <section id="method" className="scroll-mt-8 border-b">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:py-24">
            <div className="lg:col-span-4">
              <h2 className="font-display text-3xl lg:text-4xl">{t('landing.method.title')}</h2>
              <a
                href={DECISION_TABLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
              >
                {t('landing.method.tableLink')}
              </a>
            </div>
            <dl className="divide-y border-y lg:col-span-8">
              {methodFacts.map((fact) => (
                <div key={fact} className="grid gap-1 py-6 sm:grid-cols-[13rem_1fr] sm:gap-6">
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
                <thead>
                  <tr className="border-b text-sm text-muted-foreground">
                    <th className="py-3 pr-6 font-medium">{t('landing.systems.colSystem')}</th>
                    <th className="py-3 pr-6 font-medium max-sm:hidden">{t('landing.systems.colBasis')}</th>
                    <th className="py-3 text-right font-medium">{t('landing.systems.colExample')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {SYSTEMS.map((s) => (
                    <tr key={s.key}>
                      <th scope="row" className="py-5 pr-6 align-top text-lg font-semibold sm:whitespace-nowrap">
                        <span className={`mr-3 inline-block size-2.5 ${s.swatch}`} />
                        {s.name}
                        <span className="mt-1 block text-sm font-normal text-muted-foreground sm:hidden">
                          {t(`landing.systems.${s.key}`)}
                        </span>
                      </th>
                      <td className="py-5 pr-6 text-muted-foreground max-sm:hidden">{t(`landing.systems.${s.key}`)}</td>
                      <td className="font-display py-5 text-right align-top text-xl whitespace-nowrap">{s.example}</td>
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
              <a
                href={METHODOLOGY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-sm font-medium text-primary underline underline-offset-4"
              >
                {t('landing.studies.methodologyLink')}
              </a>
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
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-sm font-medium text-primary underline underline-offset-4"
              >
                {t('landing.source.repoLink')}
              </a>
            </div>
            <div className="lg:col-span-7">
              <h3 className="text-sm font-medium text-muted-foreground">{t('landing.source.citeTitle')}</h3>
              <p className="mt-2 select-all border bg-card px-4 py-3 font-mono text-sm leading-relaxed">
                {t('landing.source.citation', { url: REPO_URL })}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-3">
            <span className="font-medium text-foreground">Anklyze</span>
            <span>{t('landing.footer.license')}</span>
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
              GitHub
            </a>
          </p>
          <p>{t('landing.footer.disclaimer')}</p>
        </div>
      </footer>
    </div>
  );
}
