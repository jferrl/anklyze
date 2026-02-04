import { useTranslation } from 'react-i18next';
import { Info, AlertTriangle } from 'lucide-react';
import type { ClassificationResult as Result } from '../types/fracture';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import {
  getFractureDescription,
  getDanisWeberDescription,
  getLaugeHansenFullName,
  getLaugeHansenDescription,
  getAOOTADescription,
  getBartonicekDescription,
  getImpossibleReason,
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
};

export function ClassificationResult({ result }: ClassificationResultProps) {
  const { t } = useTranslation();

  // Handle impossible cases
  if (result.impossible) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{t('results.title')}</h2>
        {result.fracture_type && (
          <p className="text-center text-lg text-muted-foreground">
            {getFractureDescription(t, result.fracture_type)}
          </p>
        )}
        <Alert variant="destructive" className="question-card-enter">
          <AlertTitle>{t('results.notPossible')}</AlertTitle>
          <AlertDescription>
            {result.impossible_key && getImpossibleReason(t, result.impossible_key)}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasAnyClassification = result.lauge_hansen || result.danis_weber || result.ao_ota || result.bartonicek;

  if (!hasAnyClassification) {
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

      {/* Lauge-Hansen */}
      {result.lauge_hansen && (
        <>
          {result.lauge_hansen.ambiguous && result.lauge_hansen.possible_types && result.lauge_hansen.possible_types.length > 0 ? (
            // Ambiguous case with multiple possible types
            <Alert
              className="question-card-enter border-l-4 border-l-amber-500 dark:border-l-amber-400 bg-amber-50 dark:bg-amber-950/20 w-full max-w-full"
              style={{ animationDelay: '0.1s' }}
            >
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-900 dark:text-amber-100">
                {t('results.laugeHansen.title')} - {getLaugeHansenFullName(t, '', result.lauge_hansen.ambiguous)}
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-amber-800 dark:text-amber-200">
                  {getLaugeHansenDescription(t, '', result.lauge_hansen.ambiguous)}
                </p>
                <div className="space-y-2">
                  <p className="font-semibold text-amber-900 dark:text-amber-100">
                    {t('results.possibleTypes')}:
                  </p>
                  <div className="space-y-2">
                    {result.lauge_hansen.possible_types.map((type) => (
                      <div
                        key={type}
                        className="p-3 rounded-md bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800"
                      >
                        <p className="font-semibold text-amber-900 dark:text-amber-100">
                          {type} - {getLaugeHansenFullName(t, type)}
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                          {getLaugeHansenDescription(t, type)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            // Definitive classification or truly unclassifiable (no possible types)
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
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <p className={cn(
                      "text-3xl font-bold mb-1 cursor-help inline-flex items-center gap-2 transition-colors",
                      classificationStyles.laugeHansen.hover
                    )}>
                      {result.lauge_hansen.type || getLaugeHansenFullName(t, '', result.lauge_hansen.ambiguous)}
                      <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </p>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 glass-card">
                    <div className="space-y-2">
                      <h4 className="font-semibold">
                        {getLaugeHansenFullName(t, result.lauge_hansen.type, result.lauge_hansen.ambiguous)}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {getLaugeHansenDescription(t, result.lauge_hansen.type, result.lauge_hansen.ambiguous)}
                      </p>
                    </div>
                  </HoverCardContent>
                </HoverCard>
                <p className="text-lg mb-2">
                  {getLaugeHansenFullName(t, result.lauge_hansen.type, result.lauge_hansen.ambiguous)}
                </p>
                <p className="text-muted-foreground">
                  {getLaugeHansenDescription(t, result.lauge_hansen.type, result.lauge_hansen.ambiguous)}
                </p>
              </CardContent>
            </Card>
          )}
        </>
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
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className={cn(
                  "text-3xl font-bold mb-2 cursor-help inline-flex items-center gap-2 transition-colors",
                  classificationStyles.danisWeber.hover
                )}>
                  {result.danis_weber.type}
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 glass-card">
                <div className="space-y-2">
                  <h4 className="font-semibold">{result.danis_weber.type}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getDanisWeberDescription(t, result.danis_weber.type)}
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <p className="text-muted-foreground">
              {getDanisWeberDescription(t, result.danis_weber.type)}
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
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className={cn(
                  "text-3xl font-bold mb-2 cursor-help inline-flex items-center gap-2 transition-colors",
                  classificationStyles.aoota.hover
                )}>
                  {result.ao_ota.code}
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 glass-card">
                <div className="space-y-2">
                  <h4 className="font-semibold">{result.ao_ota.code}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getAOOTADescription(t, result.ao_ota.code)}
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <p className="text-muted-foreground">
              {getAOOTADescription(t, result.ao_ota.code)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bartonicek */}
      {result.bartonicek && (
        <Card
          className={cn(
            "group relative overflow-hidden border-l-4 glass-card card-hover question-card-enter w-full max-w-full",
            classificationStyles.bartonicek.border
          )}
          style={{ animationDelay: '0.4s' }}
        >
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-500",
            classificationStyles.bartonicek.glow
          )} />
          <CardHeader className="relative">
            <CardTitle className={classificationStyles.bartonicek.title}>{t('results.bartonicek.title')}</CardTitle>
            <CardDescription>{t('results.bartonicek.description')}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className={cn(
                  "text-3xl font-bold mb-2 cursor-help inline-flex items-center gap-2 transition-colors",
                  classificationStyles.bartonicek.hover
                )}>
                  {result.bartonicek.type}
                  <Info className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 glass-card">
                <div className="space-y-2">
                  <h4 className="font-semibold">{result.bartonicek.type}</h4>
                  <p className="text-sm text-muted-foreground">
                    {getBartonicekDescription(t, result.bartonicek.type)}
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <p className="text-muted-foreground">
              {getBartonicekDescription(t, result.bartonicek.type)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Clinical Notes */}
      {result.notes && result.notes.length > 0 && (
        <Alert className="question-card-enter" style={{ animationDelay: '0.5s' }}>
          <AlertTitle>{t('results.clinicalNotes')}</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {result.notes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
