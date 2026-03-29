import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Clock,
  Users,
  CheckCircle2,
  ImageIcon,
  Search,
  Filter,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import { EmptyState } from '../components/ui/empty-state';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { listPublishedCases } from '@/services';
import type { UserCaseItem } from '@/types';
import { cn } from '@/lib/utils';

type FilterStatus = 'all' | 'completed' | 'pending';

export function CasesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const filterStatus = (searchParams.get('status') as FilterStatus) || 'all';

  const updateParam = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSearchQuery = useCallback((q: string) => updateParam('q', q), [updateParam]);
  const setFilterStatus = useCallback((s: FilterStatus) => updateParam('status', s), [updateParam]);

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['published-cases'],
    queryFn: () => listPublishedCases(1, 10000),
  });

  const cases = useMemo(() => data?.cases ?? [], [data]);
  const total = data?.total ?? 0;
  const error = queryError instanceof Error ? queryError.message : queryError ? 'Failed to load cases' : null;

  // Find the index of the first pending case (for "next up" highlight)
  const firstPendingIndex = useMemo(
    () => cases.findIndex((c) => !c.has_responded),
    [cases],
  );

  const filteredCases = useMemo(() => {
    return cases
      .map((caseItem, index) => ({ caseItem, originalIndex: index }))
      .filter(({ caseItem }) => {
        const matchesSearch =
          caseItem.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          caseItem.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
          filterStatus === 'all' ||
          (filterStatus === 'completed' && caseItem.has_responded) ||
          (filterStatus === 'pending' && !caseItem.has_responded);

        return matchesSearch && matchesStatus;
      });
  }, [cases, searchQuery, filterStatus]);

  const stats = useMemo(() => {
    const completed = data?.total_completed ?? 0;
    const pending = total - completed;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, progress };
  }, [data, total]);

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
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('cases.pageTitle')}</h1>
              <p className="text-muted-foreground mt-2">{t('cases.pageSubtitle')}</p>
            </div>

            {!loading && cases.length > 0 && (
              <div className="flex items-center gap-6 p-4 rounded-xl border bg-card">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{t('cases.yourProgress')}</span>
                    <span className="font-medium">{stats.completed} / {stats.total}</span>
                  </div>
                  <Progress value={stats.progress} className="h-2" />
                </div>
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">{stats.completed} {t('cases.completedCount')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="text-muted-foreground">{stats.pending} {t('cases.pendingCount')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('cases.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
              <TabsList>
                <TabsTrigger value="all" className="gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {t('cases.filterAll')}
                  {stats.total > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {stats.total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-1.5">
                  {t('cases.filterPending')}
                  {stats.pending > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {stats.pending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('cases.filterCompleted')}
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
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {error}
            </CardContent>
          </Card>
        ) : filteredCases.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={FileText}
                title={
                  searchQuery || filterStatus !== 'all'
                    ? t('cases.noMatchingCases')
                    : t('cases.noCases')
                }
                description={
                  searchQuery || filterStatus !== 'all'
                    ? t('cases.tryDifferentFilter')
                    : t('cases.noCasesDescription')
                }
                action={
                  (searchQuery || filterStatus !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterStatus('all');
                      }}
                    >
                      {t('cases.clearFilters')}
                    </Button>
                  )
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCases.map(({ caseItem, originalIndex }) => {
              const params = new URLSearchParams();
              if (filterStatus !== 'all') params.set('status', filterStatus);
              if (searchQuery) params.set('q', searchQuery);
              return (
                <CaseRow
                  key={caseItem.id}
                  caseItem={caseItem}
                  caseNumber={originalIndex + 1}
                  isNextUp={originalIndex === firstPendingIndex}
                  filterParams={params.toString()}
                  formatDeadline={formatDeadline}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

interface CaseRowProps {
  caseItem: UserCaseItem;
  caseNumber: number;
  isNextUp: boolean;
  filterParams: string;
  formatDeadline: (deadline: string | undefined) => {
    text: string;
    isExpired: boolean;
    daysLeft: number;
    isUrgent: boolean;
  } | null;
}

function CaseRow({ caseItem, caseNumber, isNextUp, filterParams, formatDeadline }: CaseRowProps) {
  const { t } = useTranslation();
  const deadline = formatDeadline(caseItem.deadline);
  const caseUrl = `/cases/${caseItem.id}${filterParams ? `?${filterParams}` : ''}`;
  const completed = caseItem.has_responded;

  return (
    <Link
      to={caseUrl}
      className={cn(
        'group block rounded-lg border bg-card transition-colors',
        completed
          ? 'opacity-60 hover:opacity-80'
          : 'hover:bg-accent/50',
        isNextUp && !completed && 'ring-2 ring-primary/50 border-primary/30',
      )}
    >
      <div className="flex items-center gap-4 px-4 py-3 sm:px-5 sm:py-4">
        {/* Case number */}
        <div className={cn(
          'hidden sm:flex items-center justify-center h-10 w-10 rounded-lg text-sm font-semibold shrink-0',
          completed
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-muted text-muted-foreground',
        )}>
          {completed ? <CheckCircle2 className="h-5 w-5" /> : caseNumber}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-muted-foreground sm:hidden">
              {t('cases.caseNumber', { number: caseNumber })}
            </span>
            {isNextUp && !completed && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0">
                {t('cases.nextUp')}
              </Badge>
            )}
          </div>
          <h3 className={cn(
            'font-medium truncate',
            !completed && 'group-hover:text-primary transition-colors',
          )}>
            {caseItem.title}
          </h3>
          {caseItem.description && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {caseItem.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground shrink-0">
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            {caseItem.image_count}
          </span>
          {caseItem.has_tac_images && (
            <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 dark:text-blue-400">
              TAC
            </Badge>
          )}
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {caseItem.response_count}
          </span>
          {deadline && (
            <span className={cn(
              'inline-flex items-center gap-1',
              deadline.isExpired && 'text-destructive',
              deadline.isUrgent && 'text-orange-600 dark:text-orange-400',
            )}>
              {deadline.isExpired ? (
                <Clock className="h-3.5 w-3.5" />
              ) : (
                <CalendarDays className="h-3.5 w-3.5" />
              )}
              {deadline.isExpired
                ? t('cases.expired')
                : deadline.isUrgent
                  ? t('cases.daysLeft', { count: deadline.daysLeft })
                  : deadline.text}
            </span>
          )}
        </div>

        {/* Status + arrow */}
        <div className="flex items-center gap-3 shrink-0">
          {completed && (
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 hidden sm:flex">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {t('cases.responded')}
            </Badge>
          )}
          <ArrowRight className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            !completed && 'group-hover:translate-x-1 group-hover:text-primary',
          )} />
        </div>
      </div>

      {/* Mobile metadata row */}
      <div className="flex md:hidden items-center gap-3 px-4 pb-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          {caseItem.image_count} {t('cases.imagesCount')}
        </span>
        {caseItem.has_tac_images && (
          <Badge variant="outline" className="text-xs border-blue-500/30 text-blue-600 dark:text-blue-400 h-5">
            TAC
          </Badge>
        )}
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {caseItem.response_count} {t('cases.responses')}
        </span>
        {deadline && (
          <span className={cn(
            'inline-flex items-center gap-1',
            deadline.isExpired && 'text-destructive',
            deadline.isUrgent && 'text-orange-600 dark:text-orange-400',
          )}>
            {deadline.isExpired ? t('cases.expired') : deadline.text}
          </span>
        )}
      </div>
    </Link>
  );
}
