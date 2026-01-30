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
  Send,
  Lock,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
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
import type { Study, StudyStatus } from '../../types/study';

const statusVariants: Record<StudyStatus, 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  published: 'default',
  closed: 'outline',
};

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
  });

  const deleteMutation = useMutation({
    mutationFn: studyApi.deleteStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies-all'] });
      queryClient.invalidateQueries({ queryKey: ['published-studies'] });
      setDeleteId(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: studyApi.publishStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies-all'] });
      queryClient.invalidateQueries({ queryKey: ['published-studies'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: studyApi.closeStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies-all'] });
      queryClient.invalidateQueries({ queryKey: ['published-studies'] });
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

  const isDeadlinePassed = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  return (
    <div className="h-full">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('admin.studies.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('admin.studies.subtitle')}</p>
          </div>
          <Button onClick={() => navigate('/admin/studies/new')}>
            <Plus className="h-4 w-4 mr-2" />
            {t('admin.studies.create')}
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.studies.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StudyStatus | 'all')}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t('admin.studies.filterStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin.studies.allStatuses')}</SelectItem>
                  <SelectItem value="draft">{t('studies.status.draft')}</SelectItem>
                  <SelectItem value="published">{t('studies.status.published')}</SelectItem>
                  <SelectItem value="closed">{t('studies.status.closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Studies Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredStudies.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('admin.studies.noStudies')}</h3>
              <p className="text-muted-foreground mb-4">{t('admin.studies.noStudiesDesc')}</p>
              <Button onClick={() => navigate('/admin/studies/new')}>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.studies.createFirst')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">{t('admin.studies.table.title')}</TableHead>
                  <TableHead>{t('admin.studies.table.status')}</TableHead>
                  <TableHead className="text-center">{t('admin.studies.table.responses')}</TableHead>
                  <TableHead>{t('admin.studies.table.created')}</TableHead>
                  <TableHead>{t('admin.studies.table.deadline')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudies.map((study) => (
                  <StudyRow
                    key={study.id}
                    study={study}
                    formatDate={formatDate}
                    isDeadlinePassed={isDeadlinePassed}
                    statusVariant={statusVariants[study.status]}
                    onView={() => navigate(`/studies/${study.id}`)}
                    onEdit={() => navigate(`/admin/studies/${study.id}/edit`)}
                    onDelete={() => setDeleteId(study.id)}
                    onPublish={() => publishMutation.mutate(study.id)}
                    onClose={() => closeMutation.mutate(study.id)}
                    onViewAnalytics={() => navigate(`/admin/studies/${study.id}/analytics`)}
                    t={t}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
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
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
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
            <AlertDialogTitle>{t('admin.studies.deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.studies.deleteConfirm.description')}
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
  formatDate: (date?: string) => string;
  isDeadlinePassed: (deadline?: string) => boolean;
  statusVariant: 'default' | 'secondary' | 'outline';
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onClose: () => void;
  onViewAnalytics: () => void;
  t: (key: string) => string;
}

function StudyRow({
  study,
  formatDate,
  isDeadlinePassed,
  statusVariant,
  onView,
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onViewAnalytics,
  t,
}: StudyRowProps) {
  return (
    <TableRow className="cursor-pointer" onClick={onView}>
      <TableCell>
        <div className="flex flex-col gap-1">
          <span className="font-medium">{study.title}</span>
          {study.description && (
            <span className="text-sm text-muted-foreground line-clamp-1">
              {study.description}
            </span>
          )}
          {study.has_tac_images && (
            <Badge variant="outline" className="w-fit text-xs">TAC</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant}>
          {t(`studies.status.${study.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        <span className="font-medium">{study.response_count}</span>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(study.created_at)}
      </TableCell>
      <TableCell>
        {study.deadline ? (
          <span className={isDeadlinePassed(study.deadline) ? 'text-destructive' : 'text-muted-foreground'}>
            {formatDate(study.deadline)}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              {t('common.view')}
            </DropdownMenuItem>
            {study.status === 'draft' && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('common.edit')}
              </DropdownMenuItem>
            )}
            {study.status !== 'draft' && (
              <DropdownMenuItem onClick={onViewAnalytics}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('admin.studies.analytics')}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {study.status === 'draft' && (
              <DropdownMenuItem onClick={onPublish}>
                <Send className="h-4 w-4 mr-2" />
                {t('admin.studies.publish')}
              </DropdownMenuItem>
            )}
            {study.status === 'published' && (
              <DropdownMenuItem onClick={onClose}>
                <Lock className="h-4 w-4 mr-2" />
                {t('admin.studies.close')}
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
