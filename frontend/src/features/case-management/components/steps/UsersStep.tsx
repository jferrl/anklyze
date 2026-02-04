import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';

/**
 * Props for the UsersStep component
 */
export interface UsersStepProps {
  /** Case ID for managing users */
  caseId: string;

  /** Whether the form is disabled */
  disabled?: boolean;

  /** Custom CSS class */
  className?: string;
}

/**
 * UsersStep component
 *
 * Step 4 of the case editor: User assignment interface
 *
 * Note: This is a simplified placeholder. Full implementation should use
 * the existing CaseUsersManager component.
 *
 * @example
 * ```tsx
 * <UsersStep
 *   caseId={caseId}
 *   disabled={status === 'closed'}
 * />
 * ```
 */
export function UsersStep({
  caseId,
  disabled: _disabled = false,
  className = '',
}: UsersStepProps) {
  const { t } = useTranslation();

  return (
    <div className={`animate-fade-in ${className}`}>
      <Card className="chart-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t('admin.cases.users')}</CardTitle>
              <CardDescription>
                {t('admin.cases.usersDescription')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* TODO: Integrate CaseUsersManager component */}
          <div className="text-center p-8 border-2 border-dashed rounded-xl">
            <p className="text-muted-foreground">
              User assignment interface (Case ID: {caseId})
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Integrate CaseUsersManager component here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
