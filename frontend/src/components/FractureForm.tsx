import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import type {
  FractureInput,
  FormOptions,
  InvolvedMalleoli,
  PosteriorFractureType,
  MedialMorphology,
  FibularLevel,
  LateralMorphology,
  SuprasindesmalType,
} from '../types/fracture';
import { getFormOptions } from '../services/api';
import { useClassification } from '../hooks/useClassification';
import { ClassificationResult } from './ClassificationResult';
import { ComparisonView } from './ComparisonView';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FractureForm() {
  const { t } = useTranslation();
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [formData, setFormData] = useState<Partial<FractureInput>>({});
  const [formHistory, setFormHistory] = useState<Partial<FractureInput>[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const lastInputRef = useRef<FractureInput | null>(null);
  const { result, loading, error, scenarios, classify, addScenario, clearScenarios, reset, resetAll } = useClassification();

  useEffect(() => {
    getFormOptions().then(setOptions).catch(console.error);
  }, []);

  // Push current state to history before making changes
  const pushToHistory = useCallback(() => {
    setFormHistory(prev => [...prev, { ...formData }]);
  }, [formData]);

  // Go back to previous state
  const goBack = useCallback(() => {
    if (formHistory.length === 0) return;
    const previousState = formHistory[formHistory.length - 1];
    setFormHistory(prev => prev.slice(0, -1));
    setFormData(previousState);
  }, [formHistory]);

  // Check if we can go back
  const canGoBack = formHistory.length > 0;

  // Determinar qué preguntas mostrar según el path del diagrama de flujo
  const involvedMalleoli = formData.involved_malleoli;

  // PATH: Maléolo posterior solo
  const showPosteriorType = involvedMalleoli === 'posterior_only';

  // PATH: Maléolo medial solo
  const showMedialMorphology = involvedMalleoli === 'medial_only';

  // PATH: Maléolo lateral solo
  const showLateralLevel = involvedMalleoli === 'lateral_only';

  // PATH: Maléolo lateral solo - morfología para infrasindesmal
  const showLateralMorphologyInfra = showLateralLevel && formData.fibular_level === 'infrasindesmal';

  // PATH: Maléolo lateral solo - morfología para transindesmal
  const showLateralMorphologyTrans = showLateralLevel && formData.fibular_level === 'transindesmal';

  // PATH: Maléolo lateral solo - tipo para suprasindesmal
  const showSuprasindesmalType = showLateralLevel && formData.fibular_level === 'suprasindesmal';

  // PATH: Maleolos lateral y posterior
  const showLateralPosteriorLevel = involvedMalleoli === 'lateral_posterior';

  // PATH: Maleolos lateral y posterior - morfología para infrasindesmal
  const showLPMorphologyInfra = showLateralPosteriorLevel && formData.fibular_level === 'infrasindesmal';

  // PATH: Maleolos lateral y posterior - Transversa infrasindesmal lleva a "No posible"
  const showLPNotPossible = showLPMorphologyInfra && formData.lateral_morphology === 'transverse';

  // PATH: Maleolos lateral y posterior - pregunta de tipo posterior para oblicua infrasindesmal
  const showLPPosteriorTypeInfraOblique = showLPMorphologyInfra && formData.lateral_morphology === 'oblique';

  // PATH: Maleolos lateral y posterior - morfología para transindesmal
  const showLPMorphologyTrans = showLateralPosteriorLevel && formData.fibular_level === 'transindesmal';

  // PATH: Maleolos lateral y posterior - pregunta de tipo posterior para espiroidea transindesmal
  const showLPPosteriorTypeTransSpiral = showLPMorphologyTrans && formData.lateral_morphology === 'spiral';

  // PATH: Maleolos lateral y posterior - pregunta de tipo posterior para oblicua transindesmal
  const showLPPosteriorTypeTransOblique = showLPMorphologyTrans && formData.lateral_morphology === 'oblique';

  // PATH: Maleolos lateral y posterior - tipo para suprasindesmal
  const showLPSuprasindesmalType = showLateralPosteriorLevel && formData.fibular_level === 'suprasindesmal';

  // PATH: Maleolos lateral y posterior - pregunta de tipo posterior para suprasindesmal
  const showLPPosteriorTypeSupra = showLPSuprasindesmalType && !!formData.suprasindesmal_type;

  // PATH: Maleolos lateral y medial
  const showLMMedialMorphology = involvedMalleoli === 'lateral_medial';

  // PATH: Maleolos lateral y medial - oblicuo/vertical
  const showLMFibulaInfraTransverse = showLMMedialMorphology && formData.medial_morphology === 'oblique';

  // PATH: Maleolos lateral y medial - si No a infrasindesmal transversa, o si transverso
  const showLMFibularLevel = showLMMedialMorphology && (
    (formData.medial_morphology === 'oblique' && formData.fibula_infrasindesmal_transverse === false) ||
    formData.medial_morphology === 'transverse'
  );

  // PATH: Maleolos lateral y medial - nivel alto (suprasindesmal)
  const showLMSuprasindesmalType = showLMFibularLevel && formData.fibular_level_for_transverse === 'suprasindesmal';

  // PATH: Maleolos lateral y medial - nivel bajo - morfología
  const showLMFibularMorphology = showLMFibularLevel &&
    (formData.fibular_level_for_transverse === 'infrasindesmal' || formData.fibular_level_for_transverse === 'transindesmal');

  // PATH: Maleolos lateral y medial - nivel bajo - transversa - nivel del peroné
  const showLMTransverseFibularLevel = showLMFibularMorphology && formData.lateral_morphology === 'transverse';

  // PATH: Trimaleolar
  const showTrimaleolarFibularHeight = involvedMalleoli === 'trimaleolar';

  // PATH: Trimaleolar - alta (suprasindesmal)
  const showTrimaleolarSupraType = showTrimaleolarFibularHeight && formData.fibular_level === 'suprasindesmal';

  // PATH: Trimaleolar - baja - morfología
  const showTrimaleolarMorphology = showTrimaleolarFibularHeight &&
    (formData.fibular_level === 'infrasindesmal' || formData.fibular_level === 'transindesmal');

  // PATH: Trimaleolar - baja - transversa - nivel
  const showTrimaleolarTransverseLevel = showTrimaleolarMorphology && formData.lateral_morphology === 'transverse';

  // Helper to update form data with history tracking
  const updateFormData = useCallback((newData: Partial<FractureInput>) => {
    pushToHistory();
    setFormData(newData);
  }, [pushToHistory]);

  const handleInvolvedMalleoliChange = (value: string) => {
    updateFormData({ involved_malleoli: value as InvolvedMalleoli });
  };

  const isFormComplete = (): boolean => {
    if (!involvedMalleoli) return false;

    // PATH: Maléolo posterior solo - necesita tipo
    if (involvedMalleoli === 'posterior_only') {
      return !!formData.posterior_fracture_type;
    }

    // PATH: Maléolo medial solo - necesita morfología
    if (involvedMalleoli === 'medial_only') {
      return !!formData.medial_morphology;
    }

    // PATH: Maléolo lateral solo
    if (involvedMalleoli === 'lateral_only') {
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'infrasindesmal' || formData.fibular_level === 'transindesmal') {
        return !!formData.lateral_morphology;
      }
      if (formData.fibular_level === 'suprasindesmal') {
        return !!formData.suprasindesmal_type;
      }
    }

    // PATH: Maleolos medial y posterior - resultado directo
    if (involvedMalleoli === 'medial_posterior') {
      return true;
    }

    // PATH: Maleolos lateral y posterior
    if (involvedMalleoli === 'lateral_posterior') {
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'infrasindesmal') {
        if (!formData.lateral_morphology) return false;
        if (formData.lateral_morphology === 'transverse') return true; // No posible
        return !!formData.posterior_fracture_type;
      }
      if (formData.fibular_level === 'transindesmal') {
        if (!formData.lateral_morphology) return false;
        return !!formData.posterior_fracture_type;
      }
      if (formData.fibular_level === 'suprasindesmal') {
        if (!formData.suprasindesmal_type) return false;
        return !!formData.posterior_fracture_type;
      }
    }

    // PATH: Maleolos lateral y medial
    if (involvedMalleoli === 'lateral_medial') {
      if (!formData.medial_morphology) return false;
      if (formData.medial_morphology === 'oblique') {
        if (formData.fibula_infrasindesmal_transverse === undefined) return false;
        if (formData.fibula_infrasindesmal_transverse === true) return true;
      }
      // Transverso o No a infrasindesmal transversa
      if (!formData.fibular_level_for_transverse) return false;
      if (formData.fibular_level_for_transverse === 'suprasindesmal') {
        return !!formData.suprasindesmal_type;
      }
      // Nivel bajo
      if (!formData.lateral_morphology) return false;
      if (formData.lateral_morphology === 'transverse') {
        return !!formData.fibular_level;
      }
      return true; // Oblicua o espiroidea
    }

    // PATH: Trimaleolar
    if (involvedMalleoli === 'trimaleolar') {
      if (!formData.fibular_level) return false;
      if (formData.fibular_level === 'suprasindesmal') {
        return !!formData.suprasindesmal_type;
      }
      // Nivel bajo
      if (!formData.lateral_morphology) return false;
      if (formData.lateral_morphology === 'transverse') {
        // infrasindesmal = "No posible", transindesmal = resultado
        return !!formData.fibular_level_for_transverse;
      }
      return true; // Oblicua o espiroidea
    }

    return false;
  };

  // Get the current active question and its options for keyboard navigation
  const getCurrentQuestionContext = useCallback(() => {
    if (!options) return null;

    // Determine which question is currently active (last visible unanswered question)
    if (!involvedMalleoli) {
      return {
        options: options.involved_malleoli,
        onSelect: (value: string) => handleInvolvedMalleoliChange(value),
      };
    }

    // PATH: Maléolo posterior solo
    if (showPosteriorType && !formData.posterior_fracture_type) {
      return {
        options: options.posterior_fracture_types,
        onSelect: (value: string) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType }),
      };
    }

    // PATH: Maléolo medial solo
    if (showMedialMorphology && !formData.medial_morphology) {
      return {
        options: options.medial_morphology,
        onSelect: (value: string) => updateFormData({ ...formData, medial_morphology: value as MedialMorphology }),
      };
    }

    // PATH: Maléolo lateral solo - nivel
    if (showLateralLevel && !formData.fibular_level) {
      return {
        options: options.fibular_levels,
        onSelect: (value: string) => updateFormData({
          ...formData,
          fibular_level: value as FibularLevel,
          lateral_morphology: undefined,
          suprasindesmal_type: undefined,
        }),
      };
    }

    // PATH: Maléolo lateral solo - morfología infrasindesmal
    if (showLateralMorphologyInfra && !formData.lateral_morphology) {
      return {
        options: options.lateral_morphology.filter(o => o.value === 'transverse' || o.value === 'oblique'),
        onSelect: (value: string) => updateFormData({ ...formData, lateral_morphology: value as LateralMorphology }),
      };
    }

    // PATH: Maléolo lateral solo - morfología transindesmal
    if (showLateralMorphologyTrans && !formData.lateral_morphology) {
      return {
        options: options.lateral_morphology.filter(o => o.value === 'spiral' || o.value === 'oblique'),
        onSelect: (value: string) => updateFormData({ ...formData, lateral_morphology: value as LateralMorphology }),
      };
    }

    // PATH: Maléolo lateral solo - tipo suprasindesmal
    if (showSuprasindesmalType && !formData.suprasindesmal_type) {
      return {
        options: options.suprasindesmal_types,
        onSelect: (value: string) => updateFormData({ ...formData, suprasindesmal_type: value as SuprasindesmalType }),
      };
    }

    // PATH: Lateral y posterior - nivel
    if (showLateralPosteriorLevel && !formData.fibular_level) {
      return {
        options: options.fibular_levels,
        onSelect: (value: string) => updateFormData({
          ...formData,
          fibular_level: value as FibularLevel,
          lateral_morphology: undefined,
          suprasindesmal_type: undefined,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - morfología infrasindesmal
    if (showLPMorphologyInfra && !formData.lateral_morphology) {
      return {
        options: options.lateral_morphology.filter(o => o.value === 'transverse' || o.value === 'oblique'),
        onSelect: (value: string) => updateFormData({
          ...formData,
          lateral_morphology: value as LateralMorphology,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - tipo posterior (infrasindesmal oblicua)
    if (showLPPosteriorTypeInfraOblique && !formData.posterior_fracture_type) {
      return {
        options: options.posterior_fracture_types,
        onSelect: (value: string) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType }),
      };
    }

    // PATH: Lateral y posterior - morfología transindesmal
    if (showLPMorphologyTrans && !formData.lateral_morphology) {
      return {
        options: options.lateral_morphology.filter(o => o.value === 'spiral' || o.value === 'oblique'),
        onSelect: (value: string) => updateFormData({
          ...formData,
          lateral_morphology: value as LateralMorphology,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - tipo posterior (transindesmal)
    if ((showLPPosteriorTypeTransSpiral || showLPPosteriorTypeTransOblique) && !formData.posterior_fracture_type) {
      return {
        options: options.posterior_fracture_types,
        onSelect: (value: string) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType }),
      };
    }

    // PATH: Lateral y posterior - tipo suprasindesmal
    if (showLPSuprasindesmalType && !formData.suprasindesmal_type) {
      return {
        options: options.suprasindesmal_types,
        onSelect: (value: string) => updateFormData({
          ...formData,
          suprasindesmal_type: value as SuprasindesmalType,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - tipo posterior (suprasindesmal)
    if (showLPPosteriorTypeSupra && !formData.posterior_fracture_type) {
      return {
        options: options.posterior_fracture_types,
        onSelect: (value: string) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType }),
      };
    }

    // PATH: Lateral y medial - morfología medial
    if (showLMMedialMorphology && !formData.medial_morphology) {
      return {
        options: options.medial_morphology,
        onSelect: (value: string) => updateFormData({
          ...formData,
          medial_morphology: value as MedialMorphology,
          fibula_infrasindesmal_transverse: undefined,
          fibular_level_for_transverse: undefined,
          suprasindesmal_type: undefined,
          lateral_morphology: undefined,
          fibular_level: undefined,
        }),
      };
    }

    // PATH: Lateral y medial - pregunta infrasindesmal transversa
    if (showLMFibulaInfraTransverse && formData.fibula_infrasindesmal_transverse === undefined) {
      return {
        options: [
          { value: 'yes', label: options.labels.yes },
          { value: 'no', label: options.labels.no },
        ],
        onSelect: (value: string) => updateFormData({
          ...formData,
          fibula_infrasindesmal_transverse: value === 'yes',
          fibular_level_for_transverse: undefined,
          suprasindesmal_type: undefined,
          lateral_morphology: undefined,
          fibular_level: undefined,
        }),
      };
    }

    // PATH: Lateral y medial - nivel fibular
    if (showLMFibularLevel && !formData.fibular_level_for_transverse) {
      return {
        options: [
          { value: 'suprasindesmal', label: options.labels.high },
          { value: 'infrasindesmal', label: options.labels.low },
        ],
        onSelect: (value: string) => updateFormData({
          ...formData,
          fibular_level_for_transverse: value as FibularLevel,
          suprasindesmal_type: undefined,
          lateral_morphology: undefined,
          fibular_level: undefined,
        }),
      };
    }

    // PATH: Lateral y medial - tipo suprasindesmal
    if (showLMSuprasindesmalType && !formData.suprasindesmal_type) {
      return {
        options: options.suprasindesmal_types,
        onSelect: (value: string) => updateFormData({ ...formData, suprasindesmal_type: value as SuprasindesmalType }),
      };
    }

    // PATH: Lateral y medial - morfología fibular
    if (showLMFibularMorphology && !formData.lateral_morphology) {
      return {
        options: options.lateral_morphology,
        onSelect: (value: string) => updateFormData({
          ...formData,
          lateral_morphology: value as LateralMorphology,
          fibular_level: undefined,
        }),
      };
    }

    // PATH: Lateral y medial - nivel fibular para transversa
    if (showLMTransverseFibularLevel && !formData.fibular_level) {
      return {
        options: options.fibular_levels.filter(o => o.value === 'infrasindesmal' || o.value === 'transindesmal'),
        onSelect: (value: string) => updateFormData({ ...formData, fibular_level: value as FibularLevel }),
      };
    }

    // PATH: Trimaleolar - nivel
    if (showTrimaleolarFibularHeight && !formData.fibular_level) {
      return {
        options: [
          { value: 'suprasindesmal', label: options.labels.high },
          { value: 'infrasindesmal', label: options.labels.low },
        ],
        onSelect: (value: string) => updateFormData({
          ...formData,
          fibular_level: value as FibularLevel,
          suprasindesmal_type: undefined,
          lateral_morphology: undefined,
          fibular_level_for_transverse: undefined,
        }),
      };
    }

    // PATH: Trimaleolar - tipo suprasindesmal
    if (showTrimaleolarSupraType && !formData.suprasindesmal_type) {
      return {
        options: options.suprasindesmal_types,
        onSelect: (value: string) => updateFormData({ ...formData, suprasindesmal_type: value as SuprasindesmalType }),
      };
    }

    // PATH: Trimaleolar - morfología
    if (showTrimaleolarMorphology && !formData.lateral_morphology) {
      return {
        options: options.lateral_morphology,
        onSelect: (value: string) => updateFormData({
          ...formData,
          lateral_morphology: value as LateralMorphology,
          fibular_level_for_transverse: undefined,
        }),
      };
    }

    // PATH: Trimaleolar - nivel para transversa
    if (showTrimaleolarTransverseLevel && !formData.fibular_level_for_transverse) {
      return {
        options: options.fibular_levels.filter(o => o.value === 'infrasindesmal' || o.value === 'transindesmal'),
        onSelect: (value: string) => updateFormData({ ...formData, fibular_level_for_transverse: value as FibularLevel }),
      };
    }

    return null;
  }, [
    options, involvedMalleoli, formData, handleInvolvedMalleoliChange, updateFormData,
    showPosteriorType, showMedialMorphology, showLateralLevel, showLateralMorphologyInfra,
    showLateralMorphologyTrans, showSuprasindesmalType, showLateralPosteriorLevel,
    showLPMorphologyInfra, showLPPosteriorTypeInfraOblique, showLPMorphologyTrans,
    showLPPosteriorTypeTransSpiral, showLPPosteriorTypeTransOblique, showLPSuprasindesmalType,
    showLPPosteriorTypeSupra, showLMMedialMorphology, showLMFibulaInfraTransverse,
    showLMFibularLevel, showLMSuprasindesmalType, showLMFibularMorphology,
    showLMTransverseFibularLevel, showTrimaleolarFibularHeight, showTrimaleolarSupraType,
    showTrimaleolarMorphology, showTrimaleolarTransverseLevel,
  ]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      // Don't handle if showing results
      if (result) return;

      // Backspace to go back
      if (e.key === 'Backspace') {
        e.preventDefault();
        if (formHistory.length > 0) {
          goBack();
        }
        return;
      }

      // Enter to submit
      if (e.key === 'Enter' && isFormComplete() && !loading) {
        e.preventDefault();
        classify(formData as FractureInput);
        return;
      }

      // Number keys (1-9) to select options
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        const context = getCurrentQuestionContext();
        if (context && context.options[num - 1]) {
          e.preventDefault();
          context.onSelect(context.options[num - 1].value);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formHistory.length, goBack, result, isFormComplete, loading, classify, formData, getCurrentQuestionContext]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormComplete()) {
      const input = formData as FractureInput;
      lastInputRef.current = input;
      const classificationResult = await classify(input);

      // If comparing and we got a result, add it as a scenario
      if (isComparing && classificationResult) {
        addScenario(input, classificationResult);
        setIsComparing(false);
      }
    }
  };

  const handleReset = () => {
    setFormData({});
    setFormHistory([]);
    reset();
  };

  const handleStartComparison = () => {
    // Add current result as first scenario if not already added
    if (result && lastInputRef.current && scenarios.length === 0) {
      addScenario(lastInputRef.current, result);
    }
    // Reset form but keep scenarios
    setFormData({});
    setFormHistory([]);
    reset();
    setIsComparing(true);
  };

  const handleClearComparison = () => {
    clearScenarios();
    setIsComparing(false);
  };

  const handleStartOver = () => {
    setFormData({});
    setFormHistory([]);
    resetAll();
    setIsComparing(false);
  };

  if (!options) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-muted-foreground">{t('form.loading')}</p>
      </div>
    );
  }

  // Show comparison view when we have 2+ scenarios and NOT currently adding another
  if (scenarios.length >= 2 && !isComparing) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <ComparisonView scenarios={scenarios} />
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {scenarios.length < 3 && (
            <Button onClick={handleStartComparison} variant="outline" className="flex-1">
              {t('comparison.addAnother')}
            </Button>
          )}
          <Button onClick={handleClearComparison} variant="outline" className="flex-1">
            {t('comparison.clear')}
          </Button>
          <Button onClick={handleStartOver} className="flex-1">
            {t('comparison.startOver')}
          </Button>
        </div>
      </div>
    );
  }

  // Show single result with compare option
  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ClassificationResult result={result} />
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button onClick={handleReset} className="flex-1" size="lg">
            {t('form.classifyAnother')}
          </Button>
          <Button onClick={handleStartComparison} variant="outline" className="flex-1" size="lg">
            {t('comparison.compare')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('app.title')}</h1>
        <p className="text-muted-foreground">
          {t('app.description')}
        </p>
      </div>

      {/* Navigation buttons */}
      {canGoBack && (
        <div className="flex justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('form.back')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
          >
            {t('form.reset')}
          </Button>
        </div>
      )}

      {/* Pregunta 1: ¿Qué maléolos tiene fracturados? */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {options.questions.involved_malleoli?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.involved_malleoli || ''}
            onValueChange={handleInvolvedMalleoliChange}
          >
            {options.involved_malleoli.map((option) => (
              <div key={option.value} className="flex items-center space-x-3 py-2">
                <RadioGroupItem value={option.value} id={`malleoli-${option.value}`} />
                <Label htmlFor={`malleoli-${option.value}`} className="cursor-pointer">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* PATH: Maléolo posterior - Tipo de fractura */}
      {showPosteriorType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.posterior_fracture_type?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.posterior_fracture_type || ''}
              onValueChange={(value) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType })}
            >
              {options.posterior_fracture_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`post-type-${option.value}`} />
                  <Label htmlFor={`post-type-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maléolo medial - Morfología */}
      {showMedialMorphology && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.medial_morphology?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.medial_morphology || ''}
              onValueChange={(value) => updateFormData({ ...formData, medial_morphology: value as MedialMorphology })}
            >
              {options.medial_morphology.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`medial-morph-${option.value}`} />
                  <Label htmlFor={`medial-morph-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maléolo lateral - Nivel */}
      {showLateralLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_level?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                fibular_level: value as FibularLevel,
                lateral_morphology: undefined,
                suprasindesmal_type: undefined,
              })}
            >
              {options.fibular_levels.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lat-level-${option.value}`} />
                  <Label htmlFor={`lat-level-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maléolo lateral - Morfología para infrasindesmal */}
      {showLateralMorphologyInfra && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.lateral_morphology?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.lateral_morphology || ''}
              onValueChange={(value) => updateFormData({ ...formData, lateral_morphology: value as LateralMorphology })}
            >
              {options.lateral_morphology
                .filter(o => o.value === 'transverse' || o.value === 'oblique')
                .map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value={option.value} id={`lat-morph-infra-${option.value}`} />
                    <Label htmlFor={`lat-morph-infra-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maléolo lateral - Morfología para transindesmal */}
      {showLateralMorphologyTrans && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.lateral_morphology?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.lateral_morphology || ''}
              onValueChange={(value) => updateFormData({ ...formData, lateral_morphology: value as LateralMorphology })}
            >
              {options.lateral_morphology
                .filter(o => o.value === 'spiral' || o.value === 'oblique')
                .map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value={option.value} id={`lat-morph-trans-${option.value}`} />
                    <Label htmlFor={`lat-morph-trans-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maléolo lateral - Tipo suprasindesmal */}
      {showSuprasindesmalType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.suprasindesmal_type?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.suprasindesmal_type || ''}
              onValueChange={(value) => updateFormData({ ...formData, suprasindesmal_type: value as SuprasindesmalType })}
            >
              {options.suprasindesmal_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`supra-type-${option.value}`} />
                  <Label htmlFor={`supra-type-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos medial y posterior - Resultado directo */}
      {involvedMalleoli === 'medial_posterior' && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription>
            {t('alerts.bimaleolarMedialPosterior')}
          </AlertDescription>
        </Alert>
      )}

      {/* PATH: Maleolos lateral y posterior - Nivel */}
      {showLateralPosteriorLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_level?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                fibular_level: value as FibularLevel,
                lateral_morphology: undefined,
                suprasindesmal_type: undefined,
                posterior_fracture_type: undefined,
              })}
            >
              {options.fibular_levels.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lp-level-${option.value}`} />
                  <Label htmlFor={`lp-level-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y posterior - Infrasindesmal - Morfología */}
      {showLPMorphologyInfra && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.lateral_morphology?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.lateral_morphology || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                lateral_morphology: value as LateralMorphology,
                posterior_fracture_type: undefined,
              })}
            >
              {options.lateral_morphology
                .filter(o => o.value === 'transverse' || o.value === 'oblique')
                .map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value={option.value} id={`lp-morph-infra-${option.value}`} />
                    <Label htmlFor={`lp-morph-infra-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y posterior - Infrasindesmal - Transversa - No posible */}
      {showLPNotPossible && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription>
            {t('alerts.notPossibleSAMechanism')}
          </AlertDescription>
        </Alert>
      )}

      {/* PATH: Maleolos lateral y posterior - Infrasindesmal - Oblicua - Tipo posterior */}
      {showLPPosteriorTypeInfraOblique && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.posterior_fracture_type?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.posterior_fracture_type || ''}
              onValueChange={(value) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType })}
            >
              {options.posterior_fracture_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lp-post-infra-${option.value}`} />
                  <Label htmlFor={`lp-post-infra-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y posterior - Transindesmal - Morfología */}
      {showLPMorphologyTrans && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.lateral_morphology?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.lateral_morphology || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                lateral_morphology: value as LateralMorphology,
                posterior_fracture_type: undefined,
              })}
            >
              {options.lateral_morphology
                .filter(o => o.value === 'spiral' || o.value === 'oblique')
                .map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value={option.value} id={`lp-morph-trans-${option.value}`} />
                    <Label htmlFor={`lp-morph-trans-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y posterior - Transindesmal - Espiroidea/Oblicua - Tipo posterior */}
      {(showLPPosteriorTypeTransSpiral || showLPPosteriorTypeTransOblique) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.posterior_fracture_type?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.posterior_fracture_type || ''}
              onValueChange={(value) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType })}
            >
              {options.posterior_fracture_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lp-post-trans-${option.value}`} />
                  <Label htmlFor={`lp-post-trans-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y posterior - Suprasindesmal - Tipo */}
      {showLPSuprasindesmalType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.suprasindesmal_type?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.suprasindesmal_type || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                suprasindesmal_type: value as SuprasindesmalType,
                posterior_fracture_type: undefined,
              })}
            >
              {options.suprasindesmal_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lp-supra-${option.value}`} />
                  <Label htmlFor={`lp-supra-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y posterior - Suprasindesmal - Tipo posterior */}
      {showLPPosteriorTypeSupra && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.posterior_fracture_type?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.posterior_fracture_type || ''}
              onValueChange={(value) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType })}
            >
              {options.posterior_fracture_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lp-post-supra-${option.value}`} />
                  <Label htmlFor={`lp-post-supra-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y medial - Morfología del medial */}
      {showLMMedialMorphology && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.medial_morphology_lm?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.medial_morphology || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                medial_morphology: value as MedialMorphology,
                fibula_infrasindesmal_transverse: undefined,
                fibular_level_for_transverse: undefined,
                suprasindesmal_type: undefined,
                lateral_morphology: undefined,
                fibular_level: undefined,
              })}
            >
              {options.medial_morphology.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lm-medial-${option.value}`} />
                  <Label htmlFor={`lm-medial-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y medial - Oblicuo - ¿Peroné infrasindesmal y transversa? */}
      {showLMFibulaInfraTransverse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibula_infrasindesmal_transverse?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibula_infrasindesmal_transverse === undefined ? '' : formData.fibula_infrasindesmal_transverse ? 'yes' : 'no'}
              onValueChange={(value) => updateFormData({
                ...formData,
                fibula_infrasindesmal_transverse: value === 'yes',
                fibular_level_for_transverse: undefined,
                suprasindesmal_type: undefined,
                lateral_morphology: undefined,
                fibular_level: undefined,
              })}
            >
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="yes" id="lm-infra-trans-yes" />
                <Label htmlFor="lm-infra-trans-yes" className="cursor-pointer">{options.labels.yes}</Label>
              </div>
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="no" id="lm-infra-trans-no" />
                <Label htmlFor="lm-infra-trans-no" className="cursor-pointer">{options.labels.no}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y medial - Nivel del peroné */}
      {showLMFibularLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_level_lm?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level_for_transverse || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                fibular_level_for_transverse: value as FibularLevel,
                suprasindesmal_type: undefined,
                lateral_morphology: undefined,
                fibular_level: undefined,
              })}
            >
              {options.fibular_levels
                .filter(o => o.value === 'suprasindesmal' || o.value === 'infrasindesmal' || o.value === 'transindesmal')
                .map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value={option.value} id={`lm-fib-level-${option.value}`} />
                    <Label htmlFor={`lm-fib-level-${option.value}`} className="cursor-pointer">
                      {option.value === 'suprasindesmal' ? options.labels.high : options.labels.low}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y medial - Suprasindesmal - Tipo */}
      {showLMSuprasindesmalType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.suprasindesmal_type?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.suprasindesmal_type || ''}
              onValueChange={(value) => updateFormData({ ...formData, suprasindesmal_type: value as SuprasindesmalType })}
            >
              {options.suprasindesmal_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lm-supra-${option.value}`} />
                  <Label htmlFor={`lm-supra-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y medial - Nivel bajo - Morfología */}
      {showLMFibularMorphology && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.lateral_morphology?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.lateral_morphology || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                lateral_morphology: value as LateralMorphology,
                fibular_level: undefined,
              })}
            >
              {options.lateral_morphology.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lm-morph-${option.value}`} />
                  <Label htmlFor={`lm-morph-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Maleolos lateral y medial - Transversa - Nivel del peroné */}
      {showLMTransverseFibularLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_level?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level || ''}
              onValueChange={(value) => updateFormData({ ...formData, fibular_level: value as FibularLevel })}
            >
              {options.fibular_levels
                .filter(o => o.value === 'infrasindesmal' || o.value === 'transindesmal')
                .map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value={option.value} id={`lm-trans-level-${option.value}`} />
                    <Label htmlFor={`lm-trans-level-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Trimaleolar - Nivel del peroné (Alta/Baja) */}
      {showTrimaleolarFibularHeight && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_level_tri?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                fibular_level: value as FibularLevel,
                suprasindesmal_type: undefined,
                lateral_morphology: undefined,
                fibular_level_for_transverse: undefined,
              })}
            >
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="suprasindesmal" id="tri-level-high" />
                <Label htmlFor="tri-level-high" className="cursor-pointer">{options.labels.high}</Label>
              </div>
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="infrasindesmal" id="tri-level-low" />
                <Label htmlFor="tri-level-low" className="cursor-pointer">{options.labels.low}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Trimaleolar - Suprasindesmal - Tipo */}
      {showTrimaleolarSupraType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.suprasindesmal_type?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.suprasindesmal_type || ''}
              onValueChange={(value) => updateFormData({ ...formData, suprasindesmal_type: value as SuprasindesmalType })}
            >
              {options.suprasindesmal_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`tri-supra-${option.value}`} />
                  <Label htmlFor={`tri-supra-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Trimaleolar - Baja - Morfología */}
      {showTrimaleolarMorphology && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.lateral_morphology?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.lateral_morphology || ''}
              onValueChange={(value) => updateFormData({
                ...formData,
                lateral_morphology: value as LateralMorphology,
                fibular_level_for_transverse: undefined,
              })}
            >
              {options.lateral_morphology.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`tri-morph-${option.value}`} />
                  <Label htmlFor={`tri-morph-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* PATH: Trimaleolar - Baja - Transversa - Nivel */}
      {showTrimaleolarTransverseLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_level?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level_for_transverse || ''}
              onValueChange={(value) => updateFormData({ ...formData, fibular_level_for_transverse: value as FibularLevel })}
            >
              {options.fibular_levels
                .filter(o => o.value === 'infrasindesmal' || o.value === 'transindesmal')
                .map((option) => (
                  <div key={option.value} className="flex items-center space-x-3 py-2">
                    <RadioGroupItem value={option.value} id={`tri-trans-level-${option.value}`} />
                    <Label htmlFor={`tri-trans-level-${option.value}`} className="cursor-pointer">
                      {option.label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Resultado: Trimaleolar - Baja - Transversa - Infrasindesmal - No posible */}
      {showTrimaleolarTransverseLevel && formData.fibular_level_for_transverse === 'infrasindesmal' && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription>
            {t('alerts.notPossibleExceptional')}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={!isFormComplete() || loading} className="w-full" size="lg">
        {loading ? t('form.classifying') : t('form.classify')}
      </Button>

      {/* Keyboard shortcuts hint */}
      <p className="text-xs text-muted-foreground text-center">
        {t('form.keyboardHint')}
      </p>
    </form>
  );
}
