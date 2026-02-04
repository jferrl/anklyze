import { useTranslation } from 'react-i18next';
import { Share2, RotateCcw, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ClassificationResult } from '@/components/ClassificationResult';
import { generateShareUrl, copyToClipboard } from '@/utils/shareUrl';
import type { ClassificationResult as Result, FractureInput } from '@/types';

/**
 * Props for the ResultsPanel component
 */
export interface ResultsPanelProps {
  /** Classification result to display */
  result: Result;

  /** Input data that generated this result (for sharing) */
  input?: FractureInput;

  /** Callback when user clicks Reset */
  onReset?: () => void;

  /** Callback when user clicks Compare */
  onCompare?: () => void;

  /** Callback when user clicks Share (optional, uses default share logic if not provided) */
  onShare?: () => void | Promise<void>;

  /** Whether the Reset button should be shown */
  showReset?: boolean;

  /** Whether the Compare button should be shown */
  showCompare?: boolean;

  /** Whether the Share button should be shown */
  showShare?: boolean;

  /** Custom CSS class */
  className?: string;

  /** Loading state */
  loading?: boolean;
}

/**
 * ResultsPanel component
 *
 * Wraps the ClassificationResult component with action buttons for
 * resetting the form, starting comparisons, and sharing results.
 *
 * @example
 * ```tsx
 * <ResultsPanel
 *   result={classificationResult}
 *   input={fractureInput}
 *   onReset={handleReset}
 *   onCompare={handleStartComparison}
 *   showReset={true}
 *   showCompare={true}
 *   showShare={true}
 * />
 * ```
 */
export function ResultsPanel({
  result,
  input,
  onReset,
  onCompare,
  onShare,
  showReset = true,
  showCompare = true,
  showShare = true,
  className = '',
  loading = false,
}: ResultsPanelProps) {
  const { t } = useTranslation();

  /**
   * Handle share button click
   * Uses default share logic if onShare callback is not provided
   */
  const handleShare = async () => {
    if (onShare) {
      await onShare();
      return;
    }

    // Default share logic
    if (!input) {
      toast.error(t('share.failed'));
      return;
    }

    try {
      const url = generateShareUrl(input);
      const success = await copyToClipboard(url);

      if (success) {
        toast.success(t('share.copied'));
      } else {
        toast.error(t('share.failed'));
      }
    } catch (error) {
      toast.error(t('share.failed'));
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Classification Result */}
      <ClassificationResult result={result} />

      {/* Action Buttons */}
      {(showReset || showCompare || showShare) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('form.actions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Reset Button */}
              {showReset && onReset && (
                <Button
                  variant="outline"
                  onClick={onReset}
                  disabled={loading}
                  className="w-full gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('form.reset')}
                </Button>
              )}

              {/* Compare Button */}
              {showCompare && onCompare && (
                <Button
                  variant="outline"
                  onClick={onCompare}
                  disabled={loading}
                  className="w-full gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  {t('comparison.compare')}
                </Button>
              )}

              {/* Share Button */}
              {showShare && (
                <Button
                  variant="outline"
                  onClick={handleShare}
                  disabled={loading || !input}
                  className="w-full gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {t('share.button')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * ResultsPanelSkeleton component
 *
 * Loading skeleton for ResultsPanel while classification is in progress
 *
 * @example
 * ```tsx
 * {classifying ? (
 *   <ResultsPanelSkeleton />
 * ) : (
 *   <ResultsPanel result={result} input={input} />
 * )}
 * ```
 */
export function ResultsPanelSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Result skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
          <div className="h-20 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>

      {/* Actions skeleton */}
      <Card>
        <CardHeader>
          <div className="h-5 w-24 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
            <div className="h-10 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
