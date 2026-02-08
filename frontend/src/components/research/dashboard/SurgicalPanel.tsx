import type { SurgicalStats } from '@/services/research/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { surgicalChartConfig } from './chartConfig'
import { Scissors, Database } from 'lucide-react'

interface SurgicalPanelProps {
  data: SurgicalStats | undefined
  isLoading: boolean
}

function toChartData(
  distribution: Record<string, number>,
  config: Record<string, { color?: string }>,
) {
  return Object.entries(distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: config[name]?.color ?? '#6B7280',
  }))
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton data-testid="skeleton" className="h-6 w-40" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton data-testid="skeleton" className="h-4 w-full" />
        <Skeleton data-testid="skeleton" className="h-48 w-full" />
        <Skeleton data-testid="skeleton" className="h-4 w-3/4" />
      </CardContent>
    </Card>
  )
}

export function SurgicalPanel({ data, isLoading }: SurgicalPanelProps) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!data || data.total_records === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            Surgical Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Database className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground">No data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const treatmentData = toChartData(
    data.emergency_treatment_distribution,
    surgicalChartConfig,
  )
  const approachData = toChartData(data.approach_distribution, surgicalChartConfig)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Surgical Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {data.total_records} total records
        </p>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Syndesmosis Repairs</p>
            <p className="text-2xl font-bold">{data.syndesmosis_repair_count}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">Pre-op CT</p>
            <p className="text-2xl font-bold">{data.preop_ct_count}</p>
          </div>
        </div>

        {/* Days to Surgery */}
        {data.days_to_surgery_stats && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">
              Days to Surgery
            </p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Mean: </span>
                <span className="font-medium">
                  {data.days_to_surgery_stats.mean.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">SD: </span>
                <span className="font-medium">
                  {data.days_to_surgery_stats.std_dev.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Median: </span>
                <span className="font-medium">
                  {data.days_to_surgery_stats.median}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Emergency Treatment */}
        {treatmentData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Emergency Treatment
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={treatmentData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {treatmentData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Surgical Approach */}
        {approachData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Surgical Approach
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={approachData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {approachData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
