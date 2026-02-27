import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { caseApi, InputValidationError } from '@/services';
import type { ImageCategory } from '@/types';

interface PendingUpload {
  id: string;
  file: File;
  category: ImageCategory;
  preview: string;
}

interface UseCaseEditorMutationsOptions {
  caseId?: string;
  onError: (message: string) => void;
  onPublishDialogClose: () => void;
  getPendingUploads: () => PendingUpload[];
  clearPendingUploads: () => void;
}

export function useCaseEditorMutations({
  caseId,
  onError,
  onPublishDialogClose,
  getPendingUploads,
  clearPendingUploads,
}: UseCaseEditorMutationsOptions) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Create case mutation
  const createMutation = useMutation({
    mutationFn: caseApi.createCase,
    onSuccess: async (caseData) => {
      const uploadsToProcess = [...getPendingUploads()];
      uploadsToProcess.forEach((upload) => URL.revokeObjectURL(upload.preview));
      clearPendingUploads();
      for (const upload of uploadsToProcess) {
        await caseApi.uploadImage(caseData.id, upload.file, upload.category);
      }
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
      navigate(`/admin/cases/${caseData.id}/edit`);
    },
    onError: (err: Error) => {
      onError(err.message);
    },
  });

  // Update case mutation
  const updateMutation = useMutation({
    mutationFn: ({ caseId: mutCaseId, data }: { caseId: string; data: Parameters<typeof caseApi.updateCase>[1] }) =>
      caseApi.updateCase(mutCaseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
    },
    onError: (err: Error) => {
      onError(err.message);
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: ({ caseId: mutCaseId, file, category }: { caseId: string; file: File; category: ImageCategory }) =>
      caseApi.uploadImage(mutCaseId, file, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
  });

  // Delete image mutation
  const deleteImageMutation = useMutation({
    mutationFn: ({ caseId: mutCaseId, imageId }: { caseId: string; imageId: string }) =>
      caseApi.deleteImage(mutCaseId, imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: caseApi.publishCase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', caseId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['admin-cases-all'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['published-cases'], refetchType: 'all' });
      onPublishDialogClose();
      navigate('/admin/cases');
    },
    onError: (error: Error) => {
      if (error instanceof InputValidationError && error.code === 'INVALID_STATE_TRANSITION') {
        toast.error(t('errors.invalidStateTransition'));
      } else {
        toast.error(t('errors.publishFailed'));
      }
      onPublishDialogClose();
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending || uploadImageMutation.isPending;

  return {
    createMutation,
    updateMutation,
    uploadImageMutation,
    deleteImageMutation,
    publishMutation,
    isSaving,
  };
}
