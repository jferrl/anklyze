import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Loader2 } from 'lucide-react';
import type {
  FractureInput,
  FormOptions,
  ClassificationResult,
  InvolvedMalleoli,
  PosteriorFractureType,
  MedialMorphology,
  FibularLevel,
  LateralMorphology,
  SuprasindesmalType,
  FibulaTracePattern,
} from '../../types/fracture';
import { getFormOptions } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface StudyClassificationFormProps {
  hasTACImages: boolean;
  onClassify: (input: FractureInput) => Promise<ClassificationResult>;
}

export function StudyClassificationForm({ hasTACImages, onClassify }: StudyClassificationFormProps) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [formData, setFormData] = useState<Partial<FractureInput>>(() => {
    // Auto-set has_ct_scan if study has TAC images
    if (hasTACImages) {
      return { has_ct_scan: true };
    }
    return {};
  });
  const [formHistory, setFormHistory] = useState<Partial<FractureInput>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const canGoBack = formHistory.length > 0;

  // Update form data helper
  const updateFormData = useCallback((newData: Partial<FractureInput>) => {
    pushToHistory();
    setFormData(newData);
  }, [pushToHistory]);

  // Determine which questions to show
  const involvedMalleoli = formData.involved_malleoli;

  // PATH: Posterior only - CT scan question (auto-answered if TAC images)
  const showPosteriorHasCTScan = involvedMalleoli === 'posterior_only' && !hasTACImages;
  const showPosteriorType = involvedMalleoli === 'posterior_only' && formData.has_ct_scan === true;

  // PATH: Medial only
  const showMedialMorphology = involvedMalleoli === 'medial_only';

  // PATH: Lateral only
  const showLateralLevel = involvedMalleoli === 'lateral_only';
  const showLateralMorphologyTrans = showLateralLevel && formData.fibular_level === 'transindesmal';
  const showSuprasindesmalType = showLateralLevel && formData.fibular_level === 'suprasindesmal';
  const showLateralFibulaTracePattern = showSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');

  // PATH: Lateral + Posterior
  const showLateralPosteriorLevel = involvedMalleoli === 'lateral_posterior';
  const showLPMorphologyTrans = showLateralPosteriorLevel && formData.fibular_level === 'transindesmal';
  const showLPHasCTScanTransSpiral = showLPMorphologyTrans && formData.lateral_morphology === 'spiral' && !hasTACImages;
  const showLPPosteriorTypeTransSpiral = showLPMorphologyTrans && formData.lateral_morphology === 'spiral' && formData.has_ct_scan === true;
  const showLPHasCTScanTransOblique = showLPMorphologyTrans && formData.lateral_morphology === 'oblique' && !hasTACImages;
  const showLPPosteriorTypeTransOblique = showLPMorphologyTrans && formData.lateral_morphology === 'oblique' && formData.has_ct_scan === true;
  const showLPSuprasindesmalType = showLateralPosteriorLevel && formData.fibular_level === 'suprasindesmal';
  const showLPFibulaTracePattern = showLPSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
  const showLPHasCTScanSupra = (showLPFibulaTracePattern ||
    (showLPSuprasindesmalType && formData.suprasindesmal_type === 'proximal')) && !hasTACImages;
  const showLPPosteriorTypeSupra = (showLPFibulaTracePattern ||
    (showLPSuprasindesmalType && formData.suprasindesmal_type === 'proximal')) && formData.has_ct_scan === true;

  // PATH: Lateral + Medial
  const showLMMedialMorphology = involvedMalleoli === 'lateral_medial';
  const showLMFibulaInfraTransverse = showLMMedialMorphology && formData.medial_morphology === 'oblique';
  const showLMFibularLevel = showLMMedialMorphology && (
    (formData.medial_morphology === 'oblique' && formData.fibula_infrasindesmal_transverse === false) ||
    formData.medial_morphology === 'transverse'
  );
  const showLMSuprasindesmalType = showLMFibularLevel && formData.fibular_level_for_transverse === 'suprasindesmal';
  const showLMFibulaTracePattern = showLMSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
  const showLMFibularMorphology = showLMFibularLevel &&
    (formData.fibular_level_for_transverse === 'infrasindesmal' || formData.fibular_level_for_transverse === 'transindesmal');

  // PATH: Medial + Posterior
  const showMedialPosteriorMorphology = involvedMalleoli === 'medial_posterior';
  const showMPHasCTScan = showMedialPosteriorMorphology && !hasTACImages;
  const showMPPosteriorType = showMedialPosteriorMorphology && formData.has_ct_scan === true;

  // PATH: Trimaleolar
  const showTrimaleolarFibularHeight = involvedMalleoli === 'trimaleolar';
  const showTrimaleolarSupraType = showTrimaleolarFibularHeight && formData.fibular_level === 'suprasindesmal';
  const showTriFibulaTracePattern = showTrimaleolarSupraType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');
  const showTriHasCTScan = (showTriFibulaTracePattern ||
    (showTrimaleolarSupraType && formData.suprasindesmal_type === 'proximal') ||
    (showTrimaleolarFibularHeight && (formData.fibular_level === 'infrasindesmal' || formData.fibular_level === 'transindesmal'))) && !hasTACImages;
  const showTriPosteriorType = showTriHasCTScan === false && showTrimaleolarFibularHeight && formData.has_ct_scan === true;
  const showTriLateralMorphologyTrans = showTrimaleolarFibularHeight && formData.fibular_level === 'transindesmal';
  const showTriLateralMorphologyTransComplete = showTriLateralMorphologyTrans && (formData.has_ct_scan === true || hasTACImages);

  // Check if form is complete
  const isFormComplete = useCallback((): boolean => {
    if (!involvedMalleoli) return false;

    // Simplified completion check based on path
    switch (involvedMalleoli) {
      case 'posterior_only':
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return true;
        return !!formData.posterior_fracture_type;

      case 'medial_only':
        return !!formData.medial_morphology;

      case 'lateral_only':
        if (!formData.fibular_level) return false;
        if (formData.fibular_level === 'infrasindesmal') return true;
        if (formData.fibular_level === 'transindesmal') return !!formData.lateral_morphology;
        if (formData.fibular_level === 'suprasindesmal') {
          if (!formData.suprasindesmal_type) return false;
          if (formData.suprasindesmal_type === 'proximal') return true;
          return !!formData.fibula_trace_pattern;
        }
        return false;

      case 'medial_posterior':
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return !!formData.medial_morphology;
        return !!formData.medial_morphology && !!formData.posterior_fracture_type;

      case 'lateral_posterior':
        if (!formData.fibular_level) return false;
        // Continue with path-specific logic...
        return true; // Simplified for now

      case 'lateral_medial':
        if (!formData.medial_morphology) return false;
        // Continue with path-specific logic...
        return true; // Simplified for now

      case 'trimaleolar':
        if (!formData.fibular_level) return false;
        // Continue with path-specific logic...
        return true; // Simplified for now

      default:
        return false;
    }
  }, [involvedMalleoli, formData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormComplete()) return;

    setLoading(true);
    setError(null);

    try {
      await onClassify(formData as FractureInput);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Classification failed');
    } finally {
      setLoading(false);
    }
  };

  if (!options) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Auto CT-scan indicator */}
      {hasTACImages && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <Badge variant="secondary">TAC</Badge>
            {t('studies.ctScanAutoDetected')}
          </AlertDescription>
        </Alert>
      )}

      {/* Back button */}
      {canGoBack && (
        <Button type="button" variant="ghost" size="sm" onClick={goBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t('form.back')}
        </Button>
      )}

      {/* Question 1: Involved Malleoli */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {options.questions.involved_malleoli?.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.involved_malleoli || ''}
            onValueChange={(value) => updateFormData({
              involved_malleoli: value as InvolvedMalleoli,
              ...(hasTACImages ? { has_ct_scan: true } : {})
            })}
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

      {/* CT Scan question (only if not auto-set from TAC images) */}
      {(showPosteriorHasCTScan || showMPHasCTScan || showLPHasCTScanTransSpiral ||
        showLPHasCTScanTransOblique || showLPHasCTScanSupra || showTriHasCTScan) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.has_ct_scan?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.has_ct_scan === undefined ? '' : formData.has_ct_scan ? 'yes' : 'no'}
              onValueChange={(value) => updateFormData({ ...formData, has_ct_scan: value === 'yes' })}
            >
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="yes" id="ct-yes" />
                <Label htmlFor="ct-yes" className="cursor-pointer">{options.labels.yes}</Label>
              </div>
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="no" id="ct-no" />
                <Label htmlFor="ct-no" className="cursor-pointer">{options.labels.no}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Posterior Fracture Type */}
      {(showPosteriorType || showMPPosteriorType || showLPPosteriorTypeTransSpiral ||
        showLPPosteriorTypeTransOblique || showLPPosteriorTypeSupra || showTriPosteriorType) && (
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
                  <RadioGroupItem value={option.value} id={`post-${option.value}`} />
                  <Label htmlFor={`post-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Medial Morphology */}
      {(showMedialMorphology || showMedialPosteriorMorphology || showLMMedialMorphology) && (
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
                  <RadioGroupItem value={option.value} id={`medial-${option.value}`} />
                  <Label htmlFor={`medial-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Fibular Level */}
      {(showLateralLevel || showLateralPosteriorLevel || showTrimaleolarFibularHeight) && (
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
              {options.fibular_levels.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`fibular-${option.value}`} />
                  <Label htmlFor={`fibular-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Lateral Morphology */}
      {(showLateralMorphologyTrans || showLPMorphologyTrans || showTriLateralMorphologyTransComplete || showLMFibularMorphology) && (
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
              {options.lateral_morphology.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lateral-${option.value}`} />
                  <Label htmlFor={`lateral-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Suprasindesmal Type */}
      {(showSuprasindesmalType || showLPSuprasindesmalType || showTrimaleolarSupraType || showLMSuprasindesmalType) && (
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
                  <RadioGroupItem value={option.value} id={`supra-${option.value}`} />
                  <Label htmlFor={`supra-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Fibula Trace Pattern */}
      {(showLateralFibulaTracePattern || showLPFibulaTracePattern || showTriFibulaTracePattern || showLMFibulaTracePattern) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibula_trace_pattern?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibula_trace_pattern || ''}
              onValueChange={(value) => updateFormData({ ...formData, fibula_trace_pattern: value as FibulaTracePattern })}
            >
              {options.fibula_trace_patterns.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`trace-${option.value}`} />
                  <Label htmlFor={`trace-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Fibula Infrasindesmal Transverse (for lateral+medial path) */}
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
              onValueChange={(value) => updateFormData({ ...formData, fibula_infrasindesmal_transverse: value === 'yes' })}
            >
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="yes" id="infra-trans-yes" />
                <Label htmlFor="infra-trans-yes" className="cursor-pointer">{options.labels.yes}</Label>
              </div>
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="no" id="infra-trans-no" />
                <Label htmlFor="infra-trans-no" className="cursor-pointer">{options.labels.no}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Fibular Level for Transverse (lateral+medial path) */}
      {showLMFibularLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_level_lm?.title || options.questions.fibular_level?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level_for_transverse || ''}
              onValueChange={(value) => updateFormData({ ...formData, fibular_level_for_transverse: value as FibularLevel })}
            >
              {options.fibular_levels.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`fibular-trans-${option.value}`} />
                  <Label htmlFor={`fibular-trans-${option.value}`} className="cursor-pointer">
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

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        disabled={!isFormComplete() || loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : null}
        {t('form.classify')}
      </Button>
    </form>
  );
}
