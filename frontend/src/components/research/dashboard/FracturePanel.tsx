import type { FractureStats } from '@/services/research/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fractureChartConfig } from './chartConfig'
import { Bone, Database } from 'lucide-react'

interface FracturePanelProps {
  data: FractureStats | undefined
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

export function FracturePanel({ data, isLoading }: FracturePanelProps) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!data || data.total_records === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bone className="h-5 w-5" />
            Fracture Characteristics
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

  const lateralityData = toChartData(data.laterality_distribution, fractureChartConfig)
  const mechanismData = toChartData(data.mechanism_distribution, fractureChartConfig)
  const energyData = toChartData(data.trauma_energy_distribution, fractureChartConfig)
  const openClosedData = toChartData(data.open_closed_distribution, fractureChartConfig)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bone className="h-5 w-5" />
          Fracture Characteristics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {data.total_records} total records
        </p>

        {/* Laterality */}
        {lateralityData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Laterality
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={lateralityData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {lateralityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Injury Mechanism */}
        {mechanismData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Injury Mechanism
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={mechanismData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12 }}
                  width={80}
                />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {mechanismData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Trauma Energy */}
        {energyData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Trauma Energy
            </p>
            <div className="flex gap-4">
              {energyData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open/Closed */}
        {openClosedData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Open / Closed
            </p>
            <div className="flex gap-4">
              {openClosedData.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
