import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';

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
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="text-base font-semibold text-foreground">
          {t('admin.dashboard.needsAttention')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('admin.dashboard.needsAttentionDesc')}
        </p>
      </div>

      {cases.length === 0 ? (
        <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
          <Check className="h-4 w-4 shrink-0 text-success" />
          {t('admin.dashboard.allGood')}
        </p>
      ) : (
        <div className="divide-y">
          {cases.slice(0, 5).map((caseItem) => {
            const isPastDeadline =
              caseItem.deadline && new Date(caseItem.deadline) < new Date();
            return (
              <button
                key={caseItem.id}
                onClick={() => navigate(`/admin/cases/${caseItem.id}/edit`)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {caseItem.title}
                  </p>
                  <p className="mt-1 text-xs text-warning">
                    {isPastDeadline
                      ? t('admin.dashboard.pastDeadline')
                      : t('admin.dashboard.noResponses')}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
