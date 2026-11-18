import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Loader2,
  Play,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { Button, buttonVariants } from '../../components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './components/StatusBadge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { StudyDetailsStep } from './components/StudyDetailsStep';
import { StudyCasesStep } from './components/StudyCasesStep';
import { StepFooter, StepIndicator } from './components/EditorSteps';
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
import { useRecordTitle } from '@/components/layout/recordTitle';

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
    titleError: string | null;
    selectedCaseId: string;
    showActivateDialog: boolean;
    showCloseDialog: boolean;
  }>({ step: 'details', error: null, titleError: null, selectedCaseId: '', showActivateDialog: false, showCloseDialog: false });
  const { step: currentStep, error, titleError, selectedCaseId, showActivateDialog, showCloseDialog } = pageState;
  const setCurrentStep = (step: Step) => setPageState(prev => ({ ...prev, step }));
  const setError = (error: string | null) => setPageState(prev => ({ ...prev, error }));
  const setSelectedCaseId = (selectedCaseId: string) => setPageState(prev => ({ ...prev, selectedCaseId }));
  const setShowActivateDialog = (showActivateDialog: boolean) => setPageState(prev => ({ ...prev, showActivateDialog }));
  const setShowCloseDialog = (showCloseDialog: boolean) => setPageState(prev => ({ ...prev, showCloseDialog }));

  // Fetch existing study if editing
  const { data: study, isLoading: isLoadingStudy } = useQuery({
    queryKey: ['admin-study', id],
    queryFn: () => studyApi.getStudy(id!),
    enabled: isEditing,
  });
  useRecordTitle(study?.title);
  useDocumentTitle(isEditing ? study?.title : t('breadcrumbs.newStudy'));

  // Form state - use study data as defaults, allow local overrides
  const [formState, setFormState] = useState<{ dirty: boolean; title: string; description: string }>({
    dirty: false, title: '', description: '',
  });

  // Computed title/description - use local values if dirty, otherwise use study data
  const title = formState.dirty ? formState.title : (study?.title ?? formState.title);
  const description = formState.dirty ? formState.description : (study?.description ?? formState.description);

  const setTitle = (value: string) => {
    if (titleError) setPageState(prev => ({ ...prev, titleError: null }));
    setFormState(prev => ({ ...prev, dirty: true, title: value }));
  };
  const showTitleRequired = () => {
    setPageState(prev => ({ ...prev, step: 'details', titleError: t('admin.studies.titleRequired') }));
    // The field may only mount with this render, so focus it on the next frame.
    requestAnimationFrame(() => document.getElementById('title')?.focus());
  };
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
      showTitleRequired();
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
          showTitleRequired();
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

  const stepLabels: Record<Step, string> = {
    details: t('admin.studies.details', 'Details'),
    cases: t('admin.studies.cases', 'Cases'),
  };

  if (isEditing && isLoadingStudy) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6" aria-busy="true">
        <span className="sr-only">{t('common.loading')}</span>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-3">
              {isEditing ? t('admin.studies.editTitle', 'Edit Study') : t('admin.studies.createTitle', 'Create Study')}
              {study && <StatusBadge status={study.status} label={t(`studies.status.${study.status}`)} />}
            </span>
          }
          actions={
            <>
              <Button variant="outline" onClick={handleSave} disabled={isSaving || isReadOnly}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                {t('common.save')}
              </Button>
              {canActivate && (
                <Button onClick={handleActivate} disabled={isSaving}>
                  <Play />
                  {t('admin.studies.activate', 'Activate')}
                </Button>
              )}
              {study?.status === 'active' && (
                <>
                  <Button variant="outline" onClick={() => navigate(`/admin/studies/${id}/reliability`)}>
                    <BarChart3 />
                    {t('admin.studies.viewReliability', 'Reliability')}
                  </Button>
                  <Button
                    variant="destructiveOutline"
                    onClick={() => setShowCloseDialog(true)}
                    disabled={closeMutation.isPending}
                  >
                    {closeMutation.isPending ? <Loader2 className="animate-spin" /> : <XCircle />}
                    {t('admin.studies.closeStudy')}
                  </Button>
                </>
              )}
            </>
          }
        />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* A new study has to be created before its cases step exists, so steps are not clickable yet. */}
        <StepIndicator
          steps={STEPS.map((key) => ({ key, label: stepLabels[key] }))}
          current={currentStep}
          onStepClick={isEditing ? setCurrentStep : undefined}
        />

        {/* Step Content */}
        <div className="space-y-6">
          {/* Details Step */}
          {currentStep === 'details' && (
            <StudyDetailsStep
              title={title}
              description={description}
              isReadOnly={isReadOnly}
              titleError={titleError}
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

        <StepFooter current={currentStepIndex} total={STEPS.length} onPrev={goToPrevStep} onNext={goToNextStep} />

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

        <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('admin.studies.closeConfirmTitle', { title: study?.title })}</AlertDialogTitle>
              <AlertDialogDescription>{t('admin.studies.closeConfirmDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => closeMutation.mutate()}
                className={buttonVariants({ variant: 'destructive' })}
              >
                <XCircle />
                {t('admin.studies.closeStudy')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
