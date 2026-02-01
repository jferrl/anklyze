import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  BarChart3,
  Play,
  Lock,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { studyApi } from '../../services/studyApi';
import type { StudyCohort, CohortStatus } from '../../types/study';
import { cn } from '@/lib/utils';

export function AdminCohortsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CohortStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cohorts', statusFilter, page],
    queryFn: () =>
      studyApi.listCohorts(
        statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit
      ),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const deleteMutation = useMutation({
    mutationFn: studyApi.deleteCohort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'], refetchType: 'all' });
      setDeleteId(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: studyApi.activateCohort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'], refetchType: 'all' });
    },
  });

  const closeMutation = useMutation({
    mutationFn: studyApi.closeCohort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'], refetchType: 'all' });
    },
  });

  const cohorts = data?.cohorts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const filteredCohorts = cohorts.filter((cohort) =>
    cohort.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 blur-xl mx-auto" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">
            {t('common.loading', 'Loading cohorts...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {t('admin.cohorts.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('admin.cohorts.subtitle')}
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/cohorts/new')}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              {t('admin.cohorts.create')}
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="chart-card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.cohorts.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50 focus:bg-background"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as CohortStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-muted/30 border-border/50">
                <SelectValue placeholder={t('admin.cohorts.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.cohorts.allStatuses')}</SelectItem>
                <SelectItem value="draft">{t('admin.cohorts.status.draft')}</SelectItem>
                <SelectItem value="active">{t('admin.cohorts.status.active')}</SelectItem>
                <SelectItem value="closed">{t('admin.cohorts.status.closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cohorts Table */}
        {filteredCohorts.length === 0 ? (
          <div className="chart-card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FolderKanban className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('admin.cohorts.noCohorts')}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('admin.cohorts.noCohortsDesc')}
            </p>
            <Button onClick={() => navigate('/admin/cohorts/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('admin.cohorts.createFirst')}
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="md:hidden space-y-3">
              {filteredCohorts.map((cohort, index) => (
                <CohortCard
                  key={cohort.id}
                  cohort={cohort}
                  index={index}
                  formatDate={formatDate}
                  onView={() => navigate(`/admin/cohorts/${cohort.id}`)}
                  onEdit={() => navigate(`/admin/cohorts/${cohort.id}/edit`)}
                  onDelete={() => setDeleteId(cohort.id)}
                  onActivate={() => activateMutation.mutate(cohort.id)}
                  onClose={() => closeMutation.mutate(cohort.id)}
                  onViewReliability={() => navigate(`/admin/cohorts/${cohort.id}/reliability`)}
                  t={t}
                />
              ))}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden md:block chart-card p-0">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[40%] text-muted-foreground font-medium">
                      {t('admin.cohorts.table.title')}
                    </TableHead>
                    <TableHead className="w-[90px] text-muted-foreground font-medium">
                      {t('admin.cohorts.table.status')}
                    </TableHead>
                    <TableHead className="w-[70px] text-center text-muted-foreground font-medium">
                      {t('admin.cohorts.table.cases')}
                    </TableHead>
                    <TableHead className="w-[70px] text-center text-muted-foreground font-medium">
                      {t('admin.cohorts.table.raters')}
                    </TableHead>
                    <TableHead className="w-[80px] text-center text-muted-foreground font-medium hidden lg:table-cell">
                      {t('admin.cohorts.table.complete')}
                    </TableHead>
                    <TableHead className="w-[100px] text-muted-foreground font-medium hidden lg:table-cell">
                      {t('admin.cohorts.table.created')}
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCohorts.map((cohort, index) => (
                    <CohortRow
                      key={cohort.id}
                      cohort={cohort}
                      index={index}
                      formatDate={formatDate}
                      onView={() => navigate(`/admin/cohorts/${cohort.id}`)}
                      onEdit={() => navigate(`/admin/cohorts/${cohort.id}/edit`)}
                      onDelete={() => setDeleteId(cohort.id)}
                      onActivate={() => activateMutation.mutate(cohort.id)}
                      onClose={() => closeMutation.mutate(cohort.id)}
                      onViewReliability={() => navigate(`/admin/cohorts/${cohort.id}/reliability`)}
                      t={t}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-muted-foreground">
              {t('admin.cohorts.table.showing', {
                from: (page - 1) * limit + 1,
                to: Math.min(page * limit, total),
                total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="bg-card/50 border-border/50 hover:bg-muted/50"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3 py-2 bg-muted/30 rounded-lg">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="bg-card/50 border-border/50 hover:bg-muted/50"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.cohorts.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.cohorts.deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface CohortRowProps {
  cohort: StudyCohort;
  index: number;
  formatDate: (date?: string) => string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onClose: () => void;
  onViewReliability: () => void;
  t: (key: string) => string;
}

function CohortCard({
  cohort,
  index,
  formatDate,
  onView,
  onEdit,
  onDelete,
  onActivate,
  onClose,
  onViewReliability,
  t,
}: CohortRowProps) {
  return (
    <div
      className={cn(
        'chart-card p-4 cursor-pointer hover:bg-muted/30 transition-colors',
        'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]'
      )}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground truncate">{cohort.title}</span>
            <Badge
              variant="outline"
              className={cn(
                'font-medium text-xs flex-shrink-0',
                cohort.status === 'active' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
                cohort.status === 'closed' && 'border-muted-foreground/50 bg-muted/30',
                cohort.status === 'draft' && 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5'
              )}
            >
              {t(`admin.cohorts.status.${cohort.status}`)}
            </Badge>
          </div>
          {cohort.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {cohort.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {cohort.case_count} {t('admin.cohorts.table.cases').toLowerCase()}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {cohort.unique_raters} {t('admin.cohorts.table.raters').toLowerCase()}
            </span>
            <span>{formatDate(cohort.created_at)}</span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="hover:bg-muted/50 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              {t('common.view')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            {cohort.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewReliability}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('admin.cohorts.reliability.title')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {cohort.status === 'draft' && (
              <DropdownMenuItem onClick={onActivate} className="text-emerald-600 dark:text-emerald-400">
                <Play className="h-4 w-4 mr-2" />
                {t('admin.cohorts.activate')}
              </DropdownMenuItem>
            )}
            {cohort.status === 'active' && (
              <DropdownMenuItem onClick={onClose}>
                <Lock className="h-4 w-4 mr-2" />
                {t('admin.cohorts.close')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function CohortRow({
  cohort,
  index,
  formatDate,
  onView,
  onEdit,
  onDelete,
  onActivate,
  onClose,
  onViewReliability,
  t,
}: CohortRowProps) {
  return (
    <TableRow
      className={cn(
        'cursor-pointer border-border/30 hover:bg-muted/30 transition-colors duration-200',
        'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]'
      )}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={onView}
    >
      <TableCell className="max-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-medium text-foreground truncate">{cohort.title}</span>
          {cohort.description && (
            <span className="text-sm text-muted-foreground truncate">
              {cohort.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            'font-medium whitespace-nowrap',
            cohort.status === 'active' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
            cohort.status === 'closed' && 'border-muted-foreground/50 bg-muted/30',
            cohort.status === 'draft' && 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5'
          )}
        >
          {t(`admin.cohorts.status.${cohort.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className={cn(
          'inline-flex items-center justify-center gap-1 min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
          cohort.case_count > 0
            ? 'bg-primary/10 text-primary'
            : 'bg-muted/50 text-muted-foreground'
        )}>
          <FileText className="w-3 h-3" />
          {cohort.case_count}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={cn(
          'inline-flex items-center justify-center gap-1 min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
          cohort.unique_raters > 0
            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
            : 'bg-muted/50 text-muted-foreground'
        )}>
          <Users className="w-3 h-3" />
          {cohort.unique_raters}
        </span>
      </TableCell>
      <TableCell className="text-center hidden lg:table-cell">
        <span className={cn(
          'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
          cohort.complete_raters > 0
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-muted/50 text-muted-foreground'
        )}>
          {cohort.complete_raters}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
        {formatDate(cohort.created_at)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted/50"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              {t('common.view')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            {cohort.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewReliability}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('admin.cohorts.reliability.title')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {cohort.status === 'draft' && (
              <DropdownMenuItem onClick={onActivate} className="text-emerald-600 dark:text-emerald-400">
                <Play className="h-4 w-4 mr-2" />
                {t('admin.cohorts.activate')}
              </DropdownMenuItem>
            )}
            {cohort.status === 'active' && (
              <DropdownMenuItem onClick={onClose}>
                <Lock className="h-4 w-4 mr-2" />
                {t('admin.cohorts.close')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
