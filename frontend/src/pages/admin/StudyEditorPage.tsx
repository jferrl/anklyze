import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Loader2,
  FileText,
  Play,
  XCircle,
  BarChart3,
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { StudyDetailsStep } from './components/StudyDetailsStep';
import { StudyCasesStep } from './components/StudyCasesStep';
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
import { studyApi, caseApi } from '@/services';
import type { StudyStatus } from '@/types';
import { cn } from '@/lib/utils';

type Step = 'details' | 'cases';

const STEPS: Step[] = ['details', 'cases'];

export function StudyEditorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);

  // Page state consolidated
  const [pageState, setPageState] = useState<{
    step: Step;
    error: string | null;
    selectedCaseId: string;
    showActivateDialog: boolean;
  }>({ step: 'details', error: null, selectedCaseId: '', showActivateDialog: false });
  const { step: currentStep, error, selectedCaseId, showActivateDialog } = pageState;
  const setCurrentStep = (step: Step) => setPageState(prev => ({ ...prev, step }));
  const setError = (error: string | null) => setPageState(prev => ({ ...prev, error }));
  const setSelectedCaseId = (selectedCaseId: string) => setPageState(prev => ({ ...prev, selectedCaseId }));
  const setShowActivateDialog = (showActivateDialog: boolean) => setPageState(prev => ({ ...prev, showActivateDialog }));

  // Fetch existing study if editing
  const { data: study, isLoading: isLoadingStudy } = useQuery({
    queryKey: ['admin-study', id],
    queryFn: () => studyApi.getStudy(id!),
    enabled: isEditing,
  });

  // Form state - use study data as defaults, allow local overrides
  const [formState, setFormState] = useState<{ dirty: boolean; title: string; description: string }>({
    dirty: false, title: '', description: '',
  });

  // Computed title/description - use local values if dirty, otherwise use study data
  const title = formState.dirty ? formState.title : (study?.title ?? formState.title);
  const description = formState.dirty ? formState.description : (study?.description ?? formState.description);

  const setTitle = (value: string) => setFormState(prev => ({ ...prev, dirty: true, title: value }));
  const setDescription = (value: string) => setFormState(prev => ({ ...prev, dirty: true, description: value }));

  // Fetch available cases (published, not in a study)
  const { data: availableCasesData } = useQuery({
    queryKey: ['admin-cases-available'],
    queryFn: () => caseApi.listCases('published', 1, 100),
  });

  // Filter out cases that are already in this study
  const availableCases = (availableCasesData?.cases ?? []).filter(
    (c) => !study?.cases?.some((sc) => sc.id === c.id)
  );

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      studyApi.createStudy(data),
    onSuccess: (newStudy) => {
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
      navigate(`/admin/studies/${newStudy.id}/edit`);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; description?: string }) =>
      studyApi.updateStudy(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
      setFormState(prev => ({ ...prev, dirty: false }));
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const addCaseMutation = useMutation({
    mutationFn: (caseId: string) => studyApi.addCaseToStudy(id!, caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-available'] });
      setSelectedCaseId('');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const addAllCasesMutation = useMutation({
    mutationFn: () => studyApi.addAllCasesToStudy(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-available'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const removeCaseMutation = useMutation({
    mutationFn: (caseId: string) => studyApi.removeCaseFromStudy(id!, caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-available'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const activateMutation = useMutation({
    mutationFn: () => studyApi.activateStudy(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
      setShowActivateDialog(false);
      navigate('/admin/studies');
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => studyApi.closeStudy(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-studies'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleSave = async () => {
    setError(null);

    if (!title.trim()) {
      setError(t('admin.studies.titleRequired', 'Title is required'));
      setCurrentStep('details');
      return;
    }

    const data = {
      title: title.trim(),
      description: description.trim() || undefined,
    };

    if (isEditing) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleAddCase = () => {
    if (selectedCaseId && id) {
      addCaseMutation.mutate(selectedCaseId);
    }
  };

  const handleActivate = () => {
    if ((study?.cases?.length ?? 0) === 0) {
      setError(t('admin.studies.errors.casesRequired', 'At least one case is required to activate'));
      setCurrentStep('cases');
      return;
    }
    setShowActivateDialog(true);
  };

  const getStatusBadge = (status: StudyStatus) => {
    switch (status) {
      case 'draft':
        return (
          <Badge variant="outline" className="text-muted-foreground">
            {t('studies.status.draft')}
          </Badge>
        );
      case 'active':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            {t('studies.status.active')}
          </Badge>
        );
      case 'closed':
        return <Badge variant="secondary">{t('studies.status.closed')}</Badge>;
    }
  };


  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canActivate = isEditing && study?.status === 'draft' && (study?.cases?.length ?? 0) > 0;
  const canEdit = !isEditing || study?.status === 'draft';
  const isReadOnly = study?.status === 'closed';

  const currentStepIndex = STEPS.indexOf(currentStep);

  const goToNextStep = async () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      // When moving to cases step, ensure study is created first
      if (STEPS[nextIndex] === 'cases' && !isEditing) {
        if (!title.trim()) {
          setError(t('admin.studies.titleRequired', 'Title is required'));
          return;
        }
        // Create the study first, navigation happens in onSuccess
        await createMutation.mutateAsync({
          title: title.trim(),
          description: description.trim() || undefined,
        });
        return; // Navigation happens in createMutation.onSuccess
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
      label: t('admin.studies.details', 'Details'),
      description: t('admin.studies.detailsDescription', 'Basic study information'),
    },
    cases: {
      icon: FolderOpen,
      label: t('admin.studies.cases', 'Cases'),
      description: t('admin.studies.casesDescription', 'Add cases to the study'),
    },
  };

  const totalCases = study?.cases?.length ?? 0;

  if (isEditing && isLoadingStudy) {
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
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {isEditing ? t('admin.studies.editTitle', 'Edit Study') : t('admin.studies.createTitle', 'Create Study')}
                  </h1>
                  {study && getStatusBadge(study.status)}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={isSaving || isReadOnly} className="gap-2">
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
                  {t('admin.studies.activate', 'Activate')}
                </Button>
              )}
              {study?.status === 'active' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/admin/studies/${id}/reliability`)}
                    className="gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    {t('admin.studies.viewReliability', 'Reliability')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => closeMutation.mutate()}
                    disabled={closeMutation.isPending}
                    className="gap-2"
                  >
                    {closeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    {t('admin.studies.close', 'Close')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-6 animate-fade-in">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stepper Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const status = getStepStatus(step);
              const config = stepConfig[step];
              const Icon = config.icon;
              const isLast = index === STEPS.length - 1 || (step === 'cases' && !isEditing);

              return (
                <div key={step} className="flex items-center flex-1">
                  <button
                    onClick={() => setCurrentStep(step)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                      status === 'current' && 'bg-primary/10 ring-2 ring-primary/20',
                      status === 'completed' && 'bg-emerald-500/10 hover:bg-emerald-500/15',
                      status === 'upcoming' && 'opacity-50 hover:opacity-70'
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
                          step === 'cases' ? `${totalCases} ${totalCases === 1 ? t('admin.studies.case') : t('admin.studies.cases_plural')}` :
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
            <StudyDetailsStep
              title={title}
              description={description}
              isReadOnly={isReadOnly}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
            />
          )}

          {/* Cases Step */}
          {currentStep === 'cases' && (
            <StudyCasesStep
              studyCases={study?.cases ?? []}
              availableCases={availableCases}
              selectedCaseId={selectedCaseId}
              canEdit={canEdit}
              isAddingCase={addCaseMutation.isPending}
              isAddingAll={addAllCasesMutation.isPending}
              isRemovingCase={removeCaseMutation.isPending}
              onSelectCase={setSelectedCaseId}
              onAddCase={handleAddCase}
              onAddAllCases={() => addAllCasesMutation.mutate()}
              onRemoveCase={(caseId) => removeCaseMutation.mutate(caseId)}
              studyId={id}
            />
          )}

        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
          <Button
            variant="outline"
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.previous', 'Previous')}
          </Button>

          <div className="text-sm text-muted-foreground">
            {t('admin.studies.step', 'Step')} {currentStepIndex + 1} {t('common.of', 'of')} {isEditing ? STEPS.length : STEPS.length - 1}
          </div>

          {currentStep !== 'cases' ? (
            <Button
              onClick={goToNextStep}
              className="gap-2"
            >
              {t('common.next', 'Next')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <div />
          )}
        </div>

        {/* Activate Confirmation Dialog */}
        <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.studies.activateConfirmTitle', 'Activate Study')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.studies.activateConfirmDescription', 'Once activated, the study will be available for assigned raters to submit classifications. Cases cannot be added or removed after activation.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => activateMutation.mutate()}
                className="gap-2"
              >
                {activateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {t('admin.studies.activate', 'Activate')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
