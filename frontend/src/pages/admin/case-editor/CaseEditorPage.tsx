import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Save, Send, AlertCircle, Loader2, Sparkles,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../../../components/ui/alert-dialog';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { caseApi } from '@/services';
import { cn } from '@/lib/utils';
import type { ImageCategory } from '@/types';
import { CaseDetailsStep } from '../components/CaseDetailsStep';
import { useCaseEditorForm } from './useCaseEditorForm';
import { useCaseEditorMutations } from './useCaseEditorMutations';
import { CaseImagesStep } from './CaseImagesStep';
import { CaseEditorStepper } from './CaseEditorStepper';

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
    showPublishDialog: false,
  });
  const { step: currentStep, error, showPublishDialog } = pageState;
  const setCurrentStep = (step: Step) => setPageState(p => ({ ...p, step }));
  const setError = (error: string | null) => setPageState(p => ({ ...p, error }));
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
    if (!title.trim()) { setError(t('admin.cases.errors.titleRequired')); setCurrentStep('details'); return; }
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
  const totalImages = existingImages.length + pendingUploads.length;
  const canPublish = isEditing && existingCase?.status === 'draft';
  const canEdit = !isEditing || existingCase?.status === 'draft';
  const canEditAlways = !isEditing || existingCase?.status !== 'closed';

  if (isEditing && isLoadingCase) {
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
        <header className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {isEditing ? t('admin.cases.editCase') : t('admin.cases.createCase')}
                </h1>
                {existingCase && (
                  <Badge variant="outline" className={cn('mt-1',
                    existingCase.status === 'published' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                    existingCase.status === 'closed' && 'border-muted-foreground/50'
                  )}>
                    {t(`cases.status.${existingCase.status}`)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('common.save')}
              </Button>
              {canPublish && (
                <Button onClick={handlePublish} disabled={isSaving}
                  className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow">
                  <Send className="h-4 w-4" />{t('admin.cases.publish')}
                </Button>
              )}
            </div>
          </div>
        </header>

        {error && (
          <Alert variant="destructive" className="mb-6 animate-fade-in">
            <AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <CaseEditorStepper
          steps={STEPS} isEditing={isEditing} currentStep={currentStep}
          title={title} totalImages={totalImages} onStepClick={setCurrentStep}
        />

        <div className="space-y-6">
          {currentStep === 'details' && (
            <CaseDetailsStep title={title} description={description} deadline={deadline}
              canEdit={canEdit} canEditAlways={canEditAlways}
              onUpdateField={(field, value) => updateForm(field as keyof typeof form, value)}
              onNext={goToNextStep} />
          )}
          {currentStep === 'images' && (
            <CaseImagesStep existingImages={existingImages} pendingUploads={pendingUploads}
              canEdit={canEdit} caseId={id}
              onRemovePending={removePendingUpload}
              onDeleteExisting={(imageId) => deleteImageMutation.mutate({ caseId: id!, imageId })}
              onDrop={createOnDrop} onPrev={goToPrevStep} />
          )}

        </div>
      </div>

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
