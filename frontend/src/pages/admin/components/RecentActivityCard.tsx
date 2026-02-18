import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { cn } from '@/lib/utils';

interface RecentActivityCase {
  id: string;
  title: string;
  status: string;
  response_count: number;
  updated_at: string;
}

interface RecentActivityCardProps {
  cases: RecentActivityCase[];
}

export function RecentActivityCard({ cases }: RecentActivityCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="chart-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {t('admin.dashboard.recentActivity')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('admin.dashboard.recentActivityDesc')}
            </p>
          </div>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t('admin.dashboard.noRecentActivity')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((caseItem, index) => (
            <button
              key={caseItem.id}
              onClick={() => navigate(`/admin/cases/${caseItem.id}/analytics`)}
              className={cn(
                'w-full flex items-center justify-between p-3 rounded-xl',
                'bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border/50',
                'transition-all duration-200 text-left group',
                'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]'
              )}
              style={{ animationDelay: `${index * 50 + 200}ms` }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {caseItem.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      caseItem.status === 'published' && 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400',
                      caseItem.status === 'closed' && 'border-muted-foreground/50'
                    )}
                  >
                    {t(`cases.status.${caseItem.status}`)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {caseItem.response_count} {t('admin.dashboard.responses')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-muted-foreground">
                  {new Date(caseItem.updated_at).toLocaleDateString()}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
