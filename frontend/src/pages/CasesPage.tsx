import { useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Users, Check, ImageIcon, Search, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { EmptyState } from '../components/ui/empty-state';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { listPublishedCases } from '@/services';
import type { UserCaseItem } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

type FilterStatus = 'all' | 'completed' | 'pending';

export function CasesPage() {
  const { t, i18n } = useTranslation();
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
  const error = queryError instanceof Error ? queryError.message : queryError ? t('cases.loadListError') : null;

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
      text: formatDate(date, i18n.language),
      isExpired,
      daysLeft,
      isUrgent: !isExpired && daysLeft <= 3,
    };
  };

  const filterTabs: { value: FilterStatus; label: string; count: number }[] = [
    { value: 'all', label: t('cases.filterAll'), count: stats.total },
    { value: 'pending', label: t('cases.filterPending'), count: stats.pending },
    { value: 'completed', label: t('cases.filterCompleted'), count: stats.completed },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader
        title={t('cases.pageTitle')}
        description={t('cases.pageSubtitle')}
        actions={
          !loading && cases.length > 0 && (
            <div className="w-full space-y-2 sm:w-56">
              <p className="text-sm text-muted-foreground tabular-nums">
                <span className="font-medium text-foreground">{stats.completed} / {stats.total}</span>{' '}
                {t('cases.completedCount')}
              </p>
              <Progress value={stats.progress} className="h-1.5" aria-label={t('cases.yourProgress')} />
            </div>
          )
        }
      />

      <div className="sticky top-12 z-10 -mt-3 mb-3 flex flex-col gap-3 bg-background py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-[300px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('cases.searchPlaceholder')}
            aria-label={t('cases.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <TabsList>
            {filterTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                {tab.label}
                {tab.count > 0 && (
                  <span className="text-xs text-muted-foreground tabular-nums">{tab.count}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {loading ? (
        <div className="divide-y rounded-lg border bg-card">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-2 px-4 py-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border bg-card py-8 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : filteredCases.length === 0 ? (
        <div className="rounded-lg border bg-card">
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
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
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

  const meta = (
    <>
      {deadline ? (
        <span className={cn(deadline.isExpired && 'text-destructive', deadline.isUrgent && 'text-warning')}>
          {deadline.isExpired
            ? t('cases.expired')
            : deadline.isUrgent
              ? t('cases.daysLeft', { count: deadline.daysLeft })
              : deadline.text}
        </span>
      ) : (
        <span className="hidden md:block" />
      )}
      <span className="inline-flex items-center gap-1">
        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {caseItem.image_count}
        <span className="sr-only">{t('cases.imagesCount')}</span>
      </span>
      {/* Empty cells keep the desktop grid columns aligned down the list. */}
      {caseItem.has_tac_images ? (
        <Badge variant="outline">{t('cases.images.ct')}</Badge>
      ) : (
        <span className="hidden md:block" />
      )}
      <span className="inline-flex items-center gap-1">
        <Users className="h-3.5 w-3.5" aria-hidden="true" />
        {caseItem.response_count}
        <span className="sr-only">{t('cases.responses')}</span>
      </span>
    </>
  );

  return (
    <Link
      to={caseUrl}
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {completed ? (
          <Check className="h-4 w-4 text-success" aria-hidden="true" />
        ) : (
          <span className="h-2.5 w-2.5 rounded-full border border-muted-foreground" />
        )}
        <span className="sr-only">
          {completed ? t('cases.responded') : t('cases.filterPending')}
        </span>
      </span>

      <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
        {caseNumber}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-medium">{caseItem.title}</h3>
          {isNextUp && !completed && <Badge variant="outline">{t('cases.nextUp')}</Badge>}
        </div>
        {caseItem.description && (
          <p className="truncate text-sm text-muted-foreground">{caseItem.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums md:hidden">
          {meta}
        </div>
      </div>

      <div className="hidden shrink-0 grid-cols-[auto_2.5rem_3rem_2.5rem] items-center justify-items-end gap-4 text-xs text-muted-foreground tabular-nums md:grid">
        {meta}
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
