import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { Spinner } from '../ui/spinner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { Logo } from '../Logo';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithEmail, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string })?.from || '/classify';

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithEmail(email, password);
      if (!error) {
        navigate(from, { replace: true });
        return;
      }
      setError(t(/invalid login credentials/i.test(error.message) ? 'auth.invalidCredentials' : 'auth.signInFailed'));
    } catch {
      setError(t('auth.signInFailed'));
    }
    setLoading(false);
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="field-navy hidden flex-col justify-between p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2" style={{ '--logo-ink': 'oklch(0.27 0.09 262)' } as React.CSSProperties}>
          <Logo />
          <span className="text-lg font-semibold tracking-tight">Anklyze</span>
        </Link>
        <p className="font-display max-w-[14ch] text-5xl xl:text-6xl">{t('landing.hero.title')}</p>
        <p className="max-w-[60ch] text-sm text-white/65">{t('landing.footer.disclaimer')}</p>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-primary-fill lg:invisible">
            <Logo />
            <span className="text-lg font-semibold tracking-tight text-foreground">Anklyze</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-16 sm:px-6">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-semibold tracking-tight">{t('login.title', 'Sign in')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t('login.lede')}</p>

            {isConfigured ? (
              <form onSubmit={handleEmailSubmit} className="mt-8 space-y-5">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading && <Spinner size="sm" className="mr-2" />}
                  {t('auth.signInButton', 'Sign in')}
                </Button>
              </form>
            ) : (
              <Alert className="mt-8">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t('auth.notConfigured', 'Authentication not configured')}</AlertDescription>
              </Alert>
            )}

            <Link to="/" className="mt-6 inline-block text-sm text-muted-foreground underline hover:text-foreground">
              {t('auth.backToHome', 'Back to Home')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
