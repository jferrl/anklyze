import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AppShell } from '../layout';
import { Button } from '../ui/button';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { Logo } from '../Logo';

/**
 * ClassifyRoute shows signed-in users the app shell and anonymous visitors a bare
 * header, so the classify page can be shared publicly.
 */
export function ClassifyRoute({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { isAuthenticated, loading } = useAuth();

  if (loading) return null;
  if (isAuthenticated) return <AppShell>{children}</AppShell>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-primary-fill">
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-foreground">Anklyze</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">{t('landing.nav.signIn')}</Link>
            </Button>
          </div>
        </nav>
      </header>
      <main id="content">{children}</main>
    </div>
  );
}
