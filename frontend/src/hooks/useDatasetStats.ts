import { useQuery } from '@tanstack/react-query'
import { datasetApi } from '@/services/research/datasetApi'
import type { RecordFilters } from '@/services/research/types'

export type FilterState = RecordFilters

export function useDatasetStats(datasetId: string, filters: FilterState) {
  const demographic = useQuery({
    queryKey: ['dataset', datasetId, 'demographic', filters],
    queryFn: () => datasetApi.getDemographicStats(datasetId, filters),
    enabled: !!datasetId,
  })

  const fracture = useQuery({
    queryKey: ['dataset', datasetId, 'fracture', filters],
    queryFn: () => datasetApi.getFractureStats(datasetId, filters),
    enabled: !!datasetId,
  })

  const surgical = useQuery({
    queryKey: ['dataset', datasetId, 'surgical', filters],
    queryFn: () => datasetApi.getSurgicalStats(datasetId, filters),
    enabled: !!datasetId,
  })

  const outcome = useQuery({
    queryKey: ['dataset', datasetId, 'outcome', filters],
    queryFn: () => datasetApi.getOutcomeStats(datasetId, filters),
    enabled: !!datasetId,
  })

  return { demographic, fracture, surgical, outcome }
}
