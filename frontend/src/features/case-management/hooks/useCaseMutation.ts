import { useMutation, useQueryClient } from '@tanstack/react-query';
import { caseApi } from '@/services';
import type { Case } from '@/types';

/**
 * Case creation/update data
 */
export interface CaseMutationData {
  title: string;
  description?: string;
  deadline?: string;
  status?: string;
  // Add other case fields as needed
}

/**
 * Return type for useCaseMutation hook
 */
export interface UseCaseMutationResult {
  /** Create a new case */
  createCase: (data: CaseMutationData) => Promise<Case>;

  /** Update an existing case */
  updateCase: (id: string, data: Partial<CaseMutationData>) => Promise<Case>;

  /** Delete a case */
  deleteCase: (id: string) => Promise<void>;

  /** Publish a case */
  publishCase: (id: string) => Promise<void>;

  /** Loading states */
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isPublishing: boolean;
}

/**
 * Hook for case mutations (create, update, delete)
 *
 * Wraps react-query mutations for case operations with proper
 * cache invalidation and loading states.
 *
 * @example
 * ```tsx
 * const { createCase, isCreating } = useCaseMutation();
 *
 * const handleSubmit = async () => {
 *   const newCase = await createCase({
 *     title: 'New Case',
 *     description: 'Description',
 *   });
 *   navigate(`/admin/cases/${newCase.id}`);
 * };
 * ```
 */
export function useCaseMutation(): UseCaseMutationResult {
  const queryClient = useQueryClient();

  // Create case mutation
  const createMutation = useMutation({
    mutationFn: async (data: CaseMutationData) => {
      const response = await caseApi.createCase(data);
      return response;
    },
    onSuccess: () => {
      // Invalidate cases list
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  // Update case mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CaseMutationData>;
    }) => {
      const response = await caseApi.updateCase(id, data);
      return response;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific case and cases list
      queryClient.invalidateQueries({ queryKey: ['case', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  // Delete case mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await caseApi.deleteCase(id);
    },
    onSuccess: () => {
      // Invalidate cases list
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  // Publish case mutation
  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      await caseApi.publishCase(id);
    },
    onSuccess: (_, id) => {
      // Invalidate specific case and cases list
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  return {
    createCase: createMutation.mutateAsync,
    updateCase: (id, data) => updateMutation.mutateAsync({ id, data }),
    deleteCase: deleteMutation.mutateAsync,
    publishCase: publishMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPublishing: publishMutation.isPending,
  };
}
