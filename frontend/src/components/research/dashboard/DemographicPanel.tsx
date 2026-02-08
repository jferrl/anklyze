import type { DemographicStats, NumericStats } from '@/services/research/types'
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
import { demographicChartConfig } from './chartConfig'
import { Users, Database } from 'lucide-react'

interface DemographicPanelProps {
  data: DemographicStats | undefined
  isLoading: boolean
}

function StatsTable({ label, stats }: { label: string; stats: NumericStats }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Mean: </span>
          <span className="font-medium">{stats.mean.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">SD: </span>
          <span className="font-medium">{stats.std_dev.toFixed(1)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Median: </span>
          <span className="font-medium">{stats.median}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Min: </span>
          <span className="font-medium">{stats.min}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Max: </span>
          <span className="font-medium">{stats.max}</span>
        </div>
        <div>
          <span className="text-muted-foreground">N: </span>
          <span className="font-medium">{stats.count}</span>
        </div>
      </div>
    </div>
  )
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

export function DemographicPanel({ data, isLoading }: DemographicPanelProps) {
  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (!data || data.total_records === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Demographics
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

  const sexData = Object.entries(data.sex_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: demographicChartConfig[name as keyof typeof demographicChartConfig]?.color ?? '#6B7280',
  }))

  const ageGroupData = Object.entries(data.age_group_distribution).map(
    ([name, value]) => ({ name, value }),
  )

  const bmiData = Object.entries(data.bmi_distribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: demographicChartConfig[name as keyof typeof demographicChartConfig]?.color ?? '#6B7280',
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Demographics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {data.total_records} total records
        </p>

        {/* Age stats */}
        {data.age_stats && (
          <StatsTable label="Age" stats={data.age_stats} />
        )}

        {/* Sex Distribution */}
        {sexData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Sex Distribution
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={sexData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {sexData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Age Group Distribution */}
        {ageGroupData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Age Groups
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageGroupData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* BMI stats */}
        {data.bmi_stats && (
          <StatsTable label="BMI" stats={data.bmi_stats} />
        )}

        {/* BMI Distribution */}
        {bmiData.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              BMI Distribution
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={bmiData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {bmiData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Vitamin D stats */}
        {data.vitamin_d_stats && (
          <StatsTable label="Vitamin D (ng/mL)" stats={data.vitamin_d_stats} />
        )}
      </CardContent>
    </Card>
  )
}
