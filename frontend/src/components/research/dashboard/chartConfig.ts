import type { ChartConfig } from '@/components/ui/chart'

export const demographicChartConfig = {
  male: { label: 'Male', color: '#3B82F6' },
  female: { label: 'Female', color: '#EC4899' },
  underweight: { label: 'Underweight', color: '#F59E0B' },
  normal: { label: 'Normal', color: '#10B981' },
  overweight: { label: 'Overweight', color: '#F97316' },
  obese: { label: 'Obese', color: '#EF4444' },
} satisfies ChartConfig

export const fractureChartConfig = {
  right: { label: 'Right', color: '#3B82F6' },
  left: { label: 'Left', color: '#8B5CF6' },
  fall: { label: 'Fall', color: '#F59E0B' },
  sports: { label: 'Sports', color: '#10B981' },
  traffic: { label: 'Traffic', color: '#EF4444' },
  other: { label: 'Other', color: '#6B7280' },
  low: { label: 'Low energy', color: '#3B82F6' },
  high: { label: 'High energy', color: '#EF4444' },
  closed: { label: 'Closed', color: '#10B981' },
  open: { label: 'Open', color: '#EF4444' },
} satisfies ChartConfig

export const surgicalChartConfig = {
  splint: { label: 'Splint', color: '#3B82F6' },
  cast: { label: 'Cast', color: '#8B5CF6' },
  none: { label: 'None', color: '#6B7280' },
  lateral: { label: 'Lateral', color: '#3B82F6' },
  medial: { label: 'Medial', color: '#10B981' },
  posterior: { label: 'Posterior', color: '#F59E0B' },
} satisfies ChartConfig

export const outcomeChartConfig = {
  infection: { label: 'Infection', color: '#EF4444' },
  hardware_failure: { label: 'Hardware failure', color: '#F59E0B' },
  malunion: { label: 'Malunion', color: '#8B5CF6' },
} satisfies ChartConfig
