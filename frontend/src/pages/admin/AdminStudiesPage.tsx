import { useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  BarChart3,
  Play,
  Lock,
  Users,
  FileText,
} from 'lucide-react';
import type { TFunction } from 'i18next';
import { Button, buttonVariants } from '../../components/ui/button';
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
import { studyApi } from '@/services';
import type { Study, StudyStatus } from '@/types';
import { formatDate as formatDateIn } from '@/lib/format';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './components/StatusBadge';
import { DataTable } from './components/DataTable';
import { FilterBar } from './components/FilterBar';
import { NoMatchState } from './components/NoMatchState';
import { Pagination } from './components/Pagination';
import { SectionErrorBoundary } from '@/components/ui/error-boundary';

export function AdminStudiesPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StudyStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Study | null>(null);
  const [closeTarget, setCloseTarget] = useState<Study | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-studies', statusFilter, page],
    queryFn: () =>
      studyApi.listStudies(
        statusFilter === 'all' ? undefined : statusFilter,
        page,
        limit
      ),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const deleteMutation = useMutation({
    mutationFn: studyApi.deleteStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'], refetchType: 'all' });
      setDeleteTarget(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: studyApi.activateStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'], refetchType: 'all' });
    },
  });

  const closeMutation = useMutation({
    mutationFn: studyApi.closeStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'], refetchType: 'all' });
    },
  });

  const studies = data?.studies ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const isFiltered = searchQuery.trim() !== '' || statusFilter !== 'all';

  const filteredStudies = studies.filter((study) =>
    study.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = useCallback(
    (dateString?: string) => (dateString ? formatDateIn(dateString, i18n.language) : ''),
    [i18n.language]
  );

  // Memoized action handlers
  const handleEdit = useCallback((id: string) => navigate(`/admin/studies/${id}/edit`), [navigate]);
  const handleDelete = useCallback((study: Study) => setDeleteTarget(study), []);
  const handleActivate = useCallback((id: string) => activateMutation.mutate(id), [activateMutation]);
  const handleClose = useCallback((study: Study) => setCloseTarget(study), []);
  const handleViewReliability = useCallback((id: string) => navigate(`/admin/studies/${id}/reliability`), [navigate]);

  const studyStatusOptions = useMemo(() => [
    { value: 'all', label: t('admin.studies.allStatuses', 'All statuses') },
    { value: 'draft', label: t('studies.status.draft') },
    { value: 'active', label: t('studies.status.active') },
    { value: 'closed', label: t('studies.status.closed') },
  ], [t]);

  const columns = useMemo<ColumnDef<Study, unknown>[]>(() => [
    {
      id: 'title',
      header: () => t('admin.studies.table.title', 'Study'),
      cell: ({ row }) => {
        const study = row.original;
        return (
          <div className="flex flex-col gap-1 min-w-0">
            <span className="font-medium text-foreground truncate">{study.title}</span>
            {study.description && (
              <span className="text-sm text-muted-foreground truncate">
                {study.description}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: () => t('admin.studies.table.status', 'Status'),
      size: 130,
      cell: ({ row }) => {
        const study = row.original;
        return (
          <StatusBadge status={study.status} label={t(`studies.status.${study.status}`)} className="shrink-0" />
        );
      },
    },
    {
      id: 'cases',
      header: () => t('admin.studies.table.cases', 'Cases'),
      size: 120,
      meta: { className: 'text-right' },
      cell: ({ row }) => {
        const study = row.original;
        return (
          <span className="tabular-nums">{study.case_count}</span>
        );
      },
    },
    {
      id: 'raters',
      header: () => t('admin.studies.table.raters', 'Raters'),
      size: 120,
      meta: { className: 'text-right' },
      cell: ({ row }) => {
        const study = row.original;
        return (
          <span className="tabular-nums">{study.unique_raters}</span>
        );
      },
    },
    {
      id: 'responses',
      header: () => t('admin.studies.table.responses', 'Responses'),
      size: 130,
      meta: { className: 'text-right hidden lg:table-cell' },
      cell: ({ row }) => {
        const study = row.original;
        return (
          <span className="tabular-nums">{study.total_responses}</span>
        );
      },
    },
    {
      id: 'created',
      header: () => t('admin.studies.table.created', 'Created'),
      size: 140,
      meta: { className: 'hidden lg:table-cell pl-6 text-muted-foreground tabular-nums' },
      cell: ({ row }) => {
        return <span>{formatDate(row.original.created_at)}</span>;
      },
    },
    {
      id: 'actions',
      header: () => null,
      size: 56,
      cell: ({ row }) => {
        const study = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" aria-label={t('common.moreActions')}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => handleEdit(study.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleViewReliability(study.id)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('admin.studies.viewReliability')}
              </DropdownMenuItem>
              {study.status === 'draft' && study.case_count > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleActivate(study.id)} className="text-success">
                    <Play className="h-4 w-4 mr-2" />
                    {t('admin.studies.activate')}
                  </DropdownMenuItem>
                </>
              )}
              {study.status === 'active' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleClose(study)}>
                    <Lock className="h-4 w-4 mr-2" />
                    {t('admin.studies.closeStudy')}
                  </DropdownMenuItem>
                </>
              )}
              {study.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(study)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.delete')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [t, formatDate, handleEdit, handleActivate, handleClose, handleViewReliability, handleDelete]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading', 'Loading studies...')}</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          title={t('admin.studies.title', 'Research Studies')}
          description={t('admin.studies.subtitle', 'Manage multi-case research studies for reliability analysis')}
          actions={
            <Button onClick={() => navigate('/admin/studies/new')}>
              <Plus />
              {t('admin.studies.create', 'New Study')}
            </Button>
          }
        />

        {/* Filters */}
        <FilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t('admin.studies.search', 'Search studies...')}
          filterValue={statusFilter}
          onFilterChange={(v) => setStatusFilter(v as StudyStatus | 'all')}
          filterPlaceholder={t('admin.studies.filterStatus', 'Filter by status')}
          filterOptions={studyStatusOptions}
        />

        {/* Studies Table */}
        {filteredStudies.length === 0 && isFiltered ? (
          <NoMatchState
            query={searchQuery}
            statusLabel={statusFilter === 'all' ? undefined : t(`studies.status.${statusFilter}`)}
            onClear={() => { setSearchQuery(''); setStatusFilter('all'); setPage(1); }}
          />
        ) : filteredStudies.length === 0 ? (
          <div className="rounded-lg border bg-card px-4 py-12 text-center">
            <h2 className="text-base font-semibold text-foreground">
              {t('admin.studies.noStudies', 'No studies yet')}
            </h2>
            <p className="mx-auto mt-1 mb-4 max-w-md text-sm text-muted-foreground">
              {t('admin.studies.noStudiesDesc', 'Create your first research study to group cases for multi-rater reliability analysis.')}
            </p>
            <Button onClick={() => navigate('/admin/studies/new')}>
              <Plus />
              {t('admin.studies.createFirst', 'Create your first study')}
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="md:hidden divide-y rounded-lg border bg-card">
              {filteredStudies.map((study) => (
                <StudyCard
                  key={study.id}
                  study={study}
                  formatDate={formatDate}
                  onEdit={() => handleEdit(study.id)}
                  onDelete={() => handleDelete(study)}
                  onActivate={() => handleActivate(study.id)}
                  onClose={() => handleClose(study)}
                  onViewReliability={() => handleViewReliability(study.id)}
                  t={t}
                />
              ))}
            </div>

            {/* Desktop: Table layout */}
            <SectionErrorBoundary>
              <DataTable
                columns={columns}
                data={filteredStudies}
                totalCount={total}
                page={page}
                pageSize={limit}
                onRowClick={(row) => handleEdit(row.id)}
              />
            </SectionErrorBoundary>
          </>
        )}

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          showingText={t('admin.studies.table.showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}
        />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        {deleteTarget && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.studies.deleteConfirm.titleNamed', { title: deleteTarget.title })}</AlertDialogTitle>
              <AlertDialogDescription>
                {deleteTarget.case_count > 0
                  ? t('admin.studies.deleteConfirm.body', { count: deleteTarget.case_count })
                  : t('admin.studies.deleteConfirm.bodyNoCases')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                className={buttonVariants({ variant: 'destructive' })}
              >
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <AlertDialog open={!!closeTarget} onOpenChange={() => setCloseTarget(null)}>
        {closeTarget && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.studies.closeConfirmTitle', { title: closeTarget.title })}</AlertDialogTitle>
              <AlertDialogDescription>{t('admin.studies.closeConfirmDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => closeMutation.mutate(closeTarget.id)}
                className={buttonVariants({ variant: 'destructive' })}
              >
                {t('admin.studies.closeStudy')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}

interface StudyRowProps {
  study: Study;
  formatDate: (date?: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onClose: () => void;
  onViewReliability: () => void;
  t: TFunction;
}

const StudyCard = memo(function StudyCard({
  study,
  onEdit,
  onDelete,
  onActivate,
  onClose,
  onViewReliability,
  t,
}: StudyRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="cursor-pointer p-4 transition-colors duration-150 hover:bg-muted"
      onClick={onEdit}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onEdit()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="mb-1 line-clamp-2 font-medium text-foreground">{study.title}</p>
          {study.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {study.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm tabular-nums text-muted-foreground">
            <StatusBadge status={study.status} label={t(`studies.status.${study.status}`)} />
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {study.case_count} {study.case_count === 1 ? t('admin.studies.case') : t('admin.studies.cases_plural')}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {study.unique_raters} {study.unique_raters === 1 ? t('admin.studies.rater') : t('admin.studies.raters_plural')}
            </span>
            <span className="inline-flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              {study.total_responses} {t('admin.studies.responses')}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label={t('common.moreActions')}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onViewReliability}>
              <BarChart3 className="h-4 w-4 mr-2" />
              {t('admin.studies.viewReliability')}
            </DropdownMenuItem>
            {study.status === 'draft' && study.case_count > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onActivate} className="text-success">
                  <Play className="h-4 w-4 mr-2" />
                  {t('admin.studies.activate')}
                </DropdownMenuItem>
              </>
            )}
            {study.status === 'active' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClose}>
                  <Lock className="h-4 w-4 mr-2" />
                  {t('admin.studies.closeStudy')}
                </DropdownMenuItem>
              </>
            )}
            {study.status === 'draft' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});
