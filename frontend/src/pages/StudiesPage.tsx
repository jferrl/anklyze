import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  Users,
  CheckCircle2,
  ImageIcon,
  Loader2,
  Search,
  Filter,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { listPublishedStudies } from '../services/studyApi';
import type { UserStudyItem } from '../types/study';

type FilterStatus = 'all' | 'completed' | 'pending';

export function StudiesPage() {
  const { t } = useTranslation();
  const [studies, setStudies] = useState<UserStudyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

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

  // Filter and search studies
  const filteredStudies = useMemo(() => {
    return studies.filter((study) => {
      // Search filter
      const matchesSearch =
        study.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        study.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'completed' && study.has_responded) ||
        (filterStatus === 'pending' && !study.has_responded);

      return matchesSearch && matchesStatus;
    });
  }, [studies, searchQuery, filterStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = studies.length;
    const completed = studies.filter((s) => s.has_responded).length;
    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, progress };
  }, [studies]);

  const formatDeadline = (deadline: string | undefined) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    const now = new Date();
    const isExpired = date < now;
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      text: date.toLocaleDateString(),
      isExpired,
      daysLeft,
      isUrgent: !isExpired && daysLeft <= 3,
    };
  };

  return (
    <div className="h-full">
      {/* Header Section */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('studies.pageTitle')}</h1>
              <p className="text-muted-foreground mt-2">{t('studies.pageSubtitle')}</p>
            </div>

            {/* Progress Overview */}
            {!loading && studies.length > 0 && (
              <div className="flex items-center gap-6 p-4 rounded-lg bg-card border">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{t('studies.yourProgress')}</span>
                    <span className="font-medium">{stats.completed} / {stats.total}</span>
                  </div>
                  <Progress value={stats.progress} className="h-2" />
                </div>
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">{stats.completed} {t('studies.completedCount')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="text-muted-foreground">{stats.pending} {t('studies.pendingCount')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('studies.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Tabs */}
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <TabsList>
                <TabsTrigger value="all" className="gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {t('studies.filterAll')}
                  {stats.total > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {stats.total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-1.5">
                  {t('studies.filterPending')}
                  {stats.pending > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {stats.pending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('studies.filterCompleted')}
                  {stats.completed > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {stats.completed}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
        ) : filteredStudies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || filterStatus !== 'all'
                  ? t('studies.noMatchingStudies')
                  : t('studies.noStudies')
                }
              </h3>
              <p className="text-muted-foreground">
                {searchQuery || filterStatus !== 'all'
                  ? t('studies.tryDifferentFilter')
                  : t('studies.noStudiesDescription')
                }
              </p>
              {(searchQuery || filterStatus !== 'all') && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterStatus('all');
                  }}
                >
                  {t('studies.clearFilters')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStudies.map((study) => (
              <StudyCard key={study.id} study={study} formatDeadline={formatDeadline} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StudyCardProps {
  study: UserStudyItem;
  formatDeadline: (deadline: string | undefined) => {
    text: string;
    isExpired: boolean;
    daysLeft: number;
    isUrgent: boolean;
  } | null;
}

function StudyCard({ study, formatDeadline }: StudyCardProps) {
  const { t } = useTranslation();
  const deadline = formatDeadline(study.deadline);

  return (
    <Card className={`group relative overflow-hidden transition-all hover:shadow-lg ${
      study.has_responded ? 'border-green-200 dark:border-green-900' : ''
    }`}>
      {/* Status indicator bar */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${
        study.has_responded
          ? 'bg-green-500'
          : deadline?.isExpired
          ? 'bg-destructive'
          : deadline?.isUrgent
          ? 'bg-orange-500'
          : 'bg-primary'
      }`} />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {study.title}
          </CardTitle>
          {study.has_responded && (
            <Badge variant="secondary" className="shrink-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('studies.responded')}
            </Badge>
          )}
        </div>
        {study.description && (
          <CardDescription className="line-clamp-2 mt-1.5">
            {study.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline" className="gap-1">
            <ImageIcon className="h-3 w-3" />
            {study.image_count} {t('studies.imagesCount')}
          </Badge>
          {study.has_tac_images && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
              TAC
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {study.response_count} {t('studies.responses')}
          </Badge>
        </div>

        {/* Deadline */}
        {deadline && (
          <div className={`flex items-center gap-2 text-sm ${
            deadline.isExpired
              ? 'text-destructive'
              : deadline.isUrgent
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-muted-foreground'
          }`}>
            {deadline.isExpired ? (
              <Clock className="h-4 w-4" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
            {deadline.isExpired ? (
              <span className="font-medium">{t('studies.expired')}</span>
            ) : deadline.isUrgent ? (
              <span className="font-medium">
                {t('studies.daysLeft', { count: deadline.daysLeft })}
              </span>
            ) : (
              <span>{t('studies.deadline')}: {deadline.text}</span>
            )}
          </div>
        )}

        {/* User's response count */}
        {study.my_response_count > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>
              {t('studies.yourResponses', { count: study.my_response_count })}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Button asChild className="w-full group/btn">
          <Link to={`/studies/${study.id}`}>
            {study.has_responded
              ? t('studies.viewOrReanswer')
              : t('studies.startClassification')
            }
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
