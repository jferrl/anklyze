import type { OutcomeStats } from '@/services/research/types'
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
import { outcomeChartConfig } from './chartConfig'
import { TrendingUp, Database } from 'lucide-react'

interface OutcomePanelProps {
  data: OutcomeStats | undefined
  isLoading: boolean
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

export function OutcomePanel({ data, isLoading }: OutcomePanelProps) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!data || data.total_records === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Outcomes
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

  const complicationData = Object.entries(data.complication_distribution).map(
    ([name, value]) => ({
      name: name
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' '),
      value,
      fill:
        outcomeChartConfig[name as keyof typeof outcomeChartConfig]?.color ?? '#6B7280',
    }),
  )

  const displacementRate =
    data.total_records > 0
      ? ((data.secondary_displacement_count / data.total_records) * 100).toFixed(1)
      : '0.0'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Outcomes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {data.total_records} total records
        </p>

        {/* Secondary Displacement */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-xs text-muted-foreground">Secondary Displacement</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold">
              {data.secondary_displacement_count}
            </span>
            <span className="text-sm text-muted-foreground">
              ({displacementRate}%)
            </span>
          </div>
        </div>

        {/* Complications */}
        {complicationData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Complications
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={complicationData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {complicationData.map((entry) => (
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
