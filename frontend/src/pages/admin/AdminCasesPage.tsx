import { useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  BarChart3,
  Send,
  Lock,
  Award,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import { caseApi, InputValidationError } from '@/services';
import type { Case, CaseStatus } from '@/types';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './components/StatusBadge';
import { DataTable } from './components/DataTable';
import { FilterBar } from './components/FilterBar';
import { Pagination } from './components/Pagination';
import { SectionErrorBoundary } from '@/components/ui/error-boundary';

export function AdminCasesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<CaseStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cases', statusFilter, page],
    queryFn: () =>
      caseApi.listCases(
        statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit
      ),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const deleteMutation = useMutation({
    mutationFn: caseApi.deleteCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['published-cases'], refetchType: 'all' });
      setDeleteId(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: caseApi.publishCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['published-cases'], refetchType: 'all' });
    },
    onError: (error: Error) => {
      if (error instanceof InputValidationError && error.code === 'INVALID_STATE_TRANSITION') {
        toast.error(t('errors.invalidStateTransition'));
      } else {
        toast.error(t('errors.publishFailed'));
      }
    },
  });

  const closeMutation = useMutation({
    mutationFn: caseApi.closeCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['published-cases'], refetchType: 'all' });
    },
    onError: (error: Error) => {
      if (error instanceof InputValidationError && error.code === 'INVALID_STATE_TRANSITION') {
        toast.error(t('errors.invalidStateTransition'));
      } else {
        toast.error(t('errors.closeFailed'));
      }
    },
  });

  const cases = data?.cases ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const filteredCases = cases.filter((caseItem) =>
    caseItem.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  const isDeadlinePassed = useCallback((deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }, []);

  // Memoized action handlers
  const handleView = useCallback((id: string) => navigate(`/cases/${id}`), [navigate]);
  const handleEdit = useCallback((id: string) => navigate(`/admin/cases/${id}/edit`), [navigate]);
  const handleDelete = useCallback((id: string) => setDeleteId(id), []);
  const handlePublish = useCallback((id: string) => publishMutation.mutate(id), [publishMutation]);
  const handleClose = useCallback((id: string) => closeMutation.mutate(id), [closeMutation]);
  const handleViewAnalytics = useCallback((id: string) => navigate(`/admin/cases/${id}/analytics`), [navigate]);

  const statusOptions = useMemo(() => [
    { value: 'all', label: t('admin.cases.allStatuses') },
    { value: 'draft', label: t('cases.status.draft') },
    { value: 'published', label: t('cases.status.published') },
    { value: 'closed', label: t('cases.status.closed') },
  ], [t]);

  const columns = useMemo<ColumnDef<Case, unknown>[]>(() => [
    {
      id: 'title',
      header: () => t('admin.cases.table.title'),
      cell: ({ row }) => {
        const caseItem = row.original;
        return (
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-foreground truncate">{caseItem.title}</span>
              {caseItem.gold_standard && (
                <Award className="h-4 w-4 shrink-0 text-primary" aria-label={t('admin.reliability.goldStandardSet')} />
              )}
            </div>
            {caseItem.description && (
              <span className="text-sm text-muted-foreground truncate">
                {caseItem.description}
              </span>
            )}
            {caseItem.has_tac_images && (
              <Badge variant="outline" className="w-fit font-normal">
                {t('cases.images.ct')}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: () => t('admin.cases.table.status'),
      size: 130,
      cell: ({ row }) => {
        const caseItem = row.original;
        return (
          <StatusBadge status={caseItem.status} label={t(`cases.status.${caseItem.status}`)} className="shrink-0" />
        );
      },
    },
    {
      id: 'responses',
      header: () => t('admin.cases.table.responses'),
      size: 120,
      meta: { className: 'text-right' },
      cell: ({ row }) => {
        const caseItem = row.original;
        return (
<span className="tabular-nums">{caseItem.response_count}</span>
        );
      },
    },
    {
      id: 'created',
      header: () => t('admin.cases.table.created'),
      size: 130,
      meta: { className: 'hidden lg:table-cell text-muted-foreground tabular-nums' },
      cell: ({ row }) => {
        return <span>{formatDate(row.original.created_at)}</span>;
      },
    },
    {
      id: 'deadline',
      header: () => t('admin.cases.table.deadline'),
      size: 130,
      meta: { className: 'hidden lg:table-cell tabular-nums' },
      cell: ({ row }) => {
        const caseItem = row.original;
        return caseItem.deadline ? (
          <span
            className={cn(
              isDeadlinePassed(caseItem.deadline)
                ? 'text-destructive font-medium'
                : 'text-muted-foreground'
            )}
          >
            {formatDate(caseItem.deadline)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      id: 'actions',
      header: () => null,
      size: 56,
      cell: ({ row }) => {
        const caseItem = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => handleView(caseItem.id)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('common.view')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(caseItem.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              {caseItem.status !== 'draft' && (
                <DropdownMenuItem onClick={() => handleViewAnalytics(caseItem.id)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {t('admin.cases.analytics')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {caseItem.status === 'draft' && (
                <DropdownMenuItem onClick={() => handlePublish(caseItem.id)} className="text-success">
                  <Send className="h-4 w-4 mr-2" />
                  {t('admin.cases.publish')}
                </DropdownMenuItem>
              )}
              {caseItem.status === 'published' && (
                <DropdownMenuItem onClick={() => handleClose(caseItem.id)}>
                  <Lock className="h-4 w-4 mr-2" />
                  {t('admin.cases.close')}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleDelete(caseItem.id)} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [t, formatDate, isDeadlinePassed, handleView, handleEdit, handlePublish, handleClose, handleViewAnalytics, handleDelete]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading', 'Loading cases...')}</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          title={t('admin.cases.title')}
          description={t('admin.cases.subtitle')}
          actions={
            <Button onClick={() => navigate('/admin/cases/new')}>
              <Plus />
              {t('admin.cases.create')}
            </Button>
          }
        />

        {/* Filters */}
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('admin.cases.search')}
          filterValue={statusFilter}
          onFilterChange={(v) => setStatusFilter(v as CaseStatus | 'all')}
          filterPlaceholder={t('admin.cases.filterStatus')}
          filterOptions={statusOptions}
        />

        {/* Cases Table */}
        {filteredCases.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-12 text-center">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.cases.noCases')}
            </h2>
            <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-muted-foreground">
              {t('admin.cases.noCasesDesc')}
            </p>
            <Button onClick={() => navigate('/admin/cases/new')}>
              <Plus />
              {t('admin.cases.createFirst')}
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="md:hidden divide-y rounded-lg border bg-card">
              {filteredCases.map((caseItem) => (
                <CaseCard
                  key={caseItem.id}
                  caseItem={caseItem}
                  formatDate={formatDate}
                  isDeadlinePassed={isDeadlinePassed}
                  onView={() => handleView(caseItem.id)}
                  onEdit={() => handleEdit(caseItem.id)}
                  onDelete={() => handleDelete(caseItem.id)}
                  onPublish={() => handlePublish(caseItem.id)}
                  onClose={() => handleClose(caseItem.id)}
                  onViewAnalytics={() => handleViewAnalytics(caseItem.id)}
                  t={t}
                />
              ))}
            </div>

            {/* Desktop: Table layout */}
            <SectionErrorBoundary>
              <DataTable
                columns={columns}
                data={filteredCases}
                totalCount={total}
                page={page}
                pageSize={limit}
                onRowClick={(row) => handleView(row.id)}
              />
            </SectionErrorBoundary>
          </>
        )}

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          showingText={t('admin.cases.table.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}
        />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.cases.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.cases.deleteConfirm.description')}
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

interface CaseRowProps {
  caseItem: Case;
  formatDate: (date?: string) => string;
  isDeadlinePassed: (deadline?: string) => boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onClose: () => void;
  onViewAnalytics: () => void;
  t: (key: string) => string;
}

const CaseCard = memo(function CaseCard({
  caseItem,
  formatDate,
  isDeadlinePassed,
  onView,
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onViewAnalytics,
  t,
}: CaseRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="cursor-pointer p-4 transition-colors duration-150 hover:bg-muted"
      onClick={onView}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onView()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground truncate">{caseItem.title}</span>
            {caseItem.gold_standard && (
              <Award className="h-4 w-4 shrink-0 text-primary" />
            )}
            <StatusBadge status={caseItem.status} label={t(`cases.status.${caseItem.status}`)} className="shrink-0" />
          </div>
          {caseItem.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {caseItem.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm tabular-nums text-muted-foreground">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <BarChart3 className="w-3.5 h-3.5" />
              {caseItem.response_count} {t('admin.cases.table.responses').toLowerCase()}
            </span>
            <span>{formatDate(caseItem.created_at)}</span>
            {caseItem.deadline && (
              <span className={cn(
                isDeadlinePassed(caseItem.deadline) && 'text-destructive font-medium'
              )}>
                {formatDate(caseItem.deadline)}
              </span>
            )}
          </div>
          {caseItem.has_tac_images && (
            <Badge variant="outline" className="mt-2 font-normal">
              {t('cases.images.ct')}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="shrink-0">
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
            {caseItem.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewAnalytics}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('admin.cases.analytics')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {caseItem.status === 'draft' && (
              <DropdownMenuItem onClick={onPublish} className="text-success">
                <Send className="h-4 w-4 mr-2" />
                {t('admin.cases.publish')}
              </DropdownMenuItem>
            )}
            {caseItem.status === 'published' && (
              <DropdownMenuItem onClick={onClose}>
                <Lock className="h-4 w-4 mr-2" />
                {t('admin.cases.close')}
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
});
