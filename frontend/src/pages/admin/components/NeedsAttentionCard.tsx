import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NeedsAttentionCase {
  id: string;
  title: string;
  deadline?: string;
}

interface NeedsAttentionCardProps {
  cases: NeedsAttentionCase[];
}

export function NeedsAttentionCard({ cases }: NeedsAttentionCardProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="chart-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {t('admin.dashboard.needsAttention')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('admin.dashboard.needsAttentionDesc')}
            </p>
          </div>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t('admin.dashboard.allGood')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            All cases are performing well
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.slice(0, 5).map((caseItem, index) => {
            const isPastDeadline =
              caseItem.deadline && new Date(caseItem.deadline) < new Date();
            return (
              <button
                key={caseItem.id}
                onClick={() => navigate(`/admin/cases/${caseItem.id}/edit`)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl',
                  'bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/30',
                  'transition-all duration-200 text-left group',
                  'opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]'
                )}
                style={{ animationDelay: `${index * 50 + 200}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {caseItem.title}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {isPastDeadline
                      ? t('admin.dashboard.pastDeadline')
                      : t('admin.dashboard.noResponses')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-500/50 group-hover:text-amber-500 group-hover:translate-x-1 transition-all ml-2" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
