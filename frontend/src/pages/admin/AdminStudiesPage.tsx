import { useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  BarChart3,
  Play,
  Lock,
  FolderOpen,
  Loader2,
  Sparkles,
  Users,
  FileText,
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
import { studyApi } from '@/services';
import type { Study, StudyStatus } from '@/types';
import { cn } from '@/lib/utils';
import { DataTable } from './components/DataTable';
import { FilterBar } from './components/FilterBar';
import { Pagination } from './components/Pagination';
import { SectionErrorBoundary } from '@/components/ui/error-boundary';

export function AdminStudiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StudyStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
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
      setDeleteId(null);
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

  const filteredStudies = studies.filter((study) =>
    study.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  // Memoized action handlers
  const handleEdit = useCallback((id: string) => navigate(`/admin/studies/${id}/edit`), [navigate]);
  const handleDelete = useCallback((id: string) => setDeleteId(id), []);
  const handleActivate = useCallback((id: string) => activateMutation.mutate(id), [activateMutation]);
  const handleClose = useCallback((id: string) => closeMutation.mutate(id), [closeMutation]);
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
      header: () => (
        <span className="text-muted-foreground font-medium">{t('admin.studies.table.title', 'Study')}</span>
      ),
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
      header: () => (
        <span className="text-muted-foreground font-medium">{t('admin.studies.table.status', 'Status')}</span>
      ),
      size: 100,
      cell: ({ row }) => {
        const study = row.original;
        return (
          <Badge
            variant="outline"
            className={cn(
              'font-medium whitespace-nowrap',
              study.status === 'active' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
              study.status === 'closed' && 'border-muted-foreground/50 bg-muted/30',
              study.status === 'draft' && 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5'
            )}
          >
            {t(`studies.status.${study.status}`)}
          </Badge>
        );
      },
    },
    {
      id: 'cases',
      header: () => (
        <span className="text-muted-foreground font-medium text-center block">{t('admin.studies.table.cases', 'Cases')}</span>
      ),
      size: 80,
      meta: { className: 'text-center' },
      cell: ({ row }) => {
        const study = row.original;
        return (
          <span className={cn(
            'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
            study.case_count > 0
              ? 'bg-primary/10 text-primary'
              : 'bg-muted/50 text-muted-foreground'
          )}>
            {study.case_count}
          </span>
        );
      },
    },
    {
      id: 'raters',
      header: () => (
        <span className="text-muted-foreground font-medium text-center block">{t('admin.studies.table.raters', 'Raters')}</span>
      ),
      size: 80,
      meta: { className: 'text-center' },
      cell: ({ row }) => {
        const study = row.original;
        return (
          <span className={cn(
            'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
            study.unique_raters > 0
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : 'bg-muted/50 text-muted-foreground'
          )}>
            {study.unique_raters}
          </span>
        );
      },
    },
    {
      id: 'responses',
      header: () => (
        <span className="text-muted-foreground font-medium text-center block">{t('admin.studies.table.responses', 'Responses')}</span>
      ),
      size: 100,
      meta: { className: 'text-center hidden lg:table-cell' },
      cell: ({ row }) => {
        const study = row.original;
        return (
          <span className={cn(
            'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
            study.total_responses > 0
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-muted/50 text-muted-foreground'
          )}>
            {study.total_responses}
          </span>
        );
      },
    },
    {
      id: 'created',
      header: () => (
        <span className="text-muted-foreground font-medium">{t('admin.studies.table.created', 'Created')}</span>
      ),
      size: 100,
      meta: { className: 'hidden lg:table-cell text-muted-foreground text-sm' },
      cell: ({ row }) => {
        return <span>{formatDate(row.original.created_at)}</span>;
      },
    },
    {
      id: 'actions',
      header: () => null,
      size: 50,
      cell: ({ row }) => {
        const study = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="hover:bg-muted/50">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => handleEdit(study.id)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
              {study.status !== 'draft' && (
                <DropdownMenuItem onClick={() => handleViewReliability(study.id)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Reliability
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {study.status === 'draft' && study.case_count > 0 && (
                <DropdownMenuItem onClick={() => handleActivate(study.id)} className="text-emerald-600 dark:text-emerald-400">
                  <Play className="h-4 w-4 mr-2" />
                  Activate
                </DropdownMenuItem>
              )}
              {study.status === 'active' && (
                <DropdownMenuItem onClick={() => handleClose(study.id)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Close
                </DropdownMenuItem>
              )}
              {study.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(study.id)} className="text-destructive">
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
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 blur-xl mx-auto" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">
            {t('common.loading', 'Loading studies...')}
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
                {t('admin.studies.title', 'Research Studies')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('admin.studies.subtitle', 'Manage multi-case research studies for reliability analysis')}
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/studies/new')}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Sparkles className="w-4 h-4" />
              {t('admin.studies.create', 'New Study')}
            </Button>
          </div>
        </header>

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
        {filteredStudies.length === 0 ? (
          <div className="chart-card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('admin.studies.noStudies', 'No studies yet')}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('admin.studies.noStudiesDesc', 'Create your first research study to group cases for multi-rater reliability analysis.')}
            </p>
            <Button onClick={() => navigate('/admin/studies/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('admin.studies.createFirst', 'Create your first study')}
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="md:hidden space-y-3">
              {filteredStudies.map((study, index) => (
                <StudyCard
                  key={study.id}
                  study={study}
                  index={index}
                  formatDate={formatDate}
                  onEdit={() => handleEdit(study.id)}
                  onDelete={() => handleDelete(study.id)}
                  onActivate={() => handleActivate(study.id)}
                  onClose={() => handleClose(study.id)}
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
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.studies.deleteConfirm.title', 'Delete Study')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.studies.deleteConfirm.description', 'Are you sure you want to delete this study? This action cannot be undone.')}
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

interface StudyRowProps {
  study: Study;
  index: number;
  formatDate: (date?: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onActivate: () => void;
  onClose: () => void;
  onViewReliability: () => void;
  t: (key: string) => string;
}

const StudyCard = memo(function StudyCard({
  study,
  index,
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
      className={cn(
        'chart-card p-4 cursor-pointer hover:bg-muted/30 transition-colors',
        'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]'
      )}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={onEdit}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onEdit()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground truncate">{study.title}</span>
            <Badge
              variant="outline"
              className={cn(
                'font-medium text-xs flex-shrink-0',
                study.status === 'active' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
                study.status === 'closed' && 'border-muted-foreground/50 bg-muted/30',
                study.status === 'draft' && 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5'
              )}
            >
              {t(`studies.status.${study.status}`)}
            </Badge>
          </div>
          {study.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {study.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              {study.case_count} {study.case_count === 1 ? 'case' : 'cases'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {study.unique_raters} {study.unique_raters === 1 ? 'rater' : 'raters'}
            </span>
            <span className={cn(
              'inline-flex items-center gap-1',
              study.total_responses > 0 ? 'text-primary' : ''
            )}>
              <BarChart3 className="w-3.5 h-3.5" />
              {study.total_responses} responses
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="hover:bg-muted/50 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              {t('common.edit')}
            </DropdownMenuItem>
            {study.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewReliability}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Reliability
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {study.status === 'draft' && study.case_count > 0 && (
              <DropdownMenuItem onClick={onActivate} className="text-emerald-600 dark:text-emerald-400">
                <Play className="h-4 w-4 mr-2" />
                Activate
              </DropdownMenuItem>
            )}
            {study.status === 'active' && (
              <DropdownMenuItem onClick={onClose}>
                <Lock className="h-4 w-4 mr-2" />
                Close
              </DropdownMenuItem>
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
