import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
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

interface ClassificationResultProps {
  result: Result;
}

export function ClassificationResult({ result }: ClassificationResultProps) {
  const { t } = useTranslation();

  // Handle impossible cases
  if (result.impossible) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{t('results.title')}</h2>
        {result.fracture_description && (
          <p className="text-center text-lg text-muted-foreground">{result.fracture_description}</p>
        )}
        <Alert variant="destructive">
          <AlertTitle>{t('results.notPossible')}</AlertTitle>
          <AlertDescription>{result.impossible_reason}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const hasAnyClassification = result.lauge_hansen || result.danis_weber || result.ao_ota || result.bartonicek;

  if (!hasAnyClassification) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{t('results.title')}</h2>
        <Alert>
          <AlertDescription>{t('results.noClassification')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">{t('results.title')}</h2>

      {/* Fracture Description */}
      {result.fracture_description && (
        <p className="text-center text-lg font-medium">{result.fracture_description}</p>
      )}

      {/* Lauge-Hansen */}
      {result.lauge_hansen && (
        <Card className="group relative overflow-hidden border-l-4 border-l-green-500 glass-card card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/20 transition-colors duration-500" />
          <CardHeader className="relative">
            <CardTitle className="text-green-600 dark:text-green-400">{t('results.laugeHansen.title')}</CardTitle>
            <CardDescription>{t('results.laugeHansen.description')}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className="text-3xl font-bold mb-1 cursor-help inline-flex items-center gap-2 hover:text-green-500 transition-colors">
                  {result.lauge_hansen.type}
                  <Info className="h-4 w-4 text-muted-foreground" />
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 glass-card">
                <div className="space-y-2">
                  <h4 className="font-semibold">{result.lauge_hansen.full_name}</h4>
                  <p className="text-sm text-muted-foreground">{result.lauge_hansen.description}</p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <p className="text-lg mb-2">{result.lauge_hansen.full_name}</p>
            <p className="text-muted-foreground">{result.lauge_hansen.description}</p>
            {result.lauge_hansen.ambiguous && result.lauge_hansen.possible_types && (
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                {t('results.possibleTypes')}: {result.lauge_hansen.possible_types.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danis-Weber */}
      {result.danis_weber && (
        <Card className="group relative overflow-hidden border-l-4 border-l-blue-500 glass-card card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-blue-500/20 transition-colors duration-500" />
          <CardHeader className="relative">
            <CardTitle className="text-blue-600 dark:text-blue-400">{t('results.danisWeber.title')}</CardTitle>
            <CardDescription>{t('results.danisWeber.description')}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className="text-3xl font-bold mb-2 cursor-help inline-flex items-center gap-2 hover:text-blue-500 transition-colors">
                  {result.danis_weber.type}
                  <Info className="h-4 w-4 text-muted-foreground" />
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 glass-card">
                <div className="space-y-2">
                  <h4 className="font-semibold">{result.danis_weber.type}</h4>
                  <p className="text-sm text-muted-foreground">{result.danis_weber.description}</p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <p className="text-muted-foreground">{result.danis_weber.description}</p>
          </CardContent>
        </Card>
      )}

      {/* AO/OTA */}
      {result.ao_ota && (
        <Card className="group relative overflow-hidden border-l-4 border-l-purple-500 glass-card card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/20 transition-colors duration-500" />
          <CardHeader className="relative">
            <CardTitle className="text-purple-600 dark:text-purple-400">{t('results.aoota.title')}</CardTitle>
            <CardDescription>{t('results.aoota.description')}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className="text-3xl font-bold mb-2 cursor-help inline-flex items-center gap-2 hover:text-purple-500 transition-colors">
                  {result.ao_ota.code}
                  <Info className="h-4 w-4 text-muted-foreground" />
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 glass-card">
                <div className="space-y-2">
                  <h4 className="font-semibold">{result.ao_ota.code}</h4>
                  <p className="text-sm text-muted-foreground">{result.ao_ota.description}</p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <p className="text-muted-foreground">{result.ao_ota.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Bartonicek */}
      {result.bartonicek && (
        <Card className="group relative overflow-hidden border-l-4 border-l-orange-500 glass-card card-hover">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-orange-500/20 transition-colors duration-500" />
          <CardHeader className="relative">
            <CardTitle className="text-orange-600 dark:text-orange-400">{t('results.bartonicek.title')}</CardTitle>
            <CardDescription>{t('results.bartonicek.description')}</CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <HoverCard>
              <HoverCardTrigger asChild>
                <p className="text-3xl font-bold mb-2 cursor-help inline-flex items-center gap-2 hover:text-orange-500 transition-colors">
                  {result.bartonicek.type}
                  <Info className="h-4 w-4 text-muted-foreground" />
                </p>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 glass-card">
                <div className="space-y-2">
                  <h4 className="font-semibold">{result.bartonicek.type}</h4>
                  <p className="text-sm text-muted-foreground">{result.bartonicek.description}</p>
                </div>
              </HoverCardContent>
            </HoverCard>
            <p className="text-muted-foreground">{result.bartonicek.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Clinical Notes */}
      {result.notes && result.notes.length > 0 && (
        <Alert>
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
