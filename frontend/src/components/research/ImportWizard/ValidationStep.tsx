import { useTranslation } from 'react-i18next'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { ValidationIssue } from '@/services/research/types'

interface ValidationStepProps {
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
  onNext: () => void
  onBack: () => void
}

export function ValidationStep({ errors, warnings, onNext, onBack }: ValidationStepProps) {
  const { t } = useTranslation()
  const hasBlockingErrors = errors.length > 0

  return (
    <div className="space-y-6">
      {/* Summary */}
      {hasBlockingErrors ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t(
              'research.import.blockingErrors',
              '{{count}} blocking error(s) found. These must be fixed in the CSV file before importing.',
              { count: errors.length },
            )}
          </AlertDescription>
        </Alert>
      ) : warnings.length > 0 ? (
        <Alert className="border-yellow-500/50 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-300">
            {t(
              'research.import.warningsOnly',
              '{{count}} warning(s) found. You can proceed, but review the items below.',
              { count: warnings.length },
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-emerald-500/50 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertDescription className="text-emerald-700 dark:text-emerald-300">
            {t('research.import.noIssues', 'Validation passed with no issues.')}
          </AlertDescription>
        </Alert>
      )}

      {/* Errors List */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t('research.import.errors', 'Errors')} ({errors.length})
          </h4>
          <div className="space-y-1">
            {errors.map((err, i) => (
              <div
                key={`err-${i}`}
                className="flex items-start gap-2 p-2 rounded-lg bg-destructive/5 text-sm"
              >
                <Badge variant="destructive" className="text-xs shrink-0">
                  {err.row > 0
                    ? `${t('research.import.row', 'Row')} ${err.row}`
                    : t('research.import.global', 'Global')}
                </Badge>
                {err.column && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {err.column}
                  </Badge>
                )}
                <span className="text-destructive">{err.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings List */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t('research.import.warnings', 'Warnings')} ({warnings.length})
          </h4>
          <div className="space-y-1">
            {warnings.map((warn, i) => (
              <div
                key={`warn-${i}`}
                className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 text-sm"
              >
                <Badge className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30 text-xs shrink-0">
                  {warn.row > 0
                    ? `${t('research.import.row', 'Row')} ${warn.row}`
                    : t('research.import.global', 'Global')}
                </Badge>
                {warn.column && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    {warn.column}
                  </Badge>
                )}
                <span className="text-muted-foreground">{warn.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('common.back', 'Back')}
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={hasBlockingErrors}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:pointer-events-none transition-colors"
          role="button"
        >
          {t('research.import.confirm', 'Confirm Import')}
        </button>
      </div>
    </div>
  )
}
