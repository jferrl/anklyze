import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Save, Send, AlertCircle, Loader2,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildCaseUpdatePayload } from './casePayload';
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
import { CaseGoldStandardCard } from './CaseGoldStandardCard';
import { useRecordTitle } from '@/components/layout/recordTitle';

interface PendingUpload {
  id: string;
  file: File;
  category: ImageCategory;
  preview: string;
}

// A save can fail from the buttons at the bottom of the page, far below the error banner.
const scrollIntoViewOnMount = (el: HTMLElement | null) => el?.scrollIntoView({ block: 'nearest' });

export function CaseEditorPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id && id !== 'new';

  const [pageState, setPageState] = useState({
    error: null as string | null,
    titleError: null as string | null,
    imagesError: null as string | null,
    showPublishDialog: false,
  });
  const { error, titleError, imagesError, showPublishDialog } = pageState;
  const setError = (error: string | null) => setPageState(p => ({ ...p, error }));
  const setTitleError = (titleError: string | null) => setPageState(p => ({ ...p, titleError }));
  const setShowPublishDialog = (v: boolean) => setPageState(p => ({ ...p, showPublishDialog: v }));

  const { data: existingCase, isLoading: isLoadingCase } = useQuery({
    queryKey: ['case', id],
    queryFn: () => caseApi.getCase(id!),
    enabled: isEditing,
  });
  useRecordTitle(existingCase?.title);
  useDocumentTitle(isEditing ? existingCase?.title : t('breadcrumbs.newCase'));

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

  // Scrolls the section with the failed check into view, then moves focus to its field.
  const revealField = (sectionId: string, fieldId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ block: 'start' });
    document.getElementById(fieldId)?.focus({ preventScroll: true });
  };

  const createOnDrop = useCallback(
    (category: ImageCategory) => (files: File[]) => {
      setPageState(p => ({ ...p, imagesError: null }));
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

  const canEdit = !isEditing || existingCase?.status === 'draft';
  const canEditAlways = !isEditing || existingCase?.status !== 'closed';

  // Returns false when validation stops the save, so publishing does not go ahead.
  const handleSave = async (): Promise<boolean> => {
    setPageState(p => ({ ...p, error: null, imagesError: null }));
    if (!title.trim()) {
      setTitleError(t('admin.cases.errors.titleRequired'));
      revealField('case-details', 'title');
      return false;
    }
    if (isEditing) {
      await updateMutation.mutateAsync({
        caseId: id!, data: buildCaseUpdatePayload({ title, description, deadline, canEdit, canEditAlways }),
      });
      const uploads = [...pendingUploads];
      uploads.forEach(u => URL.revokeObjectURL(u.preview));
      setPendingUploads([]);
      for (const u of uploads) await uploadImageMutation.mutateAsync({ caseId: id!, file: u.file, category: u.category });
    } else {
      await createMutation.mutateAsync({
        title: title.trim(), description: description.trim() || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
    }
    return true;
  };

  const handlePublish = () => {
    const total = (existingCase?.images?.length ?? 0) + pendingUploads.length;
    if (total === 0) {
      setPageState(p => ({ ...p, imagesError: t('admin.cases.errors.imagesRequired') }));
      revealField('case-images', 'case-images-dropzone');
      return;
    }
    setShowPublishDialog(true);
  };

  const confirmPublish = async () => {
    if (isEditing && (await handleSave())) publishMutation.mutate(id!);
  };

  const existingImages = existingCase?.images ?? [];
  const canPublish = isEditing && existingCase?.status === 'draft';

  const actions = (
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
  );

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
          actions={actions}
        />

        {error && (
          <Alert variant="destructive" ref={scrollIntoViewOnMount}>
            <AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <CaseDetailsStep title={title} description={description} deadline={deadline}
          canEdit={canEdit} canEditAlways={canEditAlways}
          titleError={titleError}
          onUpdateField={(field, value) => {
            if (field === 'title' && titleError) setTitleError(null);
            updateForm(field as keyof typeof form, value);
          }} />

        <CaseImagesStep existingImages={existingImages} pendingUploads={pendingUploads}
          canEdit={canEdit} caseId={id} error={imagesError}
          onRemovePending={removePendingUpload}
          onDeleteExisting={(imageId) => deleteImageMutation.mutate({ caseId: id!, imageId })}
          onDrop={createOnDrop} />

        {isEditing && existingCase && existingCase.status !== 'closed' && (
          <CaseGoldStandardCard caseData={existingCase} />
        )}
        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('admin.reliability.goldStandard')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('admin.cases.referenceAfterSave')}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t pt-6">{actions}</div>

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
