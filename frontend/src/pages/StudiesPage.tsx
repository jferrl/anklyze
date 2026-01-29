import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Activity, Home, FileText, Clock, Users, CheckCircle2, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { UserMenu } from '../components/auth/UserMenu';
import { listPublishedStudies } from '../services/studyApi';
import type { UserStudyItem } from '../types/study';

export function StudiesPage() {
  const { t } = useTranslation();
  const [studies, setStudies] = useState<UserStudyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudies() {
      try {
        setLoading(true);
        const response = await listPublishedStudies();
        setStudies(response.studies);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load studies');
      } finally {
        setLoading(false);
      }
    }

    fetchStudies();
  }, []);

  const formatDeadline = (deadline: string | undefined) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const isExpired = date < now;

    return {
      text: date.toLocaleDateString(),
      isExpired,
    };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-semibold text-xl tracking-tight">Anklyze</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.home')}</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/classify">
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.classify')}</span>
              </Link>
            </Button>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold">{t('studies.pageTitle')}</h1>
          <p className="text-muted-foreground mt-2">{t('studies.pageSubtitle')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {error}
            </CardContent>
          </Card>
        ) : studies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t('studies.noStudies')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => {
              const deadline = formatDeadline(study.deadline);

              return (
                <Card key={study.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{study.title}</CardTitle>
                      {study.has_responded && (
                        <Badge variant="secondary" className="shrink-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {t('studies.responded')}
                        </Badge>
                      )}
                    </div>
                    {study.description && (
                      <CardDescription className="line-clamp-2">
                        {study.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        {study.image_count} {t('studies.imagesCount')}
                      </Badge>
                      {study.has_tac_images && (
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950">
                          TAC
                        </Badge>
                      )}
                      <Badge variant="outline">
                        <Users className="h-3 w-3 mr-1" />
                        {study.response_count}
                      </Badge>
                    </div>

                    {deadline && (
                      <div className={`flex items-center gap-1 text-sm mb-4 ${
                        deadline.isExpired ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {deadline.isExpired
                          ? t('studies.expired')
                          : `${t('studies.deadline')}: ${deadline.text}`
                        }
                      </div>
                    )}

                    <Button asChild className="w-full">
                      <Link to={`/studies/${study.id}`}>
                        {study.has_responded
                          ? t('studies.viewOrReanswer')
                          : t('studies.startClassification')
                        }
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
