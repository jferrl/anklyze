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
  const hasAnyClassification = result.lauge_hansen || result.danis_weber || result.ao_ota || result.bartonicek;

  if (!hasAnyClassification) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Resultados de la Clasificación</h2>
        <Alert>
          <AlertDescription>No se pudo determinar la clasificación con los datos proporcionados.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Resultados de la Clasificación</h2>

      {/* Lauge-Hansen */}
      {result.lauge_hansen && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-green-700">Clasificación Lauge-Hansen</CardTitle>
            <CardDescription>Basada en el mecanismo de lesión</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-1">{result.lauge_hansen.type}</p>
            <p className="text-lg mb-2">{result.lauge_hansen.full_name}</p>
            <p className="text-muted-foreground">{result.lauge_hansen.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Danis-Weber */}
      {result.danis_weber && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-blue-700">Clasificación Danis-Weber</CardTitle>
            <CardDescription>Basada en la localización de la fractura del peroné</CardDescription>
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
            <CardTitle className="text-purple-700">Clasificación AO/OTA</CardTitle>
            <CardDescription>Sistema de clasificación alfanumérico internacional</CardDescription>
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
            <CardTitle className="text-orange-700">Clasificación Bartonicek</CardTitle>
            <CardDescription>Clasificación del maléolo posterior</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold mb-2">{result.bartonicek.type.replace('type_', 'Tipo ')}</p>
            <p className="text-muted-foreground">{result.bartonicek.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Clinical Notes */}
      {result.notes && result.notes.length > 0 && (
        <Alert>
          <AlertTitle>Notas Clínicas</AlertTitle>
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
