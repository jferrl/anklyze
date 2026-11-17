import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Save, Send, AlertCircle, Loader2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '../components/StatusBadge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { caseApi } from '@/services';
import type { ImageCategory } from '@/types';
import { CaseDetailsStep } from '../components/CaseDetailsStep';
import { useCaseEditorForm } from './useCaseEditorForm';
import { useCaseEditorMutations } from './useCaseEditorMutations';
import { CaseImagesStep } from './CaseImagesStep';
import { StepFooter, StepIndicator } from '../components/EditorSteps';
import { CaseGoldStandardCard } from './CaseGoldStandardCard';

interface PendingUpload {
  id: string;
  file: File;
  category: ImageCategory;
  preview: string;
}

type Step = 'details' | 'images';
const STEPS: Step[] = ['details', 'images'];

export function CaseEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  const [pageState, setPageState] = useState({
    step: 'details' as Step,
    error: null as string | null,
    titleError: null as string | null,
    showPublishDialog: false,
  });
  const { step: currentStep, error, titleError, showPublishDialog } = pageState;
  const setCurrentStep = (step: Step) => setPageState(p => ({ ...p, step }));
  const setError = (error: string | null) => setPageState(p => ({ ...p, error }));
  const setTitleError = (titleError: string | null) => setPageState(p => ({ ...p, titleError }));
  const setShowPublishDialog = (v: boolean) => setPageState(p => ({ ...p, showPublishDialog: v }));

  const { data: existingCase, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getCase(id!),
    enabled: isEditing,
  });

  const { form, updateForm } = useCaseEditorForm(existingCase);
  const { title, description, deadline } = form;

  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [prevCaseIdForUploads, setPrevCaseIdForUploads] = useState<string | undefined>();
  if (existingCase && existingCase.id !== prevCaseIdForUploads) {
    setPrevCaseIdForUploads(existingCase.id);
    setPendingUploads([]);
  }

  const { createMutation, updateMutation, uploadImageMutation, deleteImageMutation, publishMutation, isSaving } =
    useCaseEditorMutations({
      caseId: id,
      onError: setError,
      onPublishDialogClose: () => setShowPublishDialog(false),
      getPendingUploads: () => pendingUploads,
      clearPendingUploads: () => setPendingUploads([]),
    });

  const currentStepIndex = STEPS.indexOf(currentStep);
  const goToNextStep = () => {
    const next = STEPS[currentStepIndex + 1];
    if (next) setCurrentStep(next);
  };
  const goToPrevStep = () => { if (currentStepIndex > 0) setCurrentStep(STEPS[currentStepIndex - 1]); };

  const createOnDrop = useCallback(
    (category: ImageCategory) => (files: File[]) => {
      setPendingUploads(prev => [...prev, ...files.map(file => ({
        id: Math.random().toString(36).substring(7), file, category, preview: URL.createObjectURL(file),
      }))]);
    }, []
  );

  const removePendingUpload = (uploadId: string) => {
    setPendingUploads(prev => {
      const u = prev.find(u => u.id === uploadId);
      if (u) URL.revokeObjectURL(u.preview);
      return prev.filter(u => u.id !== uploadId);
    });
  };

  const handleSave = async () => {
    setError(null);
    if (!title.trim()) {
      setPageState(p => ({ ...p, step: 'details', titleError: t('admin.cases.errors.titleRequired') }));
      // The field may only mount with this render, so focus it on the next frame.
      requestAnimationFrame(() => document.getElementById('title')?.focus());
      return;
    }
    const data = {
      title: title.trim(), description: description.trim() || undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    };
    if (isEditing) {
      await updateMutation.mutateAsync({ caseId: id!, data });
      const uploads = [...pendingUploads];
      uploads.forEach(u => URL.revokeObjectURL(u.preview));
      setPendingUploads([]);
      for (const u of uploads) await uploadImageMutation.mutateAsync({ caseId: id!, file: u.file, category: u.category });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handlePublish = () => {
    const total = (existingCase?.images?.length ?? 0) + pendingUploads.length;
    if (total === 0) { setError(t('admin.cases.errors.imagesRequired')); setCurrentStep('images'); return; }
    setShowPublishDialog(true);
  };

  const confirmPublish = async () => {
    if (isEditing) { await handleSave(); publishMutation.mutate(id!); }
  };

  const existingImages = existingCase?.images ?? [];
  const canPublish = isEditing && existingCase?.status === 'draft';
  const canEdit = !isEditing || existingCase?.status === 'draft';
  const canEditAlways = !isEditing || existingCase?.status !== 'closed';

  if (isEditing && isLoadingCase) {
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
              {isEditing ? t('admin.cases.editCase') : t('admin.cases.createCase')}
              {existingCase && (
                <StatusBadge status={existingCase.status} label={t(`cases.status.${existingCase.status}`)} />
              )}
            </span>
          }
          actions={
            <>
              <Button variant="outline" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
                {t('common.save')}
              </Button>
              {canPublish && (
                <Button onClick={handlePublish} disabled={isSaving}>
                  <Send />{t('admin.cases.publish')}
                </Button>
              )}
            </>
          }
        />

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <StepIndicator
          steps={[
            { key: 'details', label: t('admin.cases.details') },
            { key: 'images', label: t('admin.cases.images') },
          ]}
          current={currentStep}
          onStepClick={setCurrentStep}
        />

        <div className="space-y-6">
          {currentStep === 'details' && (
            <CaseDetailsStep title={title} description={description} deadline={deadline}
              canEdit={canEdit} canEditAlways={canEditAlways}
              titleError={titleError}
              onUpdateField={(field, value) => {
                if (field === 'title' && titleError) setTitleError(null);
                updateForm(field as keyof typeof form, value);
              }} />
          )}
          {currentStep === 'images' && (
            <CaseImagesStep existingImages={existingImages} pendingUploads={pendingUploads}
              canEdit={canEdit} caseId={id}
              onRemovePending={removePendingUpload}
              onDeleteExisting={(imageId) => deleteImageMutation.mutate({ caseId: id!, imageId })}
              onDrop={createOnDrop} />
          )}

          {isEditing && existingCase && existingCase.status !== 'closed' && (
            <CaseGoldStandardCard caseData={existingCase} />
          )}
        </div>

        <StepFooter current={currentStepIndex} total={STEPS.length} onPrev={goToPrevStep} onNext={goToNextStep} />

      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.cases.publishConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('admin.cases.publishConfirm.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPublish} className="gap-2">
              {publishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t('admin.cases.publish')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
