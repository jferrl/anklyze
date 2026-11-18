import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Logo } from './Logo';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-foreground">Anklyze</span>
          </Link>
        </nav>
      </header>
      <main className="field-navy flex flex-1 items-center">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h1 className="font-display text-[clamp(2.25rem,4.6vw,4.25rem)]">{t('errors.pageNotFound')}</h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-white/80">{t('errors.pageNotFoundBody')}</p>
          <Link
            to="/"
            className="mt-8 inline-flex h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-field-ink transition-colors duration-150 hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {t('auth.backToHome')}
          </Link>
        </div>
      </main>
    </div>
  );
}
