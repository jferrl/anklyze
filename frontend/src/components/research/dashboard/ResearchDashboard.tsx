import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDatasetStats } from '@/hooks/useDatasetStats'
import { datasetApi } from '@/services/research/datasetApi'
import { DashboardFilters } from './DashboardFilters'
import type { DashboardFilterState } from './DashboardFilters'
import { DemographicPanel } from './DemographicPanel'
import { FracturePanel } from './FracturePanel'
import { SurgicalPanel } from './SurgicalPanel'
import { OutcomePanel } from './OutcomePanel'
import { Skeleton } from '@/components/ui/skeleton'

export function ResearchDashboard() {
  const { id } = useParams<{ id: string }>()
  const [filters, setFilters] = useState<DashboardFilterState>({})

  const { data: dataset, isLoading: datasetLoading } = useQuery({
    queryKey: ['dataset', id],
    queryFn: () => datasetApi.get(id!),
    enabled: !!id,
  })

  // Pass only API-supported filters to the hook
  const apiFilters = {
    sex: filters.sex,
    trauma_energy: filters.trauma_energy,
  }

  const { demographic, fracture, surgical, outcome } = useDatasetStats(
    id ?? '',
    apiFilters,
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {datasetLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h1 className="text-2xl font-bold">{dataset?.name ?? 'Research Dashboard'}</h1>
        )}
        <p className="text-muted-foreground mt-1">
          Explore dataset statistics and distributions
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters filters={filters} onChange={setFilters} />

      {/* Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DemographicPanel
          data={demographic.data}
          isLoading={demographic.isLoading}
        />
        <FracturePanel
          data={fracture.data}
          isLoading={fracture.isLoading}
        />
        <SurgicalPanel
          data={surgical.data}
          isLoading={surgical.isLoading}
        />
        <OutcomePanel
          data={outcome.data}
          isLoading={outcome.isLoading}
        />
      </div>
    </div>
  )
}
