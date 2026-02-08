import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface UploadStepProps {
  onFileSelected: (file: File) => void
  file?: File | null
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ACCEPTED_TYPES = { 'text/csv': ['.csv'] }

export function UploadStep({ onFileSelected, file }: UploadStepProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: Array<{ errors: Array<{ code: string }> }>) => {
      setError(null)
      if (rejectedFiles.length > 0) {
        const firstError = rejectedFiles[0].errors[0]
        if (firstError.code === 'file-too-large') {
          setError(t('research.import.fileTooLarge', 'File exceeds the 50MB limit'))
        } else {
          setError(t('research.import.invalidFileType', 'Only CSV files are accepted'))
        }
        return
      }
      if (acceptedFiles.length > 0) {
        onFileSelected(acceptedFiles[0])
      }
    },
    [onFileSelected, t],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  })

  const handleRemove = () => {
    setError(null)
    onFileSelected(null as unknown as File)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {file ? (
        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/30">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={handleRemove}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300',
            'hover:border-primary/50 hover:bg-primary/5',
            isDragActive
              ? 'border-primary bg-primary/10 scale-[1.01]'
              : 'border-muted-foreground/25',
          )}
        >
          <input {...getInputProps()} aria-label={t('research.import.selectFile', 'Select file')} />
          <div className="flex flex-col items-center gap-3">
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center transition-all',
                isDragActive ? 'bg-primary/20 scale-110' : 'bg-muted',
              )}
            >
              <Upload
                className={cn(
                  'w-7 h-7 transition-colors',
                  isDragActive ? 'text-primary' : 'text-muted-foreground',
                )}
              />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isDragActive
                  ? t('research.import.dropHere', 'Drop CSV file here')
                  : t('research.import.dragOrClick', 'Drag and drop a CSV file, or click to browse')}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t('research.import.maxSize', 'Max file size: 50MB. Only .csv files.')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
