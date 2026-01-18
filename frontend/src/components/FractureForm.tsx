import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FractureInput,
  FormOptions,
  MedialMorphology,
  FibularLevel,
  FibularMorphology,
  WeberCFractureType,
  InvolvedMalleoli,
  BartonicekType,
} from '../types/fracture';
import { getFormOptions } from '../services/api';
import { useClassification } from '../hooks/useClassification';
import { ClassificationResult } from './ClassificationResult';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function FractureForm() {
  const { t } = useTranslation();
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [formData, setFormData] = useState<Partial<FractureInput>>({
    has_medial_fracture: false,
    has_lateral_fracture: false,
    has_posterior_fracture: false,
  });
  const { result, loading, error, classify, reset } = useClassification();

  useEffect(() => {
    getFormOptions().then(setOptions).catch(console.error);
  }, []);

  // Determine the current path based on selected malleoli
  const currentPath = useMemo(() => {
    const { has_medial_fracture, has_lateral_fracture, has_posterior_fracture } = formData;

    if (!has_medial_fracture && !has_lateral_fracture && has_posterior_fracture) {
      return 'posterior_only';
    }
    if (has_medial_fracture && !has_lateral_fracture && !has_posterior_fracture) {
      return 'medial_only';
    }
    if (has_medial_fracture && !has_lateral_fracture && has_posterior_fracture) {
      return 'medial_posterior';
    }
    if (!has_medial_fracture && has_lateral_fracture && !has_posterior_fracture) {
      return 'lateral_only';
    }
    if (!has_medial_fracture && has_lateral_fracture && has_posterior_fracture) {
      return 'lateral_posterior';
    }
    if (has_medial_fracture && has_lateral_fracture) {
      return 'complex'; // medial + lateral (± posterior)
    }
    return 'none';
  }, [formData]);

  // Determine which questions to show based on the path and previous answers
  const showLateralLevel = currentPath === 'lateral_only';

  const showSuprasindesmalType = showLateralLevel &&
    formData.lateral_fracture_level === 'suprasindesmal_high';

  const showPosteriorType = currentPath === 'posterior_only';

  const showMedialMorphology = currentPath === 'complex' || currentPath === 'lateral_posterior';

  // For complex path: show fibula transverse question when medial is oblique/vertical
  const showFibulaTransverse = currentPath === 'complex' &&
    formData.medial_morphology === 'oblique_vertical';

  // Show fibular level for complex paths (not when fibula is transverse with oblique medial)
  const showFibularLevel = (currentPath === 'complex' || currentPath === 'lateral_posterior') &&
    (formData.medial_morphology === 'transverse' ||
     formData.medial_morphology === 'doubtful' ||
     (formData.medial_morphology === 'oblique_vertical' && formData.fibula_transverse === false));

  // Show fibular transverse question for infrasindesmal level
  const showFibularTransverse = showFibularLevel &&
    formData.fibular_level === 'infrasindesmal';

  // Show fibular morphology when:
  // - fibular level is transindesmal or doubtful, OR
  // - fibular level is infrasindesmal and fibular is not transverse
  const showFibularMorphology = showFibularLevel &&
    ((formData.fibular_level === 'transindesmal' || formData.fibular_level === 'doubtful') ||
     (formData.fibular_level === 'infrasindesmal' && formData.fibular_transverse === false));

  // Show oblique fibular level when morphology is oblique
  const showObliqueFibularLevel = showFibularMorphology &&
    formData.fibular_morphology === 'oblique';

  // Show Weber C type for suprasindesmal in complex path
  const showComplexWeberCType = showFibularLevel &&
    formData.fibular_level === 'suprasindesmal_high';

  // Check if all three malleoli are fractured
  const allMalleoliFractured = formData.has_medial_fracture &&
    formData.has_lateral_fracture &&
    formData.has_posterior_fracture;

  // Determine the involved malleoli classification type (sa or ser)
  const involvedMalleoliType = useMemo(() => {
    // For SA (transverse fibula) path
    if (currentPath === 'complex' && formData.medial_morphology === 'oblique_vertical' &&
        formData.fibula_transverse === true) {
      return 'sa';
    }
    // For SA (transverse morphology) path
    if (showFibularMorphology && formData.fibular_morphology === 'transverse') {
      return 'sa';
    }
    // For SA (infrasindesmal transverse) path
    if (showFibularTransverse && formData.fibular_transverse === true) {
      return 'sa';
    }
    // For SER (spiral morphology) path
    if (showFibularMorphology && formData.fibular_morphology === 'spiral') {
      return 'ser';
    }
    // For PA (oblique morphology) path - after level is selected
    if (showObliqueFibularLevel && formData.oblique_fibular_level) {
      return formData.oblique_fibular_level === 'infrasindesmal' ? 'sa' : 'ser';
    }
    return null;
  }, [currentPath, formData, showFibularMorphology, showFibularTransverse, showObliqueFibularLevel]);

  // Auto-set involved_malleoli when all three malleoli are fractured
  useEffect(() => {
    if (allMalleoliFractured && involvedMalleoliType && !formData.involved_malleoli) {
      const autoValue = involvedMalleoliType === 'sa' ? 'trifocal' : 'lateral_medial_posterior';
      setFormData(prev => ({ ...prev, involved_malleoli: autoValue as InvolvedMalleoli }));
    }
  }, [allMalleoliFractured, involvedMalleoliType, formData.involved_malleoli]);

  // Only show the question if not all malleoli are fractured
  const showInvolvedMalleoli = involvedMalleoliType && !allMalleoliFractured ? involvedMalleoliType : null;

  // Show posterior type (Bartonicek) when posterior is involved and we need it
  const showPosteriorTypeInComplex = useMemo(() => {
    if (!formData.has_posterior_fracture) return false;
    // Show when all malleoli are fractured (involved_malleoli is auto-set)
    if (allMalleoliFractured && involvedMalleoliType) {
      return true;
    }
    // Show when user manually selects trifocal or lateral_medial_posterior
    if (showInvolvedMalleoli &&
        (formData.involved_malleoli === 'trifocal' ||
         formData.involved_malleoli === 'lateral_medial_posterior')) {
      return true;
    }
    return false;
  }, [formData.has_posterior_fracture, formData.involved_malleoli, showInvolvedMalleoli, allMalleoliFractured, involvedMalleoliType]);

  const handleMalleoliChange = (malleolus: 'medial' | 'lateral' | 'posterior', checked: boolean) => {
    const key = `has_${malleolus}_fracture` as keyof FractureInput;
    setFormData({
      has_medial_fracture: formData.has_medial_fracture,
      has_lateral_fracture: formData.has_lateral_fracture,
      has_posterior_fracture: formData.has_posterior_fracture,
      [key]: checked,
    });
  };

  const isFormComplete = () => {
    if (currentPath === 'none') return false;

    // Posterior only - need Bartonicek type
    if (currentPath === 'posterior_only') {
      return !!formData.posterior_fracture_type;
    }

    // Medial only - complete
    if (currentPath === 'medial_only') return true;

    // Medial + posterior - complete
    if (currentPath === 'medial_posterior') return true;

    // Lateral only
    if (currentPath === 'lateral_only') {
      if (!formData.lateral_fracture_level) return false;
      if (formData.lateral_fracture_level === 'suprasindesmal_high') {
        return !!formData.suprasindesmal_type;
      }
      return true;
    }

    // Complex paths
    if (currentPath === 'complex' || currentPath === 'lateral_posterior') {
      // Need medial morphology for complex path
      if (currentPath === 'complex' && !formData.medial_morphology) return false;

      // For oblique/vertical medial
      if (formData.medial_morphology === 'oblique_vertical') {
        if (formData.fibula_transverse === undefined) return false;
        if (formData.fibula_transverse === true) {
          return !!formData.involved_malleoli;
        }
      }

      // Need fibular level
      if (showFibularLevel && !formData.fibular_level) return false;

      // Suprasindesmal high
      if (formData.fibular_level === 'suprasindesmal_high') {
        return !!formData.suprasindesmal_type;
      }

      // Infrasindesmal
      if (formData.fibular_level === 'infrasindesmal') {
        if (formData.fibular_transverse === undefined) return false;
        if (formData.fibular_transverse === true) {
          return !!formData.involved_malleoli;
        }
      }

      // Need fibular morphology
      if (showFibularMorphology && !formData.fibular_morphology) return false;

      // Oblique morphology needs level
      if (formData.fibular_morphology === 'oblique') {
        if (!formData.oblique_fibular_level) return false;
        if (formData.oblique_fibular_level === 'suprasindesmal_high') {
          return !!formData.suprasindesmal_type;
        }
      }

      // Need involved malleoli
      if (showInvolvedMalleoli && !formData.involved_malleoli) return false;

      // Need posterior type if posterior is involved
      if (showPosteriorTypeInComplex && !formData.posterior_type) return false;

      return true;
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormComplete()) {
      await classify(formData as FractureInput);
    }
  };

  const handleReset = () => {
    setFormData({
      has_medial_fracture: false,
      has_lateral_fracture: false,
      has_posterior_fracture: false,
    });
    reset();
  };

  if (!options) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-muted-foreground">{t('form.loading')}</p>
      </div>
    );
  }

  if (result) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <ClassificationResult result={result} />
        <Button onClick={handleReset} className="mt-6 w-full" size="lg">
          {t('form.classifyAnother')}
        </Button>
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

      {/* Question 1: Which malleoli are fractured? */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            1. {options.questions.malleoli?.title}
          </CardTitle>
          <CardDescription>
            {options.questions.malleoli?.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="medial"
              checked={formData.has_medial_fracture}
              onCheckedChange={(checked) => handleMalleoliChange('medial', checked as boolean)}
            />
            <Label htmlFor="medial" className="cursor-pointer">{options.labels.medial_malleolus}</Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="lateral"
              checked={formData.has_lateral_fracture}
              onCheckedChange={(checked) => handleMalleoliChange('lateral', checked as boolean)}
            />
            <Label htmlFor="lateral" className="cursor-pointer">{options.labels.lateral_malleolus}</Label>
          </div>
          <div className="flex items-center space-x-3">
            <Checkbox
              id="posterior"
              checked={formData.has_posterior_fracture}
              onCheckedChange={(checked) => handleMalleoliChange('posterior', checked as boolean)}
            />
            <Label htmlFor="posterior" className="cursor-pointer">{options.labels.posterior_malleolus}</Label>
          </div>

          {currentPath === 'medial_only' && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription>
                {t('alerts.unimaleolarMedial')}
              </AlertDescription>
            </Alert>
          )}
          {currentPath === 'medial_posterior' && (
            <Alert className="mt-4 bg-green-50 border-green-200">
              <AlertDescription>
                {t('alerts.bimaleolarMedialPosterior')}
              </AlertDescription>
            </Alert>
          )}
          {currentPath === 'none' && (formData.has_medial_fracture || formData.has_lateral_fracture || formData.has_posterior_fracture) === false && (
            <Alert className="mt-4">
              <AlertDescription>
                {t('form.selectAtLeastOne')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Posterior-only: Bartonicek type */}
      {showPosteriorType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              2. {options.questions.posterior_type?.title}
            </CardTitle>
            <CardDescription>
              {options.questions.posterior_type?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.posterior_fracture_type || ''}
              onValueChange={(value) => setFormData({ ...formData, posterior_fracture_type: value as BartonicekType })}
            >
              {options.bartonicek_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`posterior-${option.value}`} />
                  <Label htmlFor={`posterior-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Lateral-only: Level */}
      {showLateralLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              2. {options.questions.fibular_level?.title}
            </CardTitle>
            <CardDescription>
              {options.questions.fibular_level?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.lateral_fracture_level || ''}
              onValueChange={(value) => setFormData({
                ...formData,
                lateral_fracture_level: value as FibularLevel,
                suprasindesmal_type: undefined,
              })}
            >
              {options.fibular_levels.filter(o => o.value !== 'doubtful').map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`lateral-level-${option.value}`} />
                  <Label htmlFor={`lateral-level-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {formData.lateral_fracture_level === 'infrasindesmal' && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <AlertDescription>
                  {t('alerts.infrasyndesmal')}
                </AlertDescription>
              </Alert>
            )}
            {formData.lateral_fracture_level === 'transindesmal' && (
              <Alert className="mt-4 bg-blue-50 border-blue-200">
                <AlertDescription>
                  {t('alerts.transsyndesmal')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lateral-only suprasindesmal: Type */}
      {showSuprasindesmalType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              3. {options.questions.weber_c_type?.title}
            </CardTitle>
            <CardDescription>
              AO/OTA (Weber C)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.suprasindesmal_type || ''}
              onValueChange={(value) => setFormData({ ...formData, suprasindesmal_type: value as WeberCFractureType })}
            >
              {options.weber_c_fracture_type.map((option) => (
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

      {/* Complex path: Medial morphology */}
      {showMedialMorphology && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              2. {options.questions.medial_morphology?.title}
            </CardTitle>
            <CardDescription>
              {options.questions.medial_morphology?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.medial_morphology || ''}
              onValueChange={(value) => setFormData({
                ...formData,
                medial_morphology: value as MedialMorphology,
                fibula_transverse: undefined,
                fibular_level: undefined,
                fibular_transverse: undefined,
                fibular_morphology: undefined,
                oblique_fibular_level: undefined,
                involved_malleoli: undefined,
                suprasindesmal_type: undefined,
                posterior_type: undefined,
              })}
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
            {formData.medial_morphology === 'oblique_vertical' && (
              <Alert className="mt-4 bg-green-50 border-green-200">
                <AlertDescription>
                  {t('alerts.obliqueVerticalMechanism')}
                </AlertDescription>
              </Alert>
            )}
            {formData.medial_morphology === 'transverse' && (
              <Alert className="mt-4">
                <AlertDescription>
                  {t('alerts.transverseMechanism')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complex path: Fibula transverse (for oblique/vertical medial) */}
      {showFibulaTransverse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              3. {options.questions.fibula_transverse?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibula_transverse === undefined ? '' : formData.fibula_transverse ? 'yes' : 'no'}
              onValueChange={(value) => setFormData({
                ...formData,
                fibula_transverse: value === 'yes',
                fibular_level: undefined,
                fibular_transverse: undefined,
                fibular_morphology: undefined,
                oblique_fibular_level: undefined,
                involved_malleoli: undefined,
                suprasindesmal_type: undefined,
              })}
            >
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="yes" id="fibula-trans-yes" />
                <Label htmlFor="fibula-trans-yes" className="cursor-pointer">{options.labels.yes}</Label>
              </div>
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="no" id="fibula-trans-no" />
                <Label htmlFor="fibula-trans-no" className="cursor-pointer">{options.labels.no}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Complex path: Fibular level */}
      {showFibularLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {showFibulaTransverse ? '4' : '3'}. {options.questions.fibular_level?.title}
            </CardTitle>
            <CardDescription>
              {options.questions.fibular_level?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_level || ''}
              onValueChange={(value) => setFormData({
                ...formData,
                fibular_level: value as FibularLevel,
                fibular_transverse: undefined,
                fibular_morphology: undefined,
                oblique_fibular_level: undefined,
                involved_malleoli: undefined,
                suprasindesmal_type: undefined,
              })}
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
                  {t('alerts.suprasyndesmalHigh')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Complex path: Weber C type for suprasindesmal */}
      {showComplexWeberCType && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.weber_c_type?.title}
            </CardTitle>
            <CardDescription>
              AO/OTA (Weber C)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.suprasindesmal_type || ''}
              onValueChange={(value) => setFormData({ ...formData, suprasindesmal_type: value as WeberCFractureType })}
            >
              {options.weber_c_fracture_type.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`complex-supra-${option.value}`} />
                  <Label htmlFor={`complex-supra-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Complex path: Fibular transverse (for infrasindesmal) */}
      {showFibularTransverse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibula_transverse?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_transverse === undefined ? '' : formData.fibular_transverse ? 'yes' : 'no'}
              onValueChange={(value) => setFormData({
                ...formData,
                fibular_transverse: value === 'yes',
                fibular_morphology: undefined,
                oblique_fibular_level: undefined,
                involved_malleoli: undefined,
              })}
            >
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="yes" id="fibular-trans-yes" />
                <Label htmlFor="fibular-trans-yes" className="cursor-pointer">{options.labels.yes}</Label>
              </div>
              <div className="flex items-center space-x-3 py-2">
                <RadioGroupItem value="no" id="fibular-trans-no" />
                <Label htmlFor="fibular-trans-no" className="cursor-pointer">{options.labels.no}</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Complex path: Fibular morphology */}
      {showFibularMorphology && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_morphology?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.fibular_morphology || ''}
              onValueChange={(value) => setFormData({
                ...formData,
                fibular_morphology: value as FibularMorphology,
                oblique_fibular_level: undefined,
                involved_malleoli: undefined,
                suprasindesmal_type: undefined,
              })}
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
          </CardContent>
        </Card>
      )}

      {/* Complex path: Oblique fibular level */}
      {showObliqueFibularLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.fibular_level?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.oblique_fibular_level || ''}
              onValueChange={(value) => setFormData({
                ...formData,
                oblique_fibular_level: value as FibularLevel,
                involved_malleoli: undefined,
                suprasindesmal_type: undefined,
              })}
            >
              {options.fibular_levels.filter(o => o.value !== 'doubtful').map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`oblique-level-${option.value}`} />
                  <Label htmlFor={`oblique-level-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Complex path: Involved malleoli */}
      {showInvolvedMalleoli && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.involved_malleoli?.title}
            </CardTitle>
            <CardDescription>
              AO/OTA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.involved_malleoli || ''}
              onValueChange={(value) => setFormData({
                ...formData,
                involved_malleoli: value as InvolvedMalleoli,
                posterior_type: undefined,
              })}
            >
              {(showInvolvedMalleoli === 'sa' ? options.involved_malleoli_sa : options.involved_malleoli_ser).map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`involved-${option.value}`} />
                  <Label htmlFor={`involved-${option.value}`} className="cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Complex path: Posterior type (Bartonicek) when posterior is involved */}
      {showPosteriorTypeInComplex && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {options.questions.posterior_type?.title}
            </CardTitle>
            <CardDescription>
              {options.questions.posterior_type?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={formData.posterior_type || ''}
              onValueChange={(value) => setFormData({ ...formData, posterior_type: value as BartonicekType })}
            >
              {options.bartonicek_types.map((option) => (
                <div key={option.value} className="flex items-center space-x-3 py-2">
                  <RadioGroupItem value={option.value} id={`complex-posterior-${option.value}`} />
                  <Label htmlFor={`complex-posterior-${option.value}`} className="cursor-pointer">
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
        {loading ? t('form.classifying') : t('form.classify')}
      </Button>
    </form>
  );
}
