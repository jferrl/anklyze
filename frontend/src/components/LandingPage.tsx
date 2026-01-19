import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Separator } from './ui/separator';
import { LanguageSwitcher } from './LanguageSwitcher';
import {
  Activity,
  Zap,
  Layers,
  Heart,
  MousePointerClick,
  ListChecks,
  FileCheck2,
  ArrowRight,
  Github,
  Stethoscope,
  Code,
} from 'lucide-react';

export function LandingPage() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Activity,
      title: t('landing.features.accurate.title'),
      description: t('landing.features.accurate.description'),
    },
    {
      icon: Zap,
      title: t('landing.features.fast.title'),
      description: t('landing.features.fast.description'),
    },
    {
      icon: Layers,
      title: t('landing.features.comprehensive.title'),
      description: t('landing.features.comprehensive.description'),
    },
    {
      icon: Heart,
      title: t('landing.features.free.title'),
      description: t('landing.features.free.description'),
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
      title: t('landing.howItWorks.step3.title'),
      description: t('landing.howItWorks.step3.description'),
    },
  ];

  const team = [
    {
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=LauraFemale',
      icon: Stethoscope,
      name: t('landing.team.laura.name'),
      role: t('landing.team.laura.role'),
    },
    {
      avatar: 'https://api.dicebear.com/9.x/lorelei/svg?seed=Jorge',
      icon: Code,
      name: t('landing.team.jorge.name'),
      role: t('landing.team.jorge.role'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-xl tracking-tight">Anklyze</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Button size="sm" asChild>
              <Link to="/classify">{t('landing.startClassifying')}</Link>
            </Button>
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
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-primary/5 via-transparent to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="px-4 py-1.5 text-sm">
              {t('landing.badge')}
            </Badge>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              {t('landing.headline')}{' '}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                {t('landing.headlineHighlight')}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t('landing.subheadline')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" className="text-base px-8" asChild>
                <Link to="/classify">
                  {t('landing.startClassifying')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8" asChild>
                <a href="#how-it-works">{t('landing.learnMore')}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t('landing.features.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-0 shadow-none bg-transparent hover:bg-muted/50 transition-colors"
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t('landing.howItWorks.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-[2px] bg-border" />
                )}

                <div className="text-center space-y-4">
                  <div className="relative mx-auto">
                    <div className="h-24 w-24 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                      <step.icon className="h-10 w-10 text-primary" />
                    </div>
                    {step.number && (
                      <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
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

      {/* Team Section */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              {t('landing.team.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.team.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {team.map((member, index) => (
              <Card
                key={index}
                className="border-0 shadow-none bg-transparent hover:bg-muted/50 transition-colors"
              >
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="relative mx-auto w-fit">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="h-20 w-20 rounded-full bg-primary/10"
                    />
                    <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                      <member.icon className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{member.name}</h3>
                    <p className="text-muted-foreground text-sm">{member.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto border-0 bg-primary text-primary-foreground">
            <CardContent className="py-12 px-8 text-center space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                {t('landing.cta.title')}
              </h2>
              <p className="text-primary-foreground/80 text-lg max-w-xl mx-auto">
                {t('landing.cta.subtitle')}
              </p>
              <Button size="lg" variant="secondary" className="text-base px-8" asChild>
                <Link to="/classify">{t('landing.cta.button')}</Link>
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
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Activity className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-medium text-foreground">
                {t('landing.footer.copyright')}
              </span>
              <span>© {new Date().getFullYear()}</span>
            </div>
            <p className="text-center md:text-right">{t('landing.footer.disclaimer')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
