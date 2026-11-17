import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import { BarChart3, PieChart as PieChartIcon, List } from 'lucide-react';

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
  /** Identity colour of the classification system being plotted. */
  color?: string;
}

type ViewMode = 'donut' | 'bar' | 'list';

const VIEWS: { mode: ViewMode; icon: typeof BarChart3; labelKey: string }[] = [
  { mode: 'bar', icon: BarChart3, labelKey: 'admin.analytics.viewBar' },
  { mode: 'donut', icon: PieChartIcon, labelKey: 'admin.analytics.viewDonut' },
  { mode: 'list', icon: List, labelKey: 'admin.analytics.viewList' },
];

export function ClassificationChart({
  data,
  title,
  systemLabel,
  color = 'var(--chart-5)',
}: ClassificationChartProps) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<ViewMode>('bar');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    return Object.entries(data)
      .map(([name, value]) => ({
        name: name || t('admin.analytics.unspecified'),
        value: value as number,
        fill: color,
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, t, color]);

  // Donut slices are one hue stepped light to dark by share, largest darkest.
  const donutData = useMemo(
    () =>
      chartData.map((item, index) => ({
        ...item,
        fill: `color-mix(in oklch, ${color} ${Math.round(
          100 - (index / Math.max(chartData.length - 1, 1)) * 75
        )}%, var(--card))`,
      })),
    [chartData, color]
  );

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <div className="chart-card flex min-h-[200px] flex-col items-center justify-center text-center">
        <p className="text-sm font-medium text-foreground">
          {t('admin.analytics.noData')}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.analytics.noDataSubtitle', 'No classifications recorded yet')}
        </p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            {title || systemLabel}
          </h3>
          <p className="text-sm tabular-nums text-muted-foreground">
            {total} {t('admin.analytics.totalClassifications', 'total classifications')}
          </p>
        </div>

        <div className="flex shrink-0 gap-0.5 rounded-md border p-0.5">
          {VIEWS.map(({ mode, icon: Icon, labelKey }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'rounded-sm p-1.5 transition-colors duration-150',
                viewMode === mode
                  ? 'bg-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title={t(labelKey)}
              aria-label={t(labelKey)}
              aria-pressed={viewMode === mode}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div>
        {viewMode === 'donut' && (
          <DonutView
            data={donutData}
            total={total}
            hoveredIndex={hoveredIndex}
            setHoveredIndex={setHoveredIndex}
          />
        )}
        {viewMode === 'bar' && (
          <BarView data={chartData} hoveredIndex={hoveredIndex} setHoveredIndex={setHoveredIndex} />
        )}
        {viewMode === 'list' && <ListView data={chartData} />}
      </div>

      {/* The bar view labels each bar on its axis, so only the donut needs a legend. */}
      {viewMode === 'donut' && (
        <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
          {donutData.slice(0, 6).map((item, index) => (
            <div
              key={item.name}
              className={cn('legend-item rounded-sm', hoveredIndex === index && 'bg-muted')}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span className="size-2.5 shrink-0" style={{ backgroundColor: item.fill }} />
              <span className="max-w-[120px] truncate text-sm font-medium">
                {item.name}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
          {donutData.length > 6 && (
            <div className="legend-item text-muted-foreground">
              <span className="text-sm tabular-nums">{t('admin.analytics.moreCount', { count: donutData.length - 6 })}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const dimmed = (hoveredIndex: number | null, index: number) => ({
  opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.4,
  transition: 'opacity 0.15s ease-out',
});

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
  const { t } = useTranslation();
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
            isAnimationActive={false}
            onMouseEnter={(_, index) => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {data.map((entry, index) => (
              <Cell
                key={entry.name}
                stroke="var(--card)"
                strokeWidth={2}
                style={{ fill: entry.fill, ...dimmed(hoveredIndex, index) }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-semibold tabular-nums text-foreground">
            {centerData ? centerData.value : total}
          </p>
          <p className="max-w-[100px] truncate text-sm text-muted-foreground">
            {centerData ? centerData.name : t('common.total')}
          </p>
        </div>
      </div>
    </div>
  );
}

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
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36 + 20)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 40, top: 10, bottom: 10 }}
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
              className="fill-muted-foreground text-xs"
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
          barSize={20}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
          onMouseEnter={(_, index) => setHoveredIndex(index)}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} style={{ fill: entry.fill, ...dimmed(hoveredIndex, index) }} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground text-xs tabular-nums"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ListView({ data }: { data: ChartDataItem[] }) {
  const { t } = useTranslation();
  return (
    <div className="divide-y border-t">
      {data.map((item) => (
        <div key={item.name} className="flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              {t('admin.analytics.responsesCount', { count: item.value })}
            </p>
          </div>
          <div className="h-1.5 w-24 overflow-hidden rounded-sm bg-muted">
            <div
              className="h-full rounded-sm"
              style={{ backgroundColor: item.fill, width: `${item.percentage}%` }}
            />
          </div>
          <span className="w-14 text-right text-sm font-medium tabular-nums text-foreground">
            {item.percentage.toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { payload: ChartDataItem }[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{data.name}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="size-2 shrink-0" style={{ backgroundColor: data.fill }} />
        <span className="text-sm tabular-nums text-muted-foreground">
          {data.value} ({data.percentage.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
