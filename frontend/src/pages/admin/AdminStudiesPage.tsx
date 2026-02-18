import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  BarChart3,
  Play,
  Lock,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
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
import { studyApi } from '@/services';
import type { Study, StudyStatus } from '@/types';
import { cn } from '@/lib/utils';

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
        <div className="chart-card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.studies.search', 'Search studies...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50 focus:bg-background"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StudyStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-muted/30 border-border/50">
                <SelectValue placeholder={t('admin.studies.filterStatus', 'Filter by status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.studies.allStatuses', 'All statuses')}</SelectItem>
                <SelectItem value="draft">{t('studies.status.draft')}</SelectItem>
                <SelectItem value="active">{t('studies.status.active')}</SelectItem>
                <SelectItem value="closed">{t('studies.status.closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

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
                  onEdit={() => navigate(`/admin/studies/${study.id}/edit`)}
                  onDelete={() => setDeleteId(study.id)}
                  onActivate={() => activateMutation.mutate(study.id)}
                  onClose={() => closeMutation.mutate(study.id)}
                  onViewReliability={() => navigate(`/admin/studies/${study.id}/reliability`)}
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
                      {t('admin.studies.table.title', 'Study')}
                    </TableHead>
                    <TableHead className="w-[100px] text-muted-foreground font-medium">
                      {t('admin.studies.table.status', 'Status')}
                    </TableHead>
                    <TableHead className="w-[80px] text-center text-muted-foreground font-medium">
                      {t('admin.studies.table.cases', 'Cases')}
                    </TableHead>
                    <TableHead className="w-[80px] text-center text-muted-foreground font-medium">
                      {t('admin.studies.table.raters', 'Raters')}
                    </TableHead>
                    <TableHead className="w-[100px] text-center text-muted-foreground font-medium hidden lg:table-cell">
                      {t('admin.studies.table.responses', 'Responses')}
                    </TableHead>
                    <TableHead className="w-[100px] text-muted-foreground font-medium hidden lg:table-cell">
                      {t('admin.studies.table.created', 'Created')}
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudies.map((study, index) => (
                    <StudyRow
                      key={study.id}
                      study={study}
                      index={index}
                      formatDate={formatDate}
                      onEdit={() => navigate(`/admin/studies/${study.id}/edit`)}
                      onDelete={() => setDeleteId(study.id)}
                      onActivate={() => activateMutation.mutate(study.id)}
                      onClose={() => closeMutation.mutate(study.id)}
                      onViewReliability={() => navigate(`/admin/studies/${study.id}/reliability`)}
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
              {t('admin.studies.table.showing', {
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
                onClick={() => setPage(prev => prev - 1)}
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
                onClick={() => setPage(prev => prev + 1)}
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

function StudyCard({
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
}

function StudyRow({
  study,
  index,
  formatDate,
  onEdit,
  onDelete,
  onActivate,
  onClose,
  onViewReliability,
  t,
}: StudyRowProps) {
  return (
    <TableRow
      className={cn(
        'cursor-pointer border-border/30 hover:bg-muted/30 transition-colors duration-200',
        'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]'
      )}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={onEdit}
    >
      <TableCell className="max-w-0">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="font-medium text-foreground truncate">{study.title}</span>
          {study.description && (
            <span className="text-sm text-muted-foreground truncate">
              {study.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell className="text-center">
        <span className={cn(
          'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
          study.case_count > 0
            ? 'bg-primary/10 text-primary'
            : 'bg-muted/50 text-muted-foreground'
        )}>
          {study.case_count}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <span className={cn(
          'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
          study.unique_raters > 0
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'bg-muted/50 text-muted-foreground'
        )}>
          {study.unique_raters}
        </span>
      </TableCell>
      <TableCell className="text-center hidden lg:table-cell">
        <span className={cn(
          'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
          study.total_responses > 0
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            : 'bg-muted/50 text-muted-foreground'
        )}>
          {study.total_responses}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
        {formatDate(study.created_at)}
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
      </TableCell>
    </TableRow>
  );
}
