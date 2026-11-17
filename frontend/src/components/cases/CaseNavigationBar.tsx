import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import { Button } from '../ui/button';
import type { UserCaseItem } from '@/types';

interface CaseNavigationBarProps {
  prevCase: UserCaseItem | null;
  nextCase: UserCaseItem | null;
  currentIndex: number;
  totalFiltered: number;
  isLoading: boolean;
}

export function CaseNavigationBar({
  prevCase,
  nextCase,
  currentIndex,
  totalFiltered,
  isLoading,
}: CaseNavigationBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Preserve filter params when navigating between cases
  const buildCaseUrl = useCallback(
    (caseId: string) => {
      const params = new URLSearchParams();
      const status = searchParams.get('status');
      const q = searchParams.get('q');
      if (status && status !== 'all') params.set('status', status);
      if (q) params.set('q', q);
      const qs = params.toString();
      return `/cases/${caseId}${qs ? `?${qs}` : ''}`;
    },
    [searchParams]
  );

  const goToPrev = useCallback(() => {
    if (prevCase) navigate(buildCaseUrl(prevCase.id));
  }, [prevCase, navigate, buildCaseUrl]);

  const goToNext = useCallback(() => {
    if (nextCase) navigate(buildCaseUrl(nextCase.id));
  }, [nextCase, navigate, buildCaseUrl]);

  const goToList = useCallback(() => {
    const params = new URLSearchParams();
    const status = searchParams.get('status');
    const q = searchParams.get('q');
    if (status && status !== 'all') params.set('status', status);
    if (q) params.set('q', q);
    const qs = params.toString();
    navigate(`/cases${qs ? `?${qs}` : ''}`);
  }, [navigate, searchParams]);

  if (isLoading || totalFiltered === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3">
      <Button variant="ghost" size="sm" onClick={goToList} className="-ml-2 gap-1.5">
        <LayoutList className="h-4 w-4" />
        <span className="sr-only sm:not-sr-only">{t('cases.backToList')}</span>
      </Button>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={goToPrev} disabled={!prevCase} className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">{t('cases.nav.prev')}</span>
        </Button>

        <span className="text-sm text-muted-foreground tabular-nums">
          {currentIndex > 0 ? currentIndex : '–'} / {totalFiltered}
        </span>

        <Button variant="ghost" size="sm" onClick={goToNext} disabled={!nextCase} className="-mr-2 gap-1">
          <span className="sr-only sm:not-sr-only">{t('cases.nav.next')}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
