import { useTranslation } from 'react-i18next';
import type { ComparisonScenario } from '../types/fracture';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ComparisonViewProps {
  scenarios: ComparisonScenario[];
}

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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">{t('results.title')}</h2>

      {/* Scenario headers */}
      <div className={`grid gap-4 ${scenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {scenarios.map((scenario, index) => (
          <Card key={scenario.id} className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t('comparison.scenario')} {String.fromCharCode(65 + index)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {scenario.result.fracture_description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lauge-Hansen comparison */}
      {scenarios.some(s => s.result.lauge_hansen) && (
        <Card className={`border-l-4 border-l-green-500 ${lhDifferent ? 'ring-2 ring-green-200' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700 text-lg">{t('results.laugeHansen.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${scenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="text-center">
                  <p className={`text-2xl font-bold ${lhDifferent ? 'text-green-700' : ''}`}>
                    {scenario.result.lauge_hansen?.type || '-'}
                  </p>
                  {scenario.result.lauge_hansen?.full_name && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {scenario.result.lauge_hansen.full_name}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danis-Weber comparison */}
      {scenarios.some(s => s.result.danis_weber) && (
        <Card className={`border-l-4 border-l-blue-500 ${dwDifferent ? 'ring-2 ring-blue-200' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-blue-700 text-lg">{t('results.danisWeber.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${scenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="text-center">
                  <p className={`text-2xl font-bold ${dwDifferent ? 'text-blue-700' : ''}`}>
                    {scenario.result.danis_weber?.type || '-'}
                  </p>
                  {scenario.result.danis_weber?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {scenario.result.danis_weber.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AO/OTA comparison */}
      {scenarios.some(s => s.result.ao_ota) && (
        <Card className={`border-l-4 border-l-purple-500 ${aoDifferent ? 'ring-2 ring-purple-200' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-700 text-lg">{t('results.aoota.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${scenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="text-center">
                  <p className={`text-2xl font-bold ${aoDifferent ? 'text-purple-700' : ''}`}>
                    {scenario.result.ao_ota?.code || '-'}
                  </p>
                  {scenario.result.ao_ota?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {scenario.result.ao_ota.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bartonicek comparison */}
      {scenarios.some(s => s.result.bartonicek) && (
        <Card className={`border-l-4 border-l-orange-500 ${bartDifferent ? 'ring-2 ring-orange-200' : ''}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-orange-700 text-lg">{t('results.bartonicek.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-4 ${scenarios.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="text-center">
                  <p className={`text-2xl font-bold ${bartDifferent ? 'text-orange-700' : ''}`}>
                    {scenario.result.bartonicek?.type || '-'}
                  </p>
                  {scenario.result.bartonicek?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {scenario.result.bartonicek.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
