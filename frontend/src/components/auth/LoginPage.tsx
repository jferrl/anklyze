import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, Mail, Lock, Loader2, AlertCircle, Sparkles, BookOpen, BarChart3 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { LanguageSwitcher } from '../LanguageSwitcher';

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

    const { error } = await signInWithEmail(email, password);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigate(from, { replace: true });
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Activity className="h-7 w-7 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Anklyze</CardTitle>
            <CardDescription>
              {t('auth.notConfigured', 'Authentication not configured')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('auth.contactAdmin', 'Please contact the administrator to configure authentication.')}
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link to="/">{t('auth.backToHome', 'Back to Home')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-background to-muted">
      {/* Theme/Language switchers */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>

      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary/5 items-center justify-center p-12 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-lg">
          {/* Logo and tagline */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Anklyze</h1>
              <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
            </div>
          </div>

          {/* Features list */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">
              {t('login.welcome', 'Welcome back')}
            </h2>
            <p className="text-muted-foreground text-lg">
              {t('login.subtitle', 'Sign in to access clinical studies and fracture classification tools.')}
            </p>

            <div className="space-y-4 pt-4">
              <FeatureItem
                icon={<Sparkles className="h-5 w-5" />}
                title={t('login.feature1Title', 'Instant Classification')}
                description={t('login.feature1Desc', 'Get Lauge-Hansen, Danis-Weber, AO/OTA classifications in seconds.')}
              />
              <FeatureItem
                icon={<BookOpen className="h-5 w-5" />}
                title={t('login.feature2Title', 'Clinical Studies')}
                description={t('login.feature2Desc', 'Participate in fracture classification studies and compare results.')}
              />
              <FeatureItem
                icon={<BarChart3 className="h-5 w-5" />}
                title={t('login.feature3Title', 'Track Progress')}
                description={t('login.feature3Desc', 'Monitor your classification history and improve over time.')}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <Card className="w-full max-w-md border-0 shadow-xl lg:border lg:shadow-2xl">
          <CardHeader className="space-y-1 text-center lg:text-left">
            {/* Mobile logo */}
            <div className="flex lg:hidden justify-center mb-4">
              <Link to="/">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
                  <Activity className="h-7 w-7 text-primary-foreground" />
                </div>
              </Link>
            </div>
            <CardTitle className="text-2xl font-bold">
              {t('login.title', 'Sign in')}
            </CardTitle>
            <CardDescription>
              {t('auth.signIn', 'Sign in to continue')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email', 'Email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password', 'Password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    placeholder="********"
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('auth.signInButton', 'Sign in')}
              </Button>
            </form>

            {/* Back to home link */}
            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {t('auth.backToHome', 'Back to Home')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
