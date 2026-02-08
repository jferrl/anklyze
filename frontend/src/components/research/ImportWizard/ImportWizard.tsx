import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { datasetApi } from '@/services/research/datasetApi'
import type { ImportResult } from '@/services/research/types'
import { UploadStep } from './UploadStep'
import { ValidationStep } from './ValidationStep'
import { SummaryStep } from './SummaryStep'

type WizardStep = 'upload' | 'importing' | 'validation' | 'summary'

interface ImportWizardProps {
  datasetId: string
  datasetName: string
  onComplete: () => void
  onCancel: () => void
}

export function ImportWizard({ datasetId, datasetName, onComplete, onCancel }: ImportWizardProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<WizardStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const importMutation = useMutation({
    mutationFn: (csvFile: File) => datasetApi.importCSV(datasetId, csvFile),
    onSuccess: (result) => {
      setImportResult(result)
      if (result.errors.length > 0) {
        setStep('validation')
      } else if (result.warnings.length > 0) {
        setStep('validation')
      } else {
        setStep('summary')
      }
    },
  })

  const handleFileSelected = (selectedFile: File | null) => {
    setFile(selectedFile)
    setImportResult(null)
  }

  const handleStartImport = () => {
    if (!file) return
    setStep('importing')
    importMutation.mutate(file)
  }

  const handleValidationNext = () => {
    setStep('summary')
  }

  const handleValidationBack = () => {
    setStep('upload')
    importMutation.reset()
  }

  const stepConfig: Record<
    WizardStep,
    { icon: typeof Upload; label: string }
  > = {
    upload: {
      icon: Upload,
      label: t('research.import.stepUpload', 'Upload'),
    },
    importing: {
      icon: Loader2,
      label: t('research.import.stepProcessing', 'Processing'),
    },
    validation: {
      icon: AlertCircle,
      label: t('research.import.stepValidation', 'Validation'),
    },
    summary: {
      icon: CheckCircle2,
      label: t('research.import.stepSummary', 'Summary'),
    },
  }

  const steps: WizardStep[] = ['upload', 'validation', 'summary']
  const currentIndex = steps.indexOf(step === 'importing' ? 'upload' : step)

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => {
          const config = stepConfig[s]
          const Icon = config.icon
          const isActive = s === step || (step === 'importing' && s === 'upload')
          const isDone = i < currentIndex

          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && (
                <div
                  className={cn(
                    'w-8 h-0.5 rounded-full',
                    isDone ? 'bg-emerald-500' : 'bg-border',
                  )}
                />
              )}
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  isActive && 'bg-primary/10 text-primary',
                  isDone && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  !isActive && !isDone && 'text-muted-foreground',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', step === 'importing' && s === 'upload' && 'animate-spin')} />
                {config.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('research.import.title', 'Import CSV Data')}
          </CardTitle>
          <CardDescription>
            {t('research.import.subtitle', 'Import patient records into "{{name}}"', {
              name: datasetName,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'upload' && (
            <div className="space-y-4">
              <UploadStep onFileSelected={handleFileSelected} file={file} />
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={onCancel}>
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button onClick={handleStartImport} disabled={!file} className="gap-2">
                  <Upload className="h-4 w-4" />
                  {t('research.import.startImport', 'Start Import')}
                </Button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {t('research.import.processing', 'Processing your CSV file...')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t(
                    'research.import.processingDesc',
                    'Normalizing dates, mapping enums, and validating records.',
                  )}
                </p>
              </div>
              {importMutation.isError && (
                <div className="text-sm text-destructive text-center">
                  {t('research.import.importFailed', 'Import failed. Please try again.')}
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                      {t('common.back', 'Back')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'validation' && importResult && (
            <ValidationStep
              errors={importResult.errors}
              warnings={importResult.warnings}
              onNext={handleValidationNext}
              onBack={handleValidationBack}
            />
          )}

          {step === 'summary' && importResult && (
            <div className="space-y-4">
              <SummaryStep result={importResult} fileName={file?.name} />
              <div className="flex justify-end pt-2">
                <Button onClick={onComplete} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('research.import.done', 'Done')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
