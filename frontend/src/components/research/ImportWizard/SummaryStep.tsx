import { useTranslation } from 'react-i18next'
import { CheckCircle2, FileSpreadsheet, Zap, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ImportResult } from '@/services/research/types'

interface SummaryStepProps {
  result: ImportResult
  fileName?: string
}

export function SummaryStep({ result, fileName }: SummaryStepProps) {
  const { t } = useTranslation()
  const { stats } = result

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">
            {t('research.import.success', 'Import completed successfully')}
          </p>
          {fileName && (
            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">{fileName}</p>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('research.import.totalRows', 'Total Rows')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{stats.total_rows}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('research.import.validRecords', 'Valid Records')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.valid_records}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('research.import.cleaned', 'Cells Cleaned')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold">{stats.cells_cleaned}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {t('research.import.warningsCount', 'Warnings')}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.warnings_count}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            {t('research.import.pipelineDetails', 'Pipeline Details')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('research.import.datesNormalized', 'Dates normalized')}
              </span>
              <span className="font-medium">{stats.dates_normalized}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('research.import.enumsMapped', 'Enums mapped')}
              </span>
              <span className="font-medium">{stats.enums_mapped}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('research.import.emptyRowsRemoved', 'Empty rows removed')}
              </span>
              <span className="font-medium">{stats.empty_rows_removed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {t('research.import.partialRecords', 'Partial records')}
              </span>
              <span className="font-medium">{stats.partial_records}</span>
            </div>
          </div>

          {result.ai_used && (
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Badge className="gap-1">
                <Zap className="h-3 w-3" />
                {t('research.import.aiUsed', 'AI-assisted normalization')}
              </Badge>
              <span className="text-muted-foreground">
                {stats.ai_extractions} {t('research.import.extractions', 'extractions')}
              </span>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="mt-4 flex items-start gap-2 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                {t(
                  'research.import.warningsSummary',
                  '{{count}} warning(s) were recorded during import. Review the import log for details.',
                  { count: result.warnings.length },
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
