import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Play,
  AlertCircle,
  Loader2,
  FileText,
  Users,
  FolderKanban,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Calendar,
  Type,
  AlignLeft,
  Mail,
  CheckCircle2,
  Clock,
  Search,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Progress } from '../../components/ui/progress';
import { studyApi } from '../../services/studyApi';
import { cn } from '@/lib/utils';
import type { Study, CohortUser, RaterProgress } from '../../types/study';

type Step = 'details' | 'cases' | 'raters';

const STEPS: Step[] = ['details', 'cases', 'raters'];

export function CohortEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  const [currentStep, setCurrentStep] = useState<Step>('details');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showAddCaseDialog, setShowAddCaseDialog] = useState(false);
  const [showAddRaterDialog, setShowAddRaterDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [raterEmail, setRaterEmail] = useState('');
  const [caseSearchQuery, setCaseSearchQuery] = useState('');

  // Fetch existing cohort if editing
  const { data: existingCohort, isLoading: isLoadingCohort } = useQuery({
    queryKey: ['cohort', id],
    queryFn: () => studyApi.getCohort(id!),
    enabled: isEditing,
  });

  // Fetch available studies for adding cases
  const { data: availableStudies } = useQuery({
    queryKey: ['admin-studies-all'],
    queryFn: () => studyApi.listStudies(undefined, 1, 100),
  });

  // Fetch cohort users
  const { data: cohortUsersData } = useQuery({
    queryKey: ['cohort-users', id],
    queryFn: () => studyApi.listCohortUsers(id!),
    enabled: isEditing,
  });

  // Fetch rater progress
  const { data: raterProgressData } = useQuery({
    queryKey: ['cohort-progress', id],
    queryFn: () => studyApi.getCohortRaterProgress(id!),
    enabled: isEditing && existingCohort?.status !== 'draft',
  });

  // Track previous cohort ID to reset form when switching
  const [prevCohortId, setPrevCohortId] = useState<string | undefined>(undefined);
  if (existingCohort && existingCohort.id !== prevCohortId) {
    setPrevCohortId(existingCohort.id);
    setTitle(existingCohort.title);
    setDescription(existingCohort.description || '');
  }

  // Create cohort mutation
  const createMutation = useMutation({
    mutationFn: studyApi.createCohort,
    onSuccess: (cohort) => {
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'], refetchType: 'all' });
      navigate(`/admin/cohorts/${cohort.id}/edit`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Update cohort mutation
  const updateMutation = useMutation({
    mutationFn: ({ cohortId, data }: { cohortId: string; data: Parameters<typeof studyApi.updateCohort>[1] }) =>
      studyApi.updateCohort(cohortId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort', id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'], refetchType: 'all' });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Add case mutation
  const addCaseMutation = useMutation({
    mutationFn: ({ cohortId, studyId }: { cohortId: string; studyId: string }) =>
      studyApi.addCaseToCohort(cohortId, studyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies-all'] });
      setShowAddCaseDialog(false);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Remove case mutation
  const removeCaseMutation = useMutation({
    mutationFn: ({ cohortId, studyId }: { cohortId: string; studyId: string }) =>
      studyApi.removeCaseFromCohort(cohortId, studyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies-all'] });
    },
  });

  // Add rater mutation
  const addRaterMutation = useMutation({
    mutationFn: ({ cohortId, email }: { cohortId: string; email: string }) =>
      studyApi.addUserToCohort(cohortId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort-users', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] });
      setShowAddRaterDialog(false);
      setRaterEmail('');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Remove rater mutation
  const removeRaterMutation = useMutation({
    mutationFn: ({ cohortId, userId }: { cohortId: string; userId: string }) =>
      studyApi.removeUserFromCohort(cohortId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort-users', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'] });
    },
  });

  // Activate mutation
  const activateMutation = useMutation({
    mutationFn: studyApi.activateCohort,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cohort', id], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cohorts'], refetchType: 'all' });
      setShowActivateDialog(false);
      navigate('/admin/cohorts');
    },
  });

  const handleSave = async () => {
    setError(null);

    if (!title.trim()) {
      setError(t('admin.cohorts.errors.titleRequired'));
      setCurrentStep('details');
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ cohortId: id!, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleActivate = () => {
    if (!existingCohort?.cases?.length) {
      setError(t('admin.cohorts.errors.needsCase'));
      setCurrentStep('cases');
      return;
    }
    if (!cohortUsersData?.users?.length) {
      setError(t('admin.cohorts.errors.needsRater'));
      setCurrentStep('raters');
      return;
    }
    setShowActivateDialog(true);
  };

  const confirmActivate = async () => {
    if (isEditing) {
      await handleSave();
      activateMutation.mutate(id!);
    }
  };

  const handleAddRater = () => {
    if (!raterEmail.trim()) return;
    addRaterMutation.mutate({ cohortId: id!, email: raterEmail.trim() });
  };

  const cases = existingCohort?.cases ?? [];
  const cohortUsers = cohortUsersData?.users ?? [];
  const raterProgress = raterProgressData?.raters ?? [];

  // Filter available studies - exclude those already in this cohort or in another cohort
  const availableStudiesForAdding = (availableStudies?.studies ?? []).filter(
    (study) => !study.cohort_id && !cases.find((c) => c.id === study.id)
  );

  const filteredStudies = availableStudiesForAdding.filter((study) =>
    study.title.toLowerCase().includes(caseSearchQuery.toLowerCase())
  );

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canActivate = isEditing && existingCohort?.status === 'draft';
  const canEdit = !isEditing || existingCohort?.status === 'draft';

  const currentStepIndex = STEPS.indexOf(currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      if (!isEditing && STEPS[nextIndex] !== 'details') {
        return;
      }
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const getStepStatus = (step: Step): 'completed' | 'current' | 'upcoming' => {
    const stepIndex = STEPS.indexOf(step);
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  const stepConfig = {
    details: {
      icon: FileText,
      label: t('admin.cohorts.details'),
      description: t('admin.cohorts.detailsDescription'),
    },
    cases: {
      icon: FolderKanban,
      label: t('admin.cohorts.cases'),
      description: t('admin.cohorts.casesDescription'),
    },
    raters: {
      icon: Users,
      label: t('admin.cohorts.raters'),
      description: t('admin.cohorts.ratersDescription'),
    },
  };

  if (isEditing && isLoadingCohort) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-primary/20 blur-xl mx-auto" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {isEditing ? t('admin.cohorts.editCohort') : t('admin.cohorts.createCohort')}
                  </h1>
                  {existingCohort && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'mt-1',
                        existingCohort.status === 'active' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                        existingCohort.status === 'closed' && 'border-muted-foreground/50',
                        existingCohort.status === 'draft' && 'border-amber-500/50 text-amber-600 dark:text-amber-400'
                      )}
                    >
                      {t(`admin.cohorts.status.${existingCohort.status}`)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t('common.save')}
              </Button>
              {canActivate && (
                <Button
                  onClick={handleActivate}
                  disabled={isSaving}
                  className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                >
                  <Play className="h-4 w-4" />
                  {t('admin.cohorts.activate')}
                </Button>
              )}
            </div>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stepper Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              if (!isEditing && step !== 'details') return null;

              const status = getStepStatus(step);
              const config = stepConfig[step];
              const Icon = config.icon;
              const isLast = index === STEPS.length - 1 || (!isEditing && step === 'details');

              return (
                <div key={step} className="flex items-center flex-1">
                  <button
                    onClick={() => isEditing && setCurrentStep(step)}
                    disabled={!isEditing && step !== 'details'}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                      status === 'current' && 'bg-primary/10 ring-2 ring-primary/20',
                      status === 'completed' && 'bg-emerald-500/10 hover:bg-emerald-500/15',
                      status === 'upcoming' && 'opacity-50 hover:opacity-70',
                      !isEditing && step !== 'details' && 'cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                        status === 'current' && 'bg-primary text-primary-foreground',
                        status === 'completed' && 'bg-emerald-500 text-white',
                        status === 'upcoming' && 'bg-muted text-muted-foreground'
                      )}
                    >
                      {status === 'completed' ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className={cn(
                        'text-sm font-medium',
                        status === 'current' && 'text-primary',
                        status === 'completed' && 'text-emerald-600 dark:text-emerald-400',
                        status === 'upcoming' && 'text-muted-foreground'
                      )}>
                        {config.label}
                      </p>
                      <p className="text-xs text-muted-foreground hidden lg:block">
                        {status === 'completed' ? (
                          step === 'details' ? (title || '-') :
                          step === 'cases' ? `${cases.length} cases` :
                          step === 'raters' ? `${cohortUsers.length} raters` :
                          '-'
                        ) : '-'}
                      </p>
                    </div>
                  </button>

                  {!isLast && (
                    <div className={cn(
                      'flex-1 h-0.5 mx-2 rounded-full transition-colors',
                      status === 'completed' ? 'bg-emerald-500' : 'bg-border'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="space-y-6">
          {/* Details Step */}
          {currentStep === 'details' && (
            <div className="animate-fade-in">
              <Card className="chart-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{t('admin.cohorts.details')}</CardTitle>
                      <CardDescription>{t('admin.cohorts.detailsDescription')}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="flex items-center gap-2">
                      <Type className="w-4 h-4 text-muted-foreground" />
                      {t('studies.title')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={t('admin.cohorts.titlePlaceholder')}
                      disabled={!canEdit}
                      className="h-12 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-2">
                      <AlignLeft className="w-4 h-4 text-muted-foreground" />
                      {t('studies.description')}
                      <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder={t('admin.cohorts.descriptionPlaceholder')}
                      rows={4}
                      disabled={!canEdit}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end mt-6">
                {isEditing && (
                  <Button onClick={goToNextStep} className="gap-2">
                    {t('common.next')}
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Cases Step */}
          {currentStep === 'cases' && isEditing && (
            <div className="animate-fade-in">
              <Card className="chart-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FolderKanban className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{t('admin.cohorts.cases')}</CardTitle>
                        <CardDescription>{t('admin.cohorts.casesDescription')}</CardDescription>
                      </div>
                    </div>
                    {canEdit && (
                      <Button onClick={() => setShowAddCaseDialog(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('admin.cohorts.addCase')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {cases.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <FolderKanban className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-muted-foreground font-medium">{t('admin.cohorts.noCases')}</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {t('admin.cohorts.noCasesDesc')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cases
                        .sort((a, b) => a.case_order - b.case_order)
                        .map((caseStudy, index) => (
                          <CaseItem
                            key={caseStudy.id}
                            study={caseStudy}
                            index={index}
                            canEdit={canEdit}
                            onRemove={() => removeCaseMutation.mutate({ cohortId: id!, studyId: caseStudy.id })}
                            t={t}
                          />
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  {t('common.previous')}
                </Button>
                <Button onClick={goToNextStep} className="gap-2">
                  {t('common.next')}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Raters Step */}
          {currentStep === 'raters' && isEditing && (
            <div className="animate-fade-in space-y-6">
              <Card className="chart-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{t('admin.cohorts.raters')}</CardTitle>
                        <CardDescription>{t('admin.cohorts.ratersDescription')}</CardDescription>
                      </div>
                    </div>
                    {canEdit && (
                      <Button onClick={() => setShowAddRaterDialog(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        {t('admin.cohorts.addRater')}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {cohortUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-muted-foreground font-medium">{t('admin.cohorts.noRaters')}</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        {t('admin.cohorts.noRatersDesc')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cohortUsers.map((user, index) => {
                        const progress = raterProgress.find((r) => r.user_id === user.user_id);
                        return (
                          <RaterItem
                            key={user.id}
                            user={user}
                            progress={progress}
                            index={index}
                            totalCases={cases.length}
                            canEdit={canEdit}
                            onRemove={() => removeRaterMutation.mutate({ cohortId: id!, userId: user.user_id })}
                            t={t}
                          />
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Progress Summary */}
              {existingCohort?.status !== 'draft' && raterProgress.length > 0 && (
                <Card className="chart-card">
                  <CardHeader>
                    <CardTitle className="text-lg">{t('admin.cohorts.progress')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{t('admin.cohorts.uniqueRaters')}</span>
                        </div>
                        <p className="text-2xl font-bold">{existingCohort?.unique_raters ?? 0}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/10">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-sm text-muted-foreground">{t('admin.cohorts.completeRaters')}</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {existingCohort?.complete_raters ?? 0}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/10">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm text-muted-foreground">{t('admin.cohorts.totalResponses')}</span>
                        </div>
                        <p className="text-2xl font-bold text-primary">{existingCohort?.total_responses ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={goToPrevStep} className="gap-2">
                  <ChevronLeft className="w-4 h-4" />
                  {t('common.previous')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activate Confirmation Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.cohorts.activateConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.cohorts.activateConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmActivate} className="gap-2">
              {activateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {t('admin.cohorts.activate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Case Dialog */}
      <Dialog open={showAddCaseDialog} onOpenChange={setShowAddCaseDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('admin.cohorts.addCase')}</DialogTitle>
            <DialogDescription>
              Select a study to add as a case to this cohort.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search studies..."
                value={caseSearchQuery}
                onChange={(e) => setCaseSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredStudies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No available studies found
                </p>
              ) : (
                filteredStudies.map((study) => (
                  <button
                    key={study.id}
                    onClick={() => addCaseMutation.mutate({ cohortId: id!, studyId: study.id })}
                    disabled={addCaseMutation.isPending}
                    className="w-full p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <p className="font-medium text-foreground">{study.title}</p>
                    {study.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {study.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {t(`studies.status.${study.status}`)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {study.response_count} responses
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCaseDialog(false)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Rater Dialog */}
      <Dialog open={showAddRaterDialog} onOpenChange={setShowAddRaterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('admin.cohorts.addRater')}</DialogTitle>
            <DialogDescription>
              Enter the email address of the user to assign as a rater.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="raterEmail" className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="raterEmail"
                type="email"
                value={raterEmail}
                onChange={(e) => setRaterEmail(e.target.value)}
                placeholder="user@example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddRater();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRaterDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddRater}
              disabled={!raterEmail.trim() || addRaterMutation.isPending}
              className="gap-2"
            >
              {addRaterMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Rater
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CaseItemProps {
  study: Study;
  index: number;
  canEdit: boolean;
  onRemove: () => void;
  t: (key: string) => string;
}

function CaseItem({ study, index, canEdit, onRemove, t }: CaseItemProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20',
        'hover:bg-muted/30 transition-colors',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{study.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {t(`studies.status.${study.status}`)}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {study.response_count} responses
          </span>
          {study.deadline && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(study.deadline)}
            </span>
          )}
        </div>
      </div>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

interface RaterItemProps {
  user: CohortUser;
  progress?: RaterProgress;
  index: number;
  totalCases: number;
  canEdit: boolean;
  onRemove: () => void;
  t: (key: string) => string;
}

function RaterItem({ user, progress, index, totalCases, canEdit, onRemove, t }: RaterItemProps) {
  const casesCompleted = progress?.cases_completed ?? user.cases_completed;
  const isComplete = progress?.is_complete ?? (totalCases > 0 && casesCompleted >= totalCases);
  const progressPercent = totalCases > 0 ? (casesCompleted / totalCases) * 100 : 0;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/20',
        'hover:bg-muted/30 transition-colors',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg',
        isComplete ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
      )}>
        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{user.user_email}</p>
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 max-w-[200px]">
            <Progress value={progressPercent} className="h-1.5" />
          </div>
          <span className="text-xs text-muted-foreground">
            {casesCompleted}/{totalCases} {t('admin.cohorts.casesCompleted')}
          </span>
        </div>
      </div>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
