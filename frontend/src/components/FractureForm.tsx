import { useState, useEffect, useMemo } from 'react';
import type {
  FractureInput,
  FormOptions,
  MedialMorphology,
  FibularLevel,
  FibularMorphology,
  SERFragment,
  FractureInvolvement,
  WeberCFractureType,
} from '../types/fracture';
import { getFormOptions } from '../services/api';
import { useClassification } from '../hooks/useClassification';
import { ClassificationResult } from './ClassificationResult';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FractureForm() {
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [formData, setFormData] = useState<Partial<FractureInput>>({});
  const { result, loading, error, classify, reset } = useClassification();

  useEffect(() => {
    getFormOptions().then(setOptions).catch(console.error);
  }, []);

  // Track if this is an isolated lateral fracture (no medial involvement)
  const isIsolatedLateral = formData.medial_morphology === 'none';

  // Determine which questions to show based on previous answers
  // Show Q2 for 'none' (isolated lateral) or 'transverse'
  const showQuestion2 = formData.medial_morphology === 'transverse' || formData.medial_morphology === 'none';
  const showQuestion3 =
    showQuestion2 &&
    formData.fibular_level !== undefined &&
    formData.fibular_level !== 'suprasindesmal_high';

  // Determine if classification will be SER to show question 4
  // Only for transverse medial morphology (not for 'none')
  const willBeSER = useMemo(() => {
    if (formData.medial_morphology === 'transverse' &&
        formData.fibular_level !== 'suprasindesmal_high' &&
        formData.fibular_morphology === 'spiral') {
      return true;
    }
    return false;
  }, [formData.medial_morphology, formData.fibular_level, formData.fibular_morphology]);

  // Q4 only shows for transverse with SER (not for isolated lateral)
  const showQuestion4 = showQuestion3 && formData.fibular_morphology !== undefined && willBeSER && !isIsolatedLateral;

  // Determine Weber type based on current answers (for Q5 display)
  const weberType = useMemo(() => {
    if (formData.medial_morphology === 'oblique') {
      return 'A';
    }
    // For 'none' (isolated lateral), determine Weber based on fibular level/morphology
    if (formData.medial_morphology === 'none') {
      if (formData.fibular_level === 'suprasindesmal_high') {
        return 'C';
      }
      if (formData.fibular_morphology === 'transverse') {
        return 'A';
      }
      if (formData.fibular_morphology === 'transverse_oblique' || formData.fibular_morphology === 'spiral') {
        return 'B';
      }
    }
    if (formData.medial_morphology === 'transverse') {
      if (formData.fibular_level === 'suprasindesmal_high') {
        return 'C';
      }
      if (formData.fibular_morphology === 'transverse') {
        return 'A';
      }
      if (formData.fibular_morphology === 'transverse_oblique' || formData.fibular_morphology === 'spiral') {
        return 'B';
      }
    }
    return null;
  }, [formData.medial_morphology, formData.fibular_level, formData.fibular_morphology]);

  // Show Q5 when we know the Weber type and previous questions are answered
  // Q5 is NOT shown for isolated lateral ('none') - AO/OTA is always A1/B1/C1
  const showQuestion5 = useMemo(() => {
    if (!weberType) return false;

    // Never show Q5 for isolated lateral - it's always "aislada lateral"
    if (isIsolatedLateral) return false;

    // For oblique (SA/Weber A), show Q5 immediately after Q1
    if (formData.medial_morphology === 'oblique') {
      return true;
    }

    // For Weber C (suprasindesmal high), show Q5 after Q2
    if (formData.fibular_level === 'suprasindesmal_high') {
      return true;
    }

    // For other cases, show Q5 after Q3 (and Q4 if SER)
    if (formData.fibular_morphology) {
      // If SER, wait for Q4 to be answered
      if (willBeSER) {
        return formData.ser_fragment !== undefined;
      }
      return true;
    }

    return false;
  }, [formData.medial_morphology, formData.fibular_level, formData.fibular_morphology, formData.ser_fragment, weberType, willBeSER, isIsolatedLateral]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormComplete()) {
      await classify(formData as FractureInput);
    }
  };

  const isFormComplete = () => {
    // Question 1 always required
    if (!formData.medial_morphology) return false;

    // If medial is oblique, classification is SA (Weber A) - need Q5 for AO/OTA
    if (formData.medial_morphology === 'oblique') {
      return formData.fracture_involvement !== undefined;
    }

    // If isolated lateral (no medial fracture)
    if (isIsolatedLateral) {
      // Q2 required
      if (!formData.fibular_level) return false;

      // If suprasindesmal high → Weber C/C1, complete
      if (formData.fibular_level === 'suprasindesmal_high') return true;

      // Q3 required for Weber A/B
      if (!formData.fibular_morphology) return false;

      // Complete - AO/OTA is automatically A1/B1
      return true;
    }

    // Question 2 required (transverse)
    if (!formData.fibular_level) return false;

    // If suprasindesmal high, classification is PER (Weber C) - need Q5 for AO/OTA
    if (formData.fibular_level === 'suprasindesmal_high') {
      return formData.weber_c_fracture_type !== undefined;
    }

    // Question 3 required
    if (!formData.fibular_morphology) return false;

    // If will be SER, question 4 is required
    if (willBeSER && !formData.ser_fragment) return false;

    // Q5 required for AO/OTA classification
    if (weberType === 'A' || weberType === 'B') {
      return formData.fracture_involvement !== undefined;
    }

    return true;
  };

  const handleReset = () => {
    setFormData({});
    reset();
  };

  // Reset dependent fields when parent changes
  const handleMedialMorphologyChange = (value: MedialMorphology) => {
    setFormData({ medial_morphology: value });
  };

  const handleFibularLevelChange = (value: FibularLevel) => {
    setFormData({
      ...formData,
      fibular_level: value,
      fibular_morphology: undefined,
      ser_fragment: undefined,
      fracture_involvement: undefined,
      weber_c_fracture_type: undefined,
    });
  };

  const handleFibularMorphologyChange = (value: FibularMorphology) => {
    setFormData({
      ...formData,
      fibular_morphology: value,
      ser_fragment: undefined,
      fracture_involvement: undefined,
    });
  };

  const handleSERFragmentChange = (value: SERFragment) => {
    setFormData({
      ...formData,
      ser_fragment: value,
      fracture_involvement: undefined,
    });
  };

  if (!options) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ClassificationResult result={result} />
        <Button onClick={handleReset} className="mt-6 w-full" size="lg">
          Clasificar Otra Fractura
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Clasificación de Fracturas de Tobillo</h1>
        <p className="text-muted-foreground">
          Responda las preguntas para obtener la clasificación Danis-Weber, Lauge-Hansen y AO/OTA
        </p>
      </div>

      {/* Question 1: Medial Malleolus Morphology */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            1. ¿Cuál es la morfología del maléolo medial?
          </CardTitle>
          <CardDescription>
            La morfología indica el mecanismo de lesión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.medial_morphology || ''}
            onValueChange={(value) => handleMedialMorphologyChange(value as MedialMorphology)}
          >
            {options.medial_morphology.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 py-2">
                <RadioGroupItem value={option.value} id={`medial-${option.value}`} />
                <Label htmlFor={`medial-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {formData.medial_morphology === 'none' && (
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <AlertDescription>
                Sin fractura del maléolo medial → <strong>Fractura aislada lateral</strong>
                <br />
                <span className="text-sm text-muted-foreground">La clasificación AO/OTA será A1, B1 o C1 según el nivel del peroné.</span>
              </AlertDescription>
            </Alert>
          )}
          {formData.medial_morphology === 'oblique' && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription>
                Fractura oblicua/vertical indica mecanismo de "push-off" → <strong>SA / Weber A</strong>
                <br />
                <span className="text-sm text-muted-foreground">Responda la pregunta 5 para completar la clasificación AO/OTA.</span>
              </AlertDescription>
            </Alert>
          )}
          {formData.medial_morphology === 'transverse' && (
            <Alert className="mt-4">
              <AlertDescription>
                Fractura transversal indica mecanismo de avulsión "pull-off" → <strong>SER/PER/PA</strong>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Question 2: Fibular Fracture Level */}
      {showQuestion2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              2. ¿Cuál es el nivel de la fractura del peroné?
            </CardTitle>
            <CardDescription>
              La altura de la fractura respecto a la sindesmosis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level || ''}
              onValueChange={(value) => handleFibularLevelChange(value as FibularLevel)}
            >
              {options.fibular_levels.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`fibular-level-${option.value}`} />
                  <Label htmlFor={`fibular-level-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {formData.fibular_level === 'suprasindesmal_high' && (
              <Alert className="mt-4">
                <AlertDescription>
                  Fractura alta del peroné (+6cm) → <strong>PER / Weber C</strong>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question 3: Fibular Morphology */}
      {showQuestion3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              3. ¿Cuál es la morfología del maléolo peroneo?
            </CardTitle>
            <CardDescription>
              El patrón de fractura ayuda a determinar el mecanismo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_morphology || ''}
              onValueChange={(value) => handleFibularMorphologyChange(value as FibularMorphology)}
            >
              {options.fibular_morphology.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`fibular-morph-${option.value}`} />
                  <Label htmlFor={`fibular-morph-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {formData.fibular_morphology === 'transverse' && (
              <Alert className="mt-4">
                <AlertDescription>
                  Fractura transversa → <strong>SA / Weber A</strong>
                </AlertDescription>
              </Alert>
            )}
            {formData.fibular_morphology === 'transverse_oblique' && (
              <Alert className="mt-4">
                <AlertDescription>
                  Fractura transversa/oblicua (baja medial, alta lateral) → <strong>PA</strong>
                </AlertDescription>
              </Alert>
            )}
            {formData.fibular_morphology === 'spiral' && (
              <Alert className="mt-4">
                <AlertDescription>
                  Fractura espiroidea (baja anterior, alta posterior) → <strong>SER / Weber B</strong>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Question 4: SER Fragments (only for SER fractures) */}
      {showQuestion4 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              4. ¿Tiene otros fragmentos?
            </CardTitle>
            <CardDescription>
              Fragmentos adicionales asociados a fracturas SER
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.ser_fragment || ''}
              onValueChange={(value) => handleSERFragmentChange(value as SERFragment)}
            >
              {options.ser_fragments.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`fragment-${option.value}`} />
                  <Label htmlFor={`fragment-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Question 5a: Fracture Involvement (for Weber A/B) */}
      {showQuestion5 && weberType !== 'C' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              5. ¿Es una fractura...?
            </CardTitle>
            <CardDescription>
              Para clasificación AO/OTA (Weber {weberType})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fracture_involvement || ''}
              onValueChange={(value) => setFormData({ ...formData, fracture_involvement: value as FractureInvolvement })}
            >
              {options.fracture_involvement.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`involvement-${option.value}`} />
                  <Label htmlFor={`involvement-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Question 5b: Weber C Fracture Type (for Weber C) */}
      {showQuestion5 && weberType === 'C' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              5. ¿Es una fractura...?
            </CardTitle>
            <CardDescription>
              Para clasificación AO/OTA (Weber C)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.weber_c_fracture_type || ''}
              onValueChange={(value) => setFormData({ ...formData, weber_c_fracture_type: value as WeberCFractureType })}
            >
              {options.weber_c_fracture_type.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`weber-c-${option.value}`} />
                  <Label htmlFor={`weber-c-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={!isFormComplete() || loading} className="w-full" size="lg">
        {loading ? 'Clasificando...' : 'Clasificar Fractura'}
      </Button>
    </form>
  );
}
