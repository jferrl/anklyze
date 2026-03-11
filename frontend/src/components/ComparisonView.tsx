import { useTranslation } from 'react-i18next';
import type { ComparisonScenario } from '@/types';
import { cn } from '@/lib/utils';
import {
  getFractureDescription,
} from '@/utils/classificationTranslations';

interface ComparisonViewProps {
  scenarios: ComparisonScenario[];
}

// Classification card colors - using CSS variables for dark mode support
const classificationColors = {
  laugeHansen: {
    border: 'border-l-emerald-500 dark:border-l-emerald-400',
    bg: 'bg-emerald-50/50 dark:bg-emerald-950/20',
    ring: 'ring-emerald-200 dark:ring-emerald-800',
    title: 'text-emerald-700 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-300',
  },
  danisWeber: {
    border: 'border-l-blue-500 dark:border-l-blue-400',
    bg: 'bg-blue-50/50 dark:bg-blue-950/20',
    ring: 'ring-blue-200 dark:ring-blue-800',
    title: 'text-blue-700 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-300',
  },
  aoota: {
    border: 'border-l-violet-500 dark:border-l-violet-400',
    bg: 'bg-violet-50/50 dark:bg-violet-950/20',
    ring: 'ring-violet-200 dark:ring-violet-800',
    title: 'text-violet-700 dark:text-violet-400',
    value: 'text-violet-700 dark:text-violet-300',
  },
  bartonicek: {
    border: 'border-l-amber-500 dark:border-l-amber-400',
    bg: 'bg-amber-50/50 dark:bg-amber-950/20',
    ring: 'ring-amber-200 dark:ring-amber-800',
    title: 'text-amber-700 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-300',
  },
};

export function ComparisonView({ scenarios }: ComparisonViewProps) {
  const { t } = useTranslation();

  if (scenarios.length < 2) {
    return null;
  }

  // Helper to check if values differ across scenarios
  const isDifferent = (getValue: (s: ComparisonScenario) => string | undefined) => {
    const values = scenarios.map(getValue).filter(Boolean);
    return new Set(values).size > 1;
  };

  // Classification getters
  const getLaugeHansen = (s: ComparisonScenario) => s.result.lauge_hansen?.type;
  const getDanisWeber = (s: ComparisonScenario) => s.result.danis_weber?.type;
  const getAOOTA = (s: ComparisonScenario) => s.result.ao_ota?.code;
  const getBartonicek = (s: ComparisonScenario) => s.result.bartonicek?.type;

  // Check which classifications have differences
  const lhDifferent = isDifferent(getLaugeHansen);
  const dwDifferent = isDifferent(getDanisWeber);
  const aoDifferent = isDifferent(getAOOTA);
  const bartDifferent = isDifferent(getBartonicek);

  const gridCols = scenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-3';

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">{t('results.title')}</h2>

      {/* Scenario headers */}
      <div className={`grid gap-4 ${gridCols}`}>
        {scenarios.map((scenario, index) => (
          <div
            key={scenario.id}
            className={cn(
              "relative rounded-xl border p-4",
              "bg-card/80 backdrop-blur-sm border-border/50",
              "shadow-sm hover:shadow-md transition-shadow duration-300",
              "question-card-enter"
            )}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-gradient-to-r from-primary/40 via-primary/60 to-primary/40 dark:from-primary/30 dark:via-primary/50 dark:to-primary/30" />

            <h3 className="font-semibold text-base mb-2">
              {t('comparison.scenario')} {String.fromCharCode(65 + index)}
            </h3>
            <p className="text-sm text-muted-foreground">
              {getFractureDescription(t, scenario.result.fracture_type)}
            </p>
          </div>
        ))}
      </div>

      {/* Lauge-Hansen comparison */}
      {scenarios.some(s => s.result.lauge_hansen) && (
        <ClassificationCard
          title={t('results.laugeHansen.title')}
          colors={classificationColors.laugeHansen}
          isDifferent={lhDifferent}
          gridCols={gridCols}
          delay={0.2}
        >
          {scenarios.map((scenario) => (
            <ClassificationValue
              key={scenario.id}
              value={scenario.result.lauge_hansen?.type}
              subtitle={undefined}
              isDifferent={lhDifferent}
              colors={classificationColors.laugeHansen}
            />
          ))}
        </ClassificationCard>
      )}

      {/* Danis-Weber comparison */}
      {scenarios.some(s => s.result.danis_weber) && (
        <ClassificationCard
          title={t('results.danisWeber.title')}
          colors={classificationColors.danisWeber}
          isDifferent={dwDifferent}
          gridCols={gridCols}
          delay={0.3}
        >
          {scenarios.map((scenario) => (
            <ClassificationValue
              key={scenario.id}
              value={scenario.result.danis_weber?.type}
              subtitle={undefined}
              isDifferent={dwDifferent}
              colors={classificationColors.danisWeber}
            />
          ))}
        </ClassificationCard>
      )}

      {/* AO/OTA comparison */}
      {scenarios.some(s => s.result.ao_ota) && (
        <ClassificationCard
          title={t('results.aoota.title')}
          colors={classificationColors.aoota}
          isDifferent={aoDifferent}
          gridCols={gridCols}
          delay={0.4}
        >
          {scenarios.map((scenario) => (
            <ClassificationValue
              key={scenario.id}
              value={scenario.result.ao_ota?.code}
              subtitle={undefined}
              isDifferent={aoDifferent}
              colors={classificationColors.aoota}
            />
          ))}
        </ClassificationCard>
      )}

      {/* Bartonicek comparison */}
      {scenarios.some(s => s.result.bartonicek) && (
        <ClassificationCard
          title={t('results.bartonicek.title')}
          colors={classificationColors.bartonicek}
          isDifferent={bartDifferent}
          gridCols={gridCols}
          delay={0.5}
        >
          {scenarios.map((scenario) => (
            <ClassificationValue
              key={scenario.id}
              value={scenario.result.bartonicek?.type}
              subtitle={undefined}
              isDifferent={bartDifferent}
              colors={classificationColors.bartonicek}
            />
          ))}
        </ClassificationCard>
      )}
    </div>
  );
}

// Subcomponents for cleaner code
interface ClassificationCardProps {
  title: string;
  colors: typeof classificationColors.laugeHansen;
  isDifferent: boolean;
  gridCols: string;
  delay: number;
  children: React.ReactNode;
}

function ClassificationCard({ title, colors, isDifferent, gridCols, delay, children }: ClassificationCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border-l-4 p-4",
        "bg-card/80 backdrop-blur-sm border border-border/50",
        "shadow-sm hover:shadow-md transition-all duration-300",
        "question-card-enter",
        colors.border,
        colors.bg,
        isDifferent && `ring-2 ${colors.ring}`
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <h3 className={cn("font-semibold text-lg mb-4", colors.title)}>
        {title}
      </h3>
      <div className={`grid gap-4 ${gridCols}`}>
        {children}
      </div>
    </div>
  );
}

interface ClassificationValueProps {
  value?: string;
  subtitle?: string;
  isDifferent: boolean;
  colors: typeof classificationColors.laugeHansen;
}

function ClassificationValue({ value, subtitle, isDifferent, colors }: ClassificationValueProps) {
  return (
    <div className="text-center">
      <p className={cn(
        "text-2xl font-bold transition-colors duration-200",
        isDifferent ? colors.value : "text-foreground"
      )}>
        {value || '-'}
      </p>
      {subtitle && (
        <p className="text-sm text-muted-foreground mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}
