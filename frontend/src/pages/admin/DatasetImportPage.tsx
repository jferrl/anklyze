import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { ImportWizard } from '@/components/research/ImportWizard'
import { datasetApi } from '@/services/research/datasetApi'

export function DatasetImportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const { data: dataset, isLoading } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => datasetApi.get(id!),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground mt-4 font-medium">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (!dataset || !id) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-muted-foreground">{t('research.datasetNotFound', 'Dataset not found')}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <ImportWizard
        datasetId={id}
        datasetName={dataset.name}
        onComplete={() => navigate('/admin/research/datasets')}
        onCancel={() => navigate('/admin/research/datasets')}
      />
    </div>
  )
}
