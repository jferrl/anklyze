import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
} from 'recharts';
import { cn } from '@/lib/utils';
import { BarChart3, PieChart as PieChartIcon, List } from 'lucide-react';

// Modern, harmonious color palette
const CHART_COLORS = [
  { main: '#3B82F6', light: '#3B82F620', name: 'blue' },
  { main: '#10B981', light: '#10B98120', name: 'emerald' },
  { main: '#F59E0B', light: '#F59E0B20', name: 'amber' },
  { main: '#8B5CF6', light: '#8B5CF620', name: 'violet' },
  { main: '#EC4899', light: '#EC489920', name: 'pink' },
  { main: '#06B6D4', light: '#06B6D420', name: 'cyan' },
  { main: '#F97316', light: '#F9731620', name: 'orange' },
  { main: '#84CC16', light: '#84CC1620', name: 'lime' },
];

interface ChartDataItem {
  name: string;
  value: number;
  fill: string;
  percentage: number;
}

interface ClassificationChartProps {
  data: Record<string, number>;
  title?: string;
  systemLabel: string;
}

type ViewMode = 'donut' | 'bar' | 'list';

export function ClassificationChart({
  data,
  title,
  systemLabel,
}: ClassificationChartProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('donut');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    return Object.entries(data)
      .map(([name, value], index) => ({
        name: name || t('admin.analytics.unspecified'),
        value: value as number,
        fill: CHART_COLORS[index % CHART_COLORS.length].main,
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, t]);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="chart-card flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-muted-foreground font-medium">
          {t('admin.analytics.noData')}
        </p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          {t('admin.analytics.noDataSubtitle', 'No classifications recorded yet')}
        </p>
      </div>
    );
  }

  return (
    <div className="chart-card chart-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {title || systemLabel}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} {t('admin.analytics.totalClassifications', 'total classifications')}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
          {[
            { mode: 'donut' as ViewMode, icon: PieChartIcon, label: 'Donut' },
            { mode: 'bar' as ViewMode, icon: BarChart3, label: 'Bar' },
            { mode: 'list' as ViewMode, icon: List, label: 'List' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'p-2 rounded-md transition-all duration-200',
                viewMode === mode
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={label}
            >
              <Icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Chart Content */}
      <div className="min-h-[320px]">
        {viewMode === 'donut' && (
          <DonutView
            data={chartData}
            total={total}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
          />
        )}
        {viewMode === 'bar' && (
          <BarView data={chartData} hoveredIndex={hoveredIndex} setHoveredIndex={setHoveredIndex} />
        )}
        {viewMode === 'list' && (
          <ListView data={chartData} />
        )}
      </div>

      {/* Legend */}
      {viewMode !== 'list' && (
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border/50">
          {chartData.slice(0, 6).map((item, index) => (
            <div
              key={item.name}
              className={cn(
                'legend-item',
                hoveredIndex === index && 'bg-muted border-border'
              )}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm font-medium truncate max-w-[120px]">
                {item.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
          {chartData.length > 6 && (
            <div className="legend-item text-muted-foreground">
              <span className="text-sm">+{chartData.length - 6} more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Donut Chart View
function DonutView({
  data,
  total,
  hoveredIndex,
  setHoveredIndex,
}: {
  data: ChartDataItem[];
  total: number;
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
}) {
  const centerData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={80}
            outerRadius={130}
            paddingAngle={2}
            onMouseEnter={(_, index) => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill}
                stroke="transparent"
                style={{
                  filter: hoveredIndex === index ? 'brightness(1.1)' : 'none',
                  transform: hoveredIndex === index ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: 'center',
                  transition: 'all 0.2s ease-out',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {centerData ? (
            <>
              <p className="text-3xl font-bold text-foreground">
                {centerData.value}
              </p>
              <p className="text-sm text-muted-foreground max-w-[100px] truncate">
                {centerData.name}
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl font-bold text-foreground">{total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Bar Chart View
function BarView({
  data,
  hoveredIndex,
  setHoveredIndex,
}: {
  data: ChartDataItem[];
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
}) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 20, top: 10, bottom: 10 }}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          axisLine={false}
          tickLine={false}
          width={100}
          tick={({ x, y, payload }) => (
            <text
              x={x}
              y={y}
              dy={4}
              textAnchor="end"
              className="text-xs fill-muted-foreground"
            >
              {payload.value.length > 12
                ? payload.value.slice(0, 12) + '...'
                : payload.value}
            </text>
          )}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Bar
          dataKey="value"
          radius={[0, 6, 6, 0]}
          onMouseEnter={(_, index) => setHoveredIndex(index)}
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.fill}
              style={{
                opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.4,
                transition: 'opacity 0.2s ease-out',
              }}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// List View
function ListView({ data }: { data: ChartDataItem[] }) {
  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div
          key={item.name}
          className="group flex items-center gap-4 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div
            className="w-2 h-10 rounded-full flex-shrink-0"
            style={{ backgroundColor: item.fill }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">{item.name}</p>
            <p className="text-sm text-muted-foreground">
              {item.value} responses
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-24 h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className="h-full rounded-full bar-grow"
                style={{
                  backgroundColor: item.fill,
                  width: `${item.percentage}%`,
                  animationDelay: `${index * 50 + 100}ms`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-foreground w-12 text-right">
              {item.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Custom Tooltip
interface TooltipPayloadItem {
  payload: {
    name: string;
    value: number;
    fill: string;
    percentage: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg shadow-xl px-3 py-2">
      <p className="font-medium text-foreground">{data.name}</p>
      <div className="flex items-center gap-2 mt-1">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: data.fill }}
        />
        <span className="text-sm text-muted-foreground">
          {data.value} ({data.percentage.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
