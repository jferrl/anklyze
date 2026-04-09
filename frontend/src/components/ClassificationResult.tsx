import { useTranslation } from 'react-i18next';
import { XCircle, AlertTriangle, Info } from 'lucide-react';
import type { ClassificationResult as Result } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getFractureDescription,
  getLaugeHansenFullName,
  getAOOTADisplayName,
  getAOOTASubtypeLabel,
  getDanisWeberDisplayName,
  getBartonicekDisplayName,
  getBartonicekReason,
  getBartonicekState,
} from '@/utils/classificationTranslations';

interface ClassificationResultProps {
  result: Result;
}

// Consistent colors with ComparisonView
const classificationStyles = {
  laugeHansen: {
    border: 'border-l-emerald-500 dark:border-l-emerald-400',
    title: 'text-emerald-600 dark:text-emerald-400',
    hover: 'hover:text-emerald-500',
    glow: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
  },
  danisWeber: {
    border: 'border-l-blue-500 dark:border-l-blue-400',
    title: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:text-blue-500',
    glow: 'bg-blue-500/10 group-hover:bg-blue-500/20',
  },
  aoota: {
    border: 'border-l-violet-500 dark:border-l-violet-400',
    title: 'text-violet-600 dark:text-violet-400',
    hover: 'hover:text-violet-500',
    glow: 'bg-violet-500/10 group-hover:bg-violet-500/20',
  },
  bartonicek: {
    border: 'border-l-amber-500 dark:border-l-amber-400',
    title: 'text-amber-600 dark:text-amber-400',
    hover: 'hover:text-amber-500',
    glow: 'bg-amber-500/10 group-hover:bg-amber-500/20',
  },
  bartonicekNoPosterior: {
    border: 'border-l-gray-300 dark:border-l-gray-600',
    title: 'text-gray-400 dark:text-gray-500',
    hover: '',
    glow: 'bg-gray-500/5',
  },
  bartonicekNoCt: {
    border: 'border-l-orange-500 dark:border-l-orange-400',
    title: 'text-orange-600 dark:text-orange-400',
    hover: '',
    glow: 'bg-orange-500/10 group-hover:bg-orange-500/20',
  },
};

export function ClassificationResult({ result }: ClassificationResultProps) {
  const { t } = useTranslation();

  const hasAnyClassification = result.lauge_hansen || result.danis_weber || result.ao_ota || result.bartonicek;

  if (!hasAnyClassification && !result.impossible) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{t('results.title')}</h2>
        <Alert className="question-card-enter">
          <AlertDescription>{t('results.noClassification')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <h2 className="text-2xl font-bold text-center">{t('results.title')}</h2>

      {/* Fracture Description */}
      {result.fracture_type && (
        <p className="text-center text-lg font-medium question-card-enter">
          {getFractureDescription(t, result.fracture_type)}
        </p>
      )}

      {/* Impossible Banner — shown above all classification cards */}
      {result.impossible && (
        <Alert variant="destructive" className="question-card-enter">
          <XCircle className="h-5 w-5" />
          <AlertTitle>{t('results.impossibleBanner.title')}</AlertTitle>
          <AlertDescription>
            {result.impossible_key && t(`results.impossibleReasons.${result.impossible_key}`)}
          </AlertDescription>
        </Alert>
      )}

      {/* Lauge-Hansen */}
      {result.lauge_hansen && (
        <Card
          className={cn(
            "group relative overflow-hidden border-l-4 glass-card card-hover question-card-enter w-full max-w-full",
            classificationStyles.laugeHansen.border
          )}
          style={{ animationDelay: '0.1s' }}
        >
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-500",
            classificationStyles.laugeHansen.glow
          )} />
          <CardHeader className="relative">
            <CardTitle className={classificationStyles.laugeHansen.title}>{t('results.laugeHansen.title')}</CardTitle>
            <CardDescription>{t('results.laugeHansen.description')}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            {result.lauge_hansen.type === 'not_classifiable' ? (
              <p className="text-3xl font-bold mb-2">
                {getLaugeHansenFullName(t, result.lauge_hansen.type)}
              </p>
            ) : (
              <>
                <p className="text-3xl font-bold mb-1">
                  {result.lauge_hansen.type}
                </p>
                <p className="text-lg mb-2">
                  {getLaugeHansenFullName(t, result.lauge_hansen.type)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danis-Weber */}
      {result.danis_weber && (
        <Card
          className={cn(
            "group relative overflow-hidden border-l-4 glass-card card-hover question-card-enter w-full max-w-full",
            classificationStyles.danisWeber.border
          )}
          style={{ animationDelay: '0.2s' }}
        >
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-500",
            classificationStyles.danisWeber.glow
          )} />
          <CardHeader className="relative">
            <CardTitle className={classificationStyles.danisWeber.title}>{t('results.danisWeber.title')}</CardTitle>
            <CardDescription>{t('results.danisWeber.description')}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-3xl font-bold mb-2">
              {getDanisWeberDisplayName(t, result.danis_weber.type)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* AO/OTA */}
      {result.ao_ota && (
        <Card
          className={cn(
            "group relative overflow-hidden border-l-4 glass-card card-hover question-card-enter w-full max-w-full",
            classificationStyles.aoota.border
          )}
          style={{ animationDelay: '0.3s' }}
        >
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-500",
            classificationStyles.aoota.glow
          )} />
          <CardHeader className="relative">
            <CardTitle className={classificationStyles.aoota.title}>{t('results.aoota.title')}</CardTitle>
            <CardDescription>{t('results.aoota.description')}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <p className="text-3xl font-bold mb-2">
              {getAOOTADisplayName(t, result.ao_ota.code)}
            </p>
            {getAOOTASubtypeLabel(t, result.ao_ota.code) && (
              <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
                {getAOOTASubtypeLabel(t, result.ao_ota.code)}
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Bartonicek */}
      {result.bartonicek && (() => {
        const bartState = getBartonicekState(result.bartonicek.type, result.fracture_type);
        const styles = bartState === 'no_posterior'
          ? classificationStyles.bartonicekNoPosterior
          : bartState === 'no_ct'
            ? classificationStyles.bartonicekNoCt
            : classificationStyles.bartonicek;

        return (
          <Card
            className={cn(
              "group relative overflow-hidden border-l-4 glass-card card-hover question-card-enter w-full max-w-full",
              styles.border,
              bartState === 'no_posterior' && "opacity-60"
            )}
            style={{ animationDelay: '0.4s' }}
          >
            <div className={cn(
              "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-500",
              styles.glow
            )} />
            <CardHeader className="relative">
              <CardTitle className={styles.title}>
                {t('results.bartonicek.title')}
              </CardTitle>
              <CardDescription>{t('results.bartonicek.description')}</CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-3xl font-bold mb-2">
                {getBartonicekDisplayName(t, result.bartonicek.type, result.fracture_type)}
              </p>
              {getBartonicekReason(t, result.bartonicek.type, result.fracture_type) && (
                bartState === 'no_ct' ? (
                  <div className="flex items-start gap-2 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-2.5 mt-1">
                    <AlertTriangle className="h-4 w-4 text-orange-500 dark:text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      {getBartonicekReason(t, result.bartonicek.type, result.fracture_type)}
                    </p>
                  </div>
                ) : bartState === 'no_posterior' ? (
                  <div className="flex items-start gap-2 rounded-md bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 p-2.5 mt-1">
                    <Info className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {getBartonicekReason(t, result.bartonicek.type, result.fracture_type)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {getBartonicekReason(t, result.bartonicek.type, result.fracture_type)}
                  </p>
                )
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Clinical Notes */}
      {result.notes && result.notes.length > 0 && (
        <Alert className="question-card-enter" style={{ animationDelay: '0.5s' }}>
          <AlertTitle>{t('results.clinicalNotes')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
