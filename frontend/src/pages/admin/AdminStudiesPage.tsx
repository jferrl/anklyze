import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Home,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  BarChart3,
  Send,
  Lock,
  Users,
  Clock,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
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
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { ThemeSwitcher } from '../../components/ThemeSwitcher';
import { UserMenu } from '../../components/auth/UserMenu';
import { studyApi } from '../../services/studyApi';
import type { Study, StudyStatus } from '../../types/study';

const statusColors: Record<StudyStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  published: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const statusIcons: Record<StudyStatus, React.ReactNode> = {
  draft: <FileText className="h-3 w-3" />,
  published: <Send className="h-3 w-3" />,
  closed: <Lock className="h-3 w-3" />,
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
      setDeleteId(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: studyApi.publishStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: studyApi.closeStudy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline font-semibold text-xl tracking-tight">Anklyze</span>
            <Badge variant="secondary" className="ml-2">
              Admin
            </Badge>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/">
                <Home className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('classify.backToHome')}</span>
              </Link>
            </Button>
            <ThemeSwitcher />
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
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

        {/* Studies List */}
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
          <div className="space-y-4">
            {filteredStudies.map((study) => (
              <StudyCard
                key={study.id}
                study={study}
                onView={() => navigate(`/studies/${study.id}`)}
                onEdit={() => navigate(`/admin/studies/${study.id}/edit`)}
                onDelete={() => setDeleteId(study.id)}
                onPublish={() => publishMutation.mutate(study.id)}
                onClose={() => closeMutation.mutate(study.id)}
                onViewAnalytics={() => navigate(`/admin/studies/${study.id}/analytics`)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {t('common.previous')}
            </Button>
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              {t('common.next')}
            </Button>
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

interface StudyCardProps {
  study: Study;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onClose: () => void;
  onViewAnalytics: () => void;
  formatDate: (date?: string) => string;
}

function StudyCard({
  study,
  onView,
  onEdit,
  onDelete,
  onPublish,
  onClose,
  onViewAnalytics,
  formatDate,
}: StudyCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={statusColors[study.status]}>
                {statusIcons[study.status]}
                <span className="ml-1">{t(`studies.status.${study.status}`)}</span>
              </Badge>
              {study.has_tac_images && (
                <Badge variant="outline" className="text-xs">
                  TAC
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg truncate">{study.title}</CardTitle>
            {study.description && (
              <CardDescription className="line-clamp-2 mt-1">{study.description}</CardDescription>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>
              {study.response_count} {t('admin.studies.responses')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDate(study.created_at)}</span>
          </div>
          {study.deadline && (
            <Badge variant="outline" className="text-xs">
              {t('studies.deadline')}: {formatDate(study.deadline)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
