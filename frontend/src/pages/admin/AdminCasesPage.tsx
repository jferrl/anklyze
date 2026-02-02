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
  TrendingUp,
  Send,
  Lock,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
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
import { caseApi } from '../../services/studyApi';
import type { Case, CaseStatus } from '../../types/study';
import { cn } from '@/lib/utils';

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
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Refetch when component mounts
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
  });

  const closeMutation = useMutation({
    mutationFn: caseApi.closeCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['published-cases'], refetchType: 'all' });
    },
  });

  const cases = data?.cases ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const filteredCases = cases.filter((caseItem) =>
    caseItem.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isDeadlinePassed = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
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
            {t('common.loading', 'Loading cases...')}
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
                {t('admin.cases.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('admin.cases.subtitle')}
              </p>
            </div>
            <Button
              onClick={() => navigate('/admin/cases/new')}
              size="lg"
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            >
              <Sparkles className="w-4 h-4" />
              {t('admin.cases.create')}
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="chart-card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('admin.cases.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50 focus:bg-background"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as CaseStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px] bg-muted/30 border-border/50">
                <SelectValue placeholder={t('admin.cases.filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.cases.allStatuses')}</SelectItem>
                <SelectItem value="draft">{t('cases.status.draft')}</SelectItem>
                <SelectItem value="published">{t('cases.status.published')}</SelectItem>
                <SelectItem value="closed">{t('cases.status.closed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cases Table */}
        {filteredCases.length === 0 ? (
          <div className="chart-card text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('admin.cases.noCases')}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('admin.cases.noCasesDesc')}
            </p>
            <Button onClick={() => navigate('/admin/cases/new')} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('admin.cases.createFirst')}
            </Button>
          </div>
        ) : (
          <>
            {/* Mobile: Card layout */}
            <div className="md:hidden space-y-3">
              {filteredCases.map((caseItem, index) => (
                <CaseCard
                  key={caseItem.id}
                  caseItem={caseItem}
                  index={index}
                  formatDate={formatDate}
                  isDeadlinePassed={isDeadlinePassed}
                  onView={() => navigate(`/cases/${caseItem.id}`)}
                  onEdit={() => navigate(`/admin/cases/${caseItem.id}/edit`)}
                  onDelete={() => setDeleteId(caseItem.id)}
                  onPublish={() => publishMutation.mutate(caseItem.id)}
                  onClose={() => closeMutation.mutate(caseItem.id)}
                  onViewAnalytics={() => navigate(`/admin/cases/${caseItem.id}/analytics`)}
                  onViewDivergence={() => navigate(`/admin/cases/${caseItem.id}/divergence`)}
                  t={t}
                />
              ))}
            </div>

            {/* Desktop: Table layout */}
            <div className="hidden md:block chart-card p-0">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-[45%] text-muted-foreground font-medium">
                      {t('admin.cases.table.title')}
                    </TableHead>
                    <TableHead className="w-[100px] text-muted-foreground font-medium">
                      {t('admin.cases.table.status')}
                    </TableHead>
                    <TableHead className="w-[80px] text-center text-muted-foreground font-medium">
                      {t('admin.cases.table.responses')}
                    </TableHead>
                    <TableHead className="w-[100px] text-muted-foreground font-medium hidden lg:table-cell">
                      {t('admin.cases.table.created')}
                    </TableHead>
                    <TableHead className="w-[100px] text-muted-foreground font-medium hidden lg:table-cell">
                      {t('admin.cases.table.deadline')}
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((caseItem, index) => (
                    <CaseRow
                      key={caseItem.id}
                      caseItem={caseItem}
                      index={index}
                      formatDate={formatDate}
                      isDeadlinePassed={isDeadlinePassed}
                      onView={() => navigate(`/cases/${caseItem.id}`)}
                      onEdit={() => navigate(`/admin/cases/${caseItem.id}/edit`)}
                      onDelete={() => setDeleteId(caseItem.id)}
                      onPublish={() => publishMutation.mutate(caseItem.id)}
                      onClose={() => closeMutation.mutate(caseItem.id)}
                      onViewAnalytics={() => navigate(`/admin/cases/${caseItem.id}/analytics`)}
                      onViewDivergence={() => navigate(`/admin/cases/${caseItem.id}/divergence`)}
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
              {t('admin.cases.table.showing', {
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
  index: number;
  formatDate: (date?: string) => string;
  isDeadlinePassed: (deadline?: string) => boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onClose: () => void;
  onViewAnalytics: () => void;
  onViewDivergence: () => void;
  t: (key: string) => string;
}

function CaseCard({
  caseItem,
  index,
  formatDate,
  isDeadlinePassed,
  onView,
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onViewAnalytics,
  onViewDivergence,
  t,
}: CaseRowProps) {
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
            <span className="font-medium text-foreground truncate">{caseItem.title}</span>
            <Badge
              variant="outline"
              className={cn(
                'font-medium text-xs flex-shrink-0',
                caseItem.status === 'published' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
                caseItem.status === 'closed' && 'border-muted-foreground/50 bg-muted/30',
                caseItem.status === 'draft' && 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5'
              )}
            >
              {t(`cases.status.${caseItem.status}`)}
            </Badge>
          </div>
          {caseItem.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {caseItem.description}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className={cn(
              'inline-flex items-center gap-1',
              caseItem.response_count > 0 ? 'text-primary' : ''
            )}>
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
            <Badge variant="outline" className="mt-2 text-xs border-primary/30 text-primary">
              TAC
            </Badge>
          )}
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
            {caseItem.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewAnalytics}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('admin.cases.analytics')}
              </DropdownMenuItem>
            )}
            {caseItem.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewDivergence}>
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('admin.cases.divergence')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {caseItem.status === 'draft' && (
              <DropdownMenuItem onClick={onPublish} className="text-emerald-600 dark:text-emerald-400">
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
}

function CaseRow({
  caseItem,
  index,
  formatDate,
  isDeadlinePassed,
  onView,
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onViewAnalytics,
  onViewDivergence,
  t,
}: CaseRowProps) {
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
          <span className="font-medium text-foreground truncate">{caseItem.title}</span>
          {caseItem.description && (
            <span className="text-sm text-muted-foreground truncate">
              {caseItem.description}
            </span>
          )}
          {caseItem.has_tac_images && (
            <Badge variant="outline" className="w-fit text-xs border-primary/30 text-primary">
              TAC
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            'font-medium whitespace-nowrap',
            caseItem.status === 'published' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
            caseItem.status === 'closed' && 'border-muted-foreground/50 bg-muted/30',
            caseItem.status === 'draft' && 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5'
          )}
        >
          {t(`cases.status.${caseItem.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className={cn(
          'inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-medium',
          caseItem.response_count > 0
            ? 'bg-primary/10 text-primary'
            : 'bg-muted/50 text-muted-foreground'
        )}>
          {caseItem.response_count}
        </span>
      </TableCell>
      <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
        {formatDate(caseItem.created_at)}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {caseItem.deadline ? (
          <span
            className={cn(
              'text-sm',
              isDeadlinePassed(caseItem.deadline)
                ? 'text-destructive font-medium'
                : 'text-muted-foreground'
            )}
          >
            {formatDate(caseItem.deadline)}
          </span>
        ) : (
          <span className="text-muted-foreground/50 text-sm">-</span>
        )}
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
            {caseItem.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewAnalytics}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('admin.cases.analytics')}
              </DropdownMenuItem>
            )}
            {caseItem.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewDivergence}>
                <TrendingUp className="h-4 w-4 mr-2" />
                {t('admin.cases.divergence')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {caseItem.status === 'draft' && (
              <DropdownMenuItem onClick={onPublish} className="text-emerald-600 dark:text-emerald-400">
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
      </TableCell>
    </TableRow>
  );
}
