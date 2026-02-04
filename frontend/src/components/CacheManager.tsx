import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Database, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { db } from '@/lib/db';
import { useClassificationCache } from '@/hooks/useClassificationCache';

interface CacheStats {
  formDraftsCount: number;
  classificationCacheCount: number;
  lastCleanup: number | null;
}

/**
 * Cache Management Component
 *
 * Displays cache statistics and provides controls to clear cache data.
 * Useful for debugging and managing IndexedDB storage.
 */
export function CacheManager() {
  const { t } = useTranslation();
  const { clearCache } = useClassificationCache();
  const [stats, setStats] = useState<CacheStats>({
    formDraftsCount: 0,
    classificationCacheCount: 0,
    lastCleanup: null,
  });
  const [loading, setLoading] = useState(false);

  /**
   * Load cache statistics
   */
  const loadStats = async () => {
    try {
      const [formDraftsCount, classificationCacheCount] = await Promise.all([
        db.formDrafts.count(),
        db.classificationCache.count(),
      ]);

      setStats({
        formDraftsCount,
        classificationCacheCount,
        lastCleanup: Date.now(),
      });
    } catch (error) {
      console.warn('Failed to load cache stats:', error);
    }
  };

  /**
   * Clear classification cache
   */
  const handleClearClassificationCache = async () => {
    setLoading(true);
    try {
      await clearCache();
      toast.success(t('cache.classificationCleared', 'Classification cache cleared successfully'));
      await loadStats();
    } catch (error) {
      toast.error(t('cache.clearError', 'Failed to clear cache'));
      console.error('Failed to clear classification cache:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear form drafts
   */
  const handleClearFormDrafts = async () => {
    setLoading(true);
    try {
      await db.formDrafts.clear();
      toast.success(t('cache.draftsCleared', 'Form drafts cleared successfully'));
      await loadStats();
    } catch (error) {
      toast.error(t('cache.clearError', 'Failed to clear drafts'));
      console.error('Failed to clear form drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear all cache data
   */
  const handleClearAll = async () => {
    setLoading(true);
    try {
      await Promise.all([clearCache(), db.formDrafts.clear()]);
      toast.success(t('cache.allCleared', 'All cache data cleared successfully'));
      await loadStats();
    } catch (error) {
      toast.error(t('cache.clearError', 'Failed to clear cache'));
      console.error('Failed to clear all cache:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load stats on mount
   */
  useEffect(() => {
    loadStats();
  }, []);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return t('cache.never', 'Never');
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {t('cache.title', 'Cache Management')}
        </CardTitle>
        <CardDescription>
          {t('cache.description', 'View and manage cached data stored in your browser')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('cache.formDrafts', 'Form Drafts')}
                </p>
                <p className="text-2xl font-bold">{stats.formDraftsCount}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFormDrafts}
                disabled={loading || stats.formDraftsCount === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('cache.classifications', 'Cached Classifications')}
                </p>
                <p className="text-2xl font-bold">{stats.classificationCacheCount}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearClassificationCache}
                disabled={loading || stats.classificationCacheCount === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Last cleanup time */}
        {stats.lastCleanup && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {t('cache.lastUpdated', 'Last updated')}: {formatTimestamp(stats.lastCleanup)}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadStats} disabled={loading}>
            {t('cache.refresh', 'Refresh Stats')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleClearAll}
            disabled={
              loading || (stats.formDraftsCount === 0 && stats.classificationCacheCount === 0)
            }
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('cache.clearAll', 'Clear All Cache')}
          </Button>
        </div>

        {/* Info notice */}
        <p className="text-xs text-muted-foreground">
          {t(
            'cache.info',
            'Cache data is stored in your browser and helps improve performance. Clearing cache will not affect your account or saved classifications on the server.'
          )}
        </p>
      </CardContent>
    </Card>
  );
}
