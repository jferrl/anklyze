import { useTranslation } from 'react-i18next';
import type { ClassificationResult as Result } from '../types/fracture';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-green-700">{t('results.laugeHansen.title')}</CardTitle>
            <CardDescription>{t('results.laugeHansen.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-1">{result.lauge_hansen.type}</p>
            <p className="text-lg mb-2">{result.lauge_hansen.full_name}</p>
            <p className="text-muted-foreground">{result.lauge_hansen.description}</p>
            {result.lauge_hansen.ambiguous && result.lauge_hansen.possible_types && (
              <p className="text-sm text-orange-600 mt-2">
                {t('results.possibleTypes')}: {result.lauge_hansen.possible_types.join(', ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danis-Weber */}
      {result.danis_weber && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-blue-700">{t('results.danisWeber.title')}</CardTitle>
            <CardDescription>{t('results.danisWeber.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{result.danis_weber.type}</p>
            <p className="text-muted-foreground">{result.danis_weber.description}</p>
          </CardContent>
        </Card>
      )}

      {/* AO/OTA */}
      {result.ao_ota && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="text-purple-700">{t('results.aoota.title')}</CardTitle>
            <CardDescription>{t('results.aoota.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{result.ao_ota.code}</p>
            <p className="text-muted-foreground">{result.ao_ota.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Bartonicek */}
      {result.bartonicek && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader>
            <CardTitle className="text-orange-700">{t('results.bartonicek.title')}</CardTitle>
            <CardDescription>{t('results.bartonicek.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{result.bartonicek.type}</p>
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
