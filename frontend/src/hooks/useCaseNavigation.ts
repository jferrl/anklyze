import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listPublishedCases } from '@/services';
import type { UserCaseItem } from '@/types';

type FilterStatus = 'all' | 'completed' | 'pending';

interface CaseNavigationResult {
  /** Previous case in the filtered list */
  prevCase: UserCaseItem | null;
  /** Next case in the filtered list */
  nextCase: UserCaseItem | null;
  /** Next pending (unanswered) case, regardless of current filter */
  nextPendingCase: UserCaseItem | null;
  /** 1-based position of the current case in the filtered list */
  currentIndex: number;
  /** Total number of cases matching the current filter */
  totalFiltered: number;
  /** Whether the navigation data is still loading */
  isLoading: boolean;
}

/**
 * Hook that provides prev/next case navigation context for CaseDetailPage.
 * Reads the filter/search state from URL search params (set by CasesPage)
 * so navigation respects the user's current view.
 */
export function useCaseNavigation(currentCaseId: string | undefined): CaseNavigationResult {
  const [searchParams] = useSearchParams();
  const filterStatus = (searchParams.get('status') as FilterStatus) || 'all';
  const searchQuery = (searchParams.get('q') || '').toLowerCase();

  // Fetch all cases (large page to get them all for navigation)
  // Uses same query key pattern as CasesPage for cache sharing
  const { data, isLoading } = useQuery({
    queryKey: ['published-cases', 1],
    queryFn: () => listPublishedCases(1, 200),
    staleTime: 1000 * 60 * 5,
  });

  const allCases = data?.cases ?? [];

  // Apply the same filters as CasesPage
  const filteredCases = useMemo(() => {
    return allCases.filter((c) => {
      const matchesSearch =
        !searchQuery ||
        c.title.toLowerCase().includes(searchQuery) ||
        c.description?.toLowerCase().includes(searchQuery);

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'completed' && c.has_responded) ||
        (filterStatus === 'pending' && !c.has_responded);

      return matchesSearch && matchesStatus;
    });
  }, [allCases, searchQuery, filterStatus]);

  // Find current case position and neighbors
  const currentIdx = filteredCases.findIndex((c) => c.id === currentCaseId);

  const prevCase = currentIdx > 0 ? filteredCases[currentIdx - 1] : null;
  const nextCase = currentIdx >= 0 && currentIdx < filteredCases.length - 1
    ? filteredCases[currentIdx + 1]
    : null;

  // Find next pending case (useful after submission)
  const nextPendingCase = useMemo(() => {
    // First try to find a pending case after the current one in the full list
    const currentFullIdx = allCases.findIndex((c) => c.id === currentCaseId);
    if (currentFullIdx >= 0) {
      const afterCurrent = allCases.slice(currentFullIdx + 1).find((c) => !c.has_responded);
      if (afterCurrent) return afterCurrent;
    }
    // Fall back to any pending case
    return allCases.find((c) => !c.has_responded && c.id !== currentCaseId) ?? null;
  }, [allCases, currentCaseId]);

  return {
    prevCase,
    nextCase,
    nextPendingCase,
    currentIndex: currentIdx + 1, // 1-based
    totalFiltered: filteredCases.length,
    isLoading,
  };
}
