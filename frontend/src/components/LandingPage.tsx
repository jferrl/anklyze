import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';
import {
  Activity,
  Zap,
  Layers,
  MousePointerClick,
  ListChecks,
  FileCheck2,
  Sparkles,
  Github,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

export function LandingPage() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Activity,
      title: t('landing.features.accurate.title'),
      description: t('landing.features.accurate.description'),
      className: 'md:col-span-2',
    },
    {
      icon: Zap,
      title: t('landing.features.fast.title'),
      description: t('landing.features.fast.description'),
      className: '',
    },
    {
      icon: Layers,
      title: t('landing.features.comprehensive.title'),
      description: t('landing.features.comprehensive.description'),
      className: '',
    },
    {
      icon: MessageCircle,
      title: t('landing.features.chat.title'),
      description: t('landing.features.chat.description'),
      badge: t('landing.features.chat.badge'),
      className: 'md:col-span-2',
    },
  ];

  const steps = [
    {
      icon: MousePointerClick,
      number: '1',
      title: t('landing.howItWorks.step1.title'),
      description: t('landing.howItWorks.step1.description'),
    },
    {
      icon: ListChecks,
      number: '2',
      title: t('landing.howItWorks.step2.title'),
      description: t('landing.howItWorks.step2.description'),
    },
    {
      icon: FileCheck2,
      number: '3',
      title: t('landing.howItWorks.step3.title'),
      description: t('landing.howItWorks.step3.description'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center glow-sm">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-bold text-xl tracking-tight">Anklyze</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button size="sm" className="hover-glow" asChild>
              <Link to="/classify">
                <Sparkles className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('landing.startClassifying')}</span>
              </Link>
            </Button>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <Button variant="ghost" size="icon" asChild>
              <a
                href="https://github.com/jferrl/anklyze"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-mesh">
        {/* Animated floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-[10%] w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-[15%] w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute bottom-20 left-[20%] w-64 h-64 bg-primary/15 rounded-full blur-3xl animate-float-slow" />
        </div>

        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-2 text-sm border border-primary/20 bg-primary/5 hover-glow">
              <span className="mr-2">🦴</span>
              {t('landing.badge')}
            </Badge>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              {t('landing.headline')}{' '}
              <span className="text-gradient-animated">
                {t('landing.headlineHighlight')}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('landing.subheadline')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="text-base px-8 glow hover-glow group" asChild>
                <Link to="/classify">
                  {t('landing.startClassifying')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 hover-glow" asChild>
                <a href="#how-it-works">{t('landing.learnMore')}</a>
              </Button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 pt-12">
              {[
                { value: '4', label: 'Classification Systems' },
                { value: '100%', label: 'Accurate Results' },
                { value: '<1s', label: 'Response Time' },
              ].map((stat) => (
                <div key={stat.label} className="text-center px-6">
                  <div className="text-4xl font-bold text-gradient">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Bento Grid */}
      <section className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-50" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              {t('landing.features.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          {/* Bento Grid */}
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className={`group relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-500 card-hover spotlight ${feature.className}`}
              >
                <CardContent className="p-6 h-full flex flex-col">
                  <div className="mb-4 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-all duration-300 group-hover:glow-sm">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    {feature.badge && (
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                        {feature.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-1">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28 relative">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="relative group">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-16 left-[60%] w-[80%] h-[2px] bg-gradient-to-r from-primary/50 to-transparent" />
                )}

                <div className="text-center space-y-4">
                  <div className="relative mx-auto">
                    <div className="h-28 w-28 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mx-auto group-hover:from-primary/10 group-hover:to-primary/5 transition-all duration-500 group-hover:shadow-xl group-hover:shadow-primary/10">
                      <step.icon className="h-12 w-12 text-primary" />
                    </div>
                    {step.number && (
                      <div className="absolute -top-2 -right-2 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg glow-sm">
                        {step.number}
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-xl">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-0 bg-gradient-animated overflow-hidden relative">
            <CardContent className="py-16 px-8 text-center space-y-6 relative">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white">
                {t('landing.cta.title')}
              </h2>
              <p className="text-white/80 text-lg max-w-xl mx-auto">
                {t('landing.cta.subtitle')}
              </p>
              <Button size="lg" variant="secondary" className="text-base px-8 hover-glow group" asChild>
                <Link to="/classify">
                  {t('landing.cta.button')}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-medium text-foreground">
                {t('landing.footer.copyright')}
              </span>
              <span>© {new Date().getFullYear()}</span>
              <span className="mx-2">·</span>
              <a
                href="https://api.anklyze.es/swagger/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                {t('landing.footer.apiDocs')}
              </a>
            </div>
            <p className="text-center md:text-right">{t('landing.footer.disclaimer')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
