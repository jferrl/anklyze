import { useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, LayoutList } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  if (isLoading || totalFiltered === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={goToList}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <LayoutList className="h-4 w-4" />
        <span className="hidden sm:inline">{t('cases.backToList')}</span>
      </Button>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={goToPrev}
          disabled={!prevCase}
          className="gap-1 h-8 px-2 sm:px-3"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t('cases.nav.prev')}</span>
        </Button>

        <Badge variant="secondary" className="font-mono text-xs px-2.5 py-0.5 tabular-nums">
          {currentIndex > 0 ? currentIndex : '–'} / {totalFiltered}
        </Badge>

        <Button
          variant="outline"
          size="sm"
          onClick={goToNext}
          disabled={!nextCase}
          className="gap-1 h-8 px-2 sm:px-3"
        >
          <span className="hidden sm:inline">{t('cases.nav.next')}</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Keyboard hint - only on desktop */}
      <span className="hidden lg:inline text-xs text-muted-foreground/60">
        ← → {t('cases.nav.keyboardHint')}
      </span>
    </div>
  );
}
