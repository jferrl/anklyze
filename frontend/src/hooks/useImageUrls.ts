import { useQuery } from '@tanstack/react-query';
import { getBatchImageSignedURLs } from '@/services';

/**
 * Fetches all signed image URLs for a case in a single batch request.
 * Caches results with React Query — URLs are reused across tab switches
 * and navigation without re-fetching until stale (10 minutes, well under
 * the 15-minute signed URL expiry).
 */
export function useImageUrls(caseId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['image-urls', caseId],
    queryFn: () => getBatchImageSignedURLs(caseId!),
    enabled: !!caseId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 15 * 60 * 1000, // keep in cache for 15 minutes
  });

  // Flatten to a simple Record<imageId, url> for consumers
  const imageUrls: Record<string, string> = {};
  if (data?.urls) {
    for (const [imageId, entry] of Object.entries(data.urls)) {
      imageUrls[imageId] = entry.url;
    }
  }

  return { imageUrls, isLoading, error };
}
