import { useState, useCallback } from 'react';

/**
 * Upload progress state
 */
export interface UploadProgress {
  filename: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

/**
 * Return type for useImageUpload hook
 */
export interface UseImageUploadResult {
  /** Upload progress for each file */
  uploadProgress: Record<string, UploadProgress>;

  /** Whether any files are currently uploading */
  isUploading: boolean;

  /** Upload files with progress tracking */
  uploadFiles: (
    files: File[],
    onComplete: (urls: string[]) => void
  ) => Promise<void>;

  /** Clear upload progress */
  clearProgress: () => void;
}

/**
 * Hook for handling file uploads with progress tracking
 *
 * Manages file upload state, progress tracking, and preview generation
 * for case editor image uploads.
 *
 * @example
 * ```tsx
 * const { uploadFiles, uploadProgress, isUploading } = useImageUpload();
 *
 * const handleUpload = async (files: File[]) => {
 *   await uploadFiles(files, (urls) => {
 *     setImages(prev => [...prev, ...urls]);
 *   });
 * };
 * ```
 */
export function useImageUpload(): UseImageUploadResult {
  const [uploadProgress, setUploadProgress] = useState<
    Record<string, UploadProgress>
  >({});

  /**
   * Check if any files are uploading
   */
  const isUploading = Object.values(uploadProgress).some(
    (p) => p.status === 'uploading'
  );

  /**
   * Upload files with progress tracking
   */
  const uploadFiles = useCallback(
    async (files: File[], onComplete: (urls: string[]) => void) => {
      // Initialize progress for all files
      const initialProgress: Record<string, UploadProgress> = {};
      files.forEach((file) => {
        initialProgress[file.name] = {
          filename: file.name,
          progress: 0,
          status: 'uploading',
        };
      });
      setUploadProgress(initialProgress);

      try {
        // TODO: Implement actual upload logic with caseApi
        // For now, simulate upload
        const urls: string[] = [];

        for (const file of files) {
          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 20) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            setUploadProgress((prev) => ({
              ...prev,
              [file.name]: {
                filename: file.name,
                progress,
                status: 'uploading',
              },
            }));
          }

          // Mark as completed
          setUploadProgress((prev) => ({
            ...prev,
            [file.name]: {
              filename: file.name,
              progress: 100,
              status: 'completed',
            },
          }));

          // TODO: Replace with actual uploaded URL
          urls.push(`/uploads/${file.name}`);
        }

        onComplete(urls);

        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress({});
        }, 2000);
      } catch (error) {
        // Mark all as error
        setUploadProgress((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((key) => {
            updated[key] = {
              ...updated[key],
              status: 'error',
            };
          });
          return updated;
        });
        throw error;
      }
    },
    []
  );

  /**
   * Clear upload progress
   */
  const clearProgress = useCallback(() => {
    setUploadProgress({});
  }, []);

  return {
    uploadProgress,
    isUploading,
    uploadFiles,
    clearProgress,
  };
}
