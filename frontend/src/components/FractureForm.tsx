import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Share2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { generateShareUrl, copyToClipboard, decodeParamsToInput } from '../utils/shareUrl';
import type {
  FractureInput,
  FormOptions,
  InvolvedMalleoli,
  PosteriorFractureType,
  MedialMorphology,
  FibularLevel,
  LateralMorphology,
  SuprasindesmalType,
  FibulaTracePattern,
} from '../types/fracture';
import { getFormOptions } from '../services/api';
import { useClassification } from '../hooks/useClassification';
import { ClassificationResult } from './ClassificationResult';
import { ComparisonView } from './ComparisonView';
import { Button } from '@/components/ui/button';
import { QuestionCard, QuestionCardHeader, QuestionCardTitle, QuestionCardContent } from '@/components/ui/question-card';
import { SelectionCard } from '@/components/ui/selection-card';
import { FormSkeleton } from '@/components/ui/form-skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const FORM_STORAGE_KEY = 'anklyze-form-draft';

export function FractureForm() {
  const { t, i18n } = useTranslation();
  const [options, setOptions] = useState<FormOptions | null>(null);
  const [formData, setFormData] = useState<Partial<FractureInput>>({});
  const [formHistory, setFormHistory] = useState<Partial<FractureInput>[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  // Check if URL has params on initial render to avoid flash
  const [loadingFromUrl, setLoadingFromUrl] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const inputFromUrl = decodeParamsToInput(params);
    return !!(inputFromUrl && inputFromUrl.involved_malleoli);
  });
  const lastInputRef = useRef<FractureInput | null>(null);
  const hasLoadedFromUrl = useRef(false);
  const formEndRef = useRef<HTMLDivElement>(null);
  const { result, loading, error, scenarios, classify, addScenario, clearScenarios, reset, resetAll } = useClassification();

  // Re-fetch options when language changes
  useEffect(() => {
    getFormOptions().then(setOptions).catch(console.error);
  }, [i18n.language]);

  // Load from URL params on mount
  useEffect(() => {
    if (hasLoadedFromUrl.current || !options || !loadingFromUrl) return;

    const params = new URLSearchParams(window.location.search);
    const inputFromUrl = decodeParamsToInput(params);

    if (inputFromUrl && inputFromUrl.involved_malleoli) {
      hasLoadedFromUrl.current = true;
      lastInputRef.current = inputFromUrl as FractureInput;
      // Auto-classify without showing form
      classify(inputFromUrl as FractureInput).finally(() => {
        setLoadingFromUrl(false);
        // Clean URL without reload
        window.history.replaceState({}, '', window.location.pathname);
      });
    }
  }, [options, classify, loadingFromUrl]);

  // Smooth scroll to new question when form advances
  useEffect(() => {
    // Only scroll if there's at least one answer (not on initial render)
    if (Object.keys(formData).length > 0 && formEndRef.current) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        formEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [formData]);

  // Restore form state from localStorage on mount
  useEffect(() => {
    // Don't restore if loading from URL
    if (loadingFromUrl) return;

    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        const { data, history, timestamp } = JSON.parse(saved);
        // Only restore if saved within last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          if (data && Object.keys(data).length > 0) {
            setFormData(data);
            setFormHistory(history || []);
            toast.info(t('form.draftRestored'), { duration: 3000 });
          }
        } else {
          // Clear expired draft
          localStorage.removeItem(FORM_STORAGE_KEY);
        }
      }
    } catch {
      // Ignore parse errors
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save form state to localStorage when it changes
  useEffect(() => {
    // Only save if there's actual data
    if (Object.keys(formData).length > 0) {
      try {
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
          data: formData,
          history: formHistory,
          timestamp: Date.now(),
        }));
      } catch {
        // Ignore storage errors (quota exceeded, etc.)
      }
    }
  }, [formData, formHistory]);

  // Clear saved draft when classification is complete
  const clearSavedDraft = useCallback(() => {
    localStorage.removeItem(FORM_STORAGE_KEY);
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

  // PATH: Maléolo posterior solo - primero pregunta TAC
  const showPosteriorHasCTScan = involvedMalleoli === 'posterior_only';
  // PATH: Maléolo posterior solo - tipo de fractura (solo si tiene TAC)
  const showPosteriorType = showPosteriorHasCTScan && formData.has_ct_scan === true;

  // PATH: Maléolo medial solo
  const showMedialMorphology = involvedMalleoli === 'medial_only';

  // PATH: Maléolo lateral solo
  const showLateralLevel = involvedMalleoli === 'lateral_only';

  // PATH: Maléolo lateral solo - infrasindesmal goes directly to result (no morphology question needed)
  // Infrasindesmal lateral-only always results in SA - no morphology question
  const showLateralMorphologyInfra = false;

  // PATH: Maléolo lateral solo - morfología para transindesmal
  const showLateralMorphologyTrans = showLateralLevel && formData.fibular_level === 'transindesmal';

  // PATH: Maléolo lateral solo - tipo para suprasindesmal
  const showSuprasindesmalType = showLateralLevel && formData.fibular_level === 'suprasindesmal';

  // PATH: Maléolo lateral solo - trazo del peroné para suprasindesmal simple/multifragmentaria
  const showLateralFibulaTracePattern = showSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');

  // PATH: Maleolos lateral y posterior
  const showLateralPosteriorLevel = involvedMalleoli === 'lateral_posterior';

  // PATH: Maleolos lateral y posterior - ALL infrasindesmal cases are impossible
  // No morphology question needed - SA mechanism doesn't involve posterior, PA is trans/supra
  const showLPMorphologyInfra = false;

  // PATH: Maleolos lateral y posterior - Infrasindesmal always leads to "No posible"
  const showLPNotPossible = showLateralPosteriorLevel && formData.fibular_level === 'infrasindesmal';

  // PATH: Maleolos lateral y posterior - no posterior type for infrasindesmal (all impossible)
  const showLPPosteriorTypeInfraOblique = false;

  // PATH: Maleolos lateral y posterior - morfología para transindesmal
  const showLPMorphologyTrans = showLateralPosteriorLevel && formData.fibular_level === 'transindesmal';

  // PATH: Maleolos lateral y posterior - transindesmal espiroidea - pregunta TAC
  const showLPHasCTScanTransSpiral = showLPMorphologyTrans && formData.lateral_morphology === 'spiral';

  // PATH: Maleolos lateral y posterior - transindesmal espiroidea - tipo posterior (solo si tiene TAC)
  const showLPPosteriorTypeTransSpiral = showLPHasCTScanTransSpiral && formData.has_ct_scan === true;

  // PATH: Maleolos lateral y posterior - transindesmal oblicua - pregunta TAC
  const showLPHasCTScanTransOblique = showLPMorphologyTrans && formData.lateral_morphology === 'oblique';

  // PATH: Maleolos lateral y posterior - transindesmal oblicua - tipo posterior (solo si tiene TAC)
  const showLPPosteriorTypeTransOblique = showLPHasCTScanTransOblique && formData.has_ct_scan === true;

  // PATH: Maleolos lateral y posterior - tipo para suprasindesmal
  const showLPSuprasindesmalType = showLateralPosteriorLevel && formData.fibular_level === 'suprasindesmal';

  // PATH: Maleolos lateral y posterior - trazo del peroné para suprasindesmal simple/multifragmentaria
  const showLPFibulaTracePattern = showLPSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');

  // PATH: Maleolos lateral y posterior - suprasindesmal simple/multi - trazo corto (PA) - pregunta TAC
  const showLPHasCTScanSupraShort = showLPFibulaTracePattern && formData.fibula_trace_pattern === 'parasindesmotic_short';

  // PATH: Maleolos lateral y posterior - suprasindesmal simple/multi - trazo largo (PER) - pregunta TAC
  const showLPHasCTScanSupraLong = showLPFibulaTracePattern && formData.fibula_trace_pattern === 'parasindesmotic_long';

  // PATH: Maleolos lateral y posterior - suprasindesmal proximal - pregunta TAC
  const showLPHasCTScanSupraProximal = showLPSuprasindesmalType && formData.suprasindesmal_type === 'proximal';

  // PATH: Maleolos lateral y posterior - pregunta de tipo posterior para suprasindesmal (solo si tiene TAC)
  const showLPPosteriorTypeSupra = (showLPHasCTScanSupraShort || showLPHasCTScanSupraLong || showLPHasCTScanSupraProximal) && formData.has_ct_scan === true;

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

  // PATH: Maleolos lateral y medial - trazo del peroné para suprasindesmal simple/multifragmentaria
  const showLMFibulaTracePattern = showLMSuprasindesmalType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');

  // PATH: Maleolos lateral y medial - nivel bajo - morfología
  const showLMFibularMorphology = showLMFibularLevel &&
    (formData.fibular_level_for_transverse === 'infrasindesmal' || formData.fibular_level_for_transverse === 'transindesmal');

  // PATH: Maleolos lateral y medial - nivel bajo - transversa - nivel del peroné
  const showLMTransverseFibularLevel = showLMFibularMorphology && formData.lateral_morphology === 'transverse';

  // PATH: Trimaleolar
  const showTrimaleolarFibularHeight = involvedMalleoli === 'trimaleolar';

  // PATH: Trimaleolar - alta (suprasindesmal)
  const showTrimaleolarSupraType = showTrimaleolarFibularHeight && formData.fibular_level === 'suprasindesmal';

  // PATH: Trimaleolar - suprasindesmal - trazo del peroné para simple/multifragmentaria
  const showTriFibulaTracePattern = showTrimaleolarSupraType &&
    (formData.suprasindesmal_type === 'simple_diaphyseal' || formData.suprasindesmal_type === 'multifragmentary');

  // PATH: Trimaleolar - suprasindesmal simple/multi - trazo corto (PA) - pregunta TAC
  const showTriHasCTScanSupraShort = showTriFibulaTracePattern && formData.fibula_trace_pattern === 'parasindesmotic_short';

  // PATH: Trimaleolar - suprasindesmal simple/multi - trazo largo (PER) - pregunta TAC
  const showTriHasCTScanSupraLong = showTriFibulaTracePattern && formData.fibula_trace_pattern === 'parasindesmotic_long';

  // PATH: Trimaleolar - suprasindesmal proximal - pregunta TAC
  const showTriHasCTScanSupraProximal = showTrimaleolarSupraType && formData.suprasindesmal_type === 'proximal';

  // PATH: Trimaleolar - suprasindesmal - tipo posterior (solo si tiene TAC)
  const showTriPosteriorTypeSupra = (showTriHasCTScanSupraShort || showTriHasCTScanSupraLong || showTriHasCTScanSupraProximal) && formData.has_ct_scan === true;

  // PATH: Trimaleolar - baja - morfología
  const showTrimaleolarMorphology = showTrimaleolarFibularHeight &&
    (formData.fibular_level === 'infrasindesmal' || formData.fibular_level === 'transindesmal');

  // PATH: Trimaleolar - baja - transversa - nivel
  const showTrimaleolarTransverseLevel = showTrimaleolarMorphology && formData.lateral_morphology === 'transverse';

  // PATH: Trimaleolar - baja - transversa - transindesmal - pregunta TAC
  const showTriHasCTScanTransverse = showTrimaleolarTransverseLevel && formData.fibular_level_for_transverse === 'transindesmal';

  // PATH: Trimaleolar - baja - transindesmal - oblicua - pregunta TAC
  const showTriHasCTScanOblique = showTrimaleolarMorphology && formData.lateral_morphology === 'oblique';

  // PATH: Trimaleolar - baja - transindesmal - espiroidea - pregunta TAC
  const showTriHasCTScanSpiral = showTrimaleolarMorphology && formData.lateral_morphology === 'spiral';

  // PATH: Trimaleolar - baja - tipo posterior (solo si tiene TAC y tiene morfología oblicua, espiroidea, o transversa+transindesmal)
  const showTriPosteriorTypeLow = (showTriHasCTScanOblique || showTriHasCTScanSpiral || showTriHasCTScanTransverse) && formData.has_ct_scan === true;

  // Helper to update form data with history tracking
  const updateFormData = useCallback((newData: Partial<FractureInput>) => {
    pushToHistory();
    setFormData(newData);
  }, [pushToHistory]);

  const handleInvolvedMalleoliChange = useCallback((value: string) => {
    updateFormData({ involved_malleoli: value as InvolvedMalleoli });
  }, [updateFormData]);

  const isFormComplete = useCallback((): boolean => {
    if (!involvedMalleoli) return false;

    // PATH: Maléolo posterior solo - necesita TAC, luego opcionalmente tipo
    if (involvedMalleoli === 'posterior_only') {
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === false) return true; // Sin TAC, no Bartonicek
      return !!formData.posterior_fracture_type; // Con TAC, necesita tipo
    }

    // PATH: Maléolo medial solo - necesita morfología
    if (involvedMalleoli === 'medial_only') {
      return !!formData.medial_morphology;
    }

    // PATH: Maléolo lateral solo
    if (involvedMalleoli === 'lateral_only') {
      if (!formData.fibular_level) return false;
      // Infrasindesmal goes directly to result (SA) - no morphology needed
      if (formData.fibular_level === 'infrasindesmal') {
        return true;
      }
      if (formData.fibular_level === 'transindesmal') {
        return !!formData.lateral_morphology;
      }
      if (formData.fibular_level === 'suprasindesmal') {
        if (!formData.suprasindesmal_type) return false;
        // Proximal goes directly to result (PER)
        if (formData.suprasindesmal_type === 'proximal') return true;
        // Simple/Multifragmentary need fibula trace pattern
        return !!formData.fibula_trace_pattern;
      }
    }

    // PATH: Maleolos medial y posterior - necesita TAC, luego opcionalmente tipo
    if (involvedMalleoli === 'medial_posterior') {
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === false) return true; // Sin TAC, no Bartonicek
      return !!formData.posterior_fracture_type; // Con TAC, necesita tipo
    }

    // PATH: Maleolos lateral y posterior
    if (involvedMalleoli === 'lateral_posterior') {
      if (!formData.fibular_level) return false;
      // All infrasindesmal cases are "not possible" - no additional questions needed
      if (formData.fibular_level === 'infrasindesmal') {
        return true; // No posible - SA mechanism doesn't involve posterior, PA is trans/supra
      }
      if (formData.fibular_level === 'transindesmal') {
        if (!formData.lateral_morphology) return false;
        // Need CT scan before posterior type
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return true; // Sin TAC, no Bartonicek
        return !!formData.posterior_fracture_type; // Con TAC, necesita tipo
      }
      if (formData.fibular_level === 'suprasindesmal') {
        if (!formData.suprasindesmal_type) return false;
        // Proximal goes to CT scan question
        if (formData.suprasindesmal_type === 'proximal') {
          if (formData.has_ct_scan === undefined) return false;
          if (formData.has_ct_scan === false) return true;
          return !!formData.posterior_fracture_type;
        }
        // Simple/Multifragmentary need fibula trace pattern first
        if (!formData.fibula_trace_pattern) return false;
        // Then CT scan
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return true;
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
        if (!formData.suprasindesmal_type) return false;
        // Proximal goes directly to result (PER)
        if (formData.suprasindesmal_type === 'proximal') return true;
        // Simple/Multifragmentary need fibula trace pattern
        return !!formData.fibula_trace_pattern;
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
        if (!formData.suprasindesmal_type) return false;
        // Proximal goes to CT scan question
        if (formData.suprasindesmal_type === 'proximal') {
          if (formData.has_ct_scan === undefined) return false;
          if (formData.has_ct_scan === false) return true;
          return !!formData.posterior_fracture_type;
        }
        // Simple/Multifragmentary need fibula trace pattern first
        if (!formData.fibula_trace_pattern) return false;
        // Then CT scan
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return true;
        return !!formData.posterior_fracture_type;
      }
      // Nivel bajo
      if (!formData.lateral_morphology) return false;
      if (formData.lateral_morphology === 'transverse') {
        // infrasindesmal = "No posible", transindesmal = PA (need CT scan + posterior type)
        if (!formData.fibular_level_for_transverse) return false;
        if (formData.fibular_level_for_transverse === 'infrasindesmal') return true; // No posible
        // Transindesmal - need CT scan
        if (formData.has_ct_scan === undefined) return false;
        if (formData.has_ct_scan === false) return true;
        return !!formData.posterior_fracture_type;
      }
      // Oblicua o espiroidea - need CT scan
      if (formData.has_ct_scan === undefined) return false;
      if (formData.has_ct_scan === false) return true;
      return !!formData.posterior_fracture_type;
    }

    return false;
  }, [involvedMalleoli, formData]);

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

    // PATH: Maléolo posterior solo - pregunta TAC
    if (showPosteriorHasCTScan && formData.has_ct_scan === undefined) {
      return {
        options: [
          { value: 'yes', label: options.labels.yes },
          { value: 'no', label: options.labels.no },
        ],
        onSelect: (value: string) => updateFormData({
          ...formData,
          has_ct_scan: value === 'yes',
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Maléolo posterior solo - tipo posterior (solo si tiene TAC)
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
        onSelect: (value: string) => updateFormData({
          ...formData,
          suprasindesmal_type: value as SuprasindesmalType,
          fibula_trace_pattern: undefined,
        }),
      };
    }

    // PATH: Maléolo lateral solo - trazo del peroné para suprasindesmal simple/multifragmentaria
    if (showLateralFibulaTracePattern && !formData.fibula_trace_pattern) {
      return {
        options: options.fibula_trace_patterns,
        onSelect: (value: string) => updateFormData({ ...formData, fibula_trace_pattern: value as FibulaTracePattern }),
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
          has_ct_scan: undefined,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - transindesmal (espiroidea/oblicua) - pregunta TAC
    if ((showLPHasCTScanTransSpiral || showLPHasCTScanTransOblique) && formData.has_ct_scan === undefined) {
      return {
        options: [
          { value: 'yes', label: options.labels.yes },
          { value: 'no', label: options.labels.no },
        ],
        onSelect: (value: string) => updateFormData({
          ...formData,
          has_ct_scan: value === 'yes',
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - tipo posterior (transindesmal - solo si tiene TAC)
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
          fibula_trace_pattern: undefined,
          has_ct_scan: undefined,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - trazo del peroné para suprasindesmal simple/multifragmentaria
    if (showLPFibulaTracePattern && !formData.fibula_trace_pattern) {
      return {
        options: options.fibula_trace_patterns,
        onSelect: (value: string) => updateFormData({
          ...formData,
          fibula_trace_pattern: value as FibulaTracePattern,
          has_ct_scan: undefined,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - suprasindesmal - pregunta TAC
    if ((showLPHasCTScanSupraShort || showLPHasCTScanSupraLong || showLPHasCTScanSupraProximal) && formData.has_ct_scan === undefined) {
      return {
        options: [
          { value: 'yes', label: options.labels.yes },
          { value: 'no', label: options.labels.no },
        ],
        onSelect: (value: string) => updateFormData({
          ...formData,
          has_ct_scan: value === 'yes',
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Lateral y posterior - tipo posterior (suprasindesmal - solo si tiene TAC)
    if (showLPPosteriorTypeSupra && !formData.posterior_fracture_type) {
      return {
        options: options.posterior_fracture_types,
        onSelect: (value: string) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType }),
      };
    }

    // PATH: Lateral y medial - morfología medial
    if (showLMMedialMorphology && !formData.medial_morphology) {
      return {
        options: options.medial_morphology_lm,
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
        onSelect: (value: string) => updateFormData({
          ...formData,
          suprasindesmal_type: value as SuprasindesmalType,
          fibula_trace_pattern: undefined,
        }),
      };
    }

    // PATH: Lateral y medial - trazo del peroné para suprasindesmal simple/multifragmentaria
    if (showLMFibulaTracePattern && !formData.fibula_trace_pattern) {
      return {
        options: options.fibula_trace_patterns,
        onSelect: (value: string) => updateFormData({ ...formData, fibula_trace_pattern: value as FibulaTracePattern }),
      };
    }

    // PATH: Lateral y medial - morfología fibular
    if (showLMFibularMorphology && !formData.lateral_morphology) {
      return {
        options: options.fibula_morphology_lm_tri,
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
        onSelect: (value: string) => updateFormData({
          ...formData,
          suprasindesmal_type: value as SuprasindesmalType,
          fibula_trace_pattern: undefined,
          has_ct_scan: undefined,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Trimaleolar - trazo del peroné para suprasindesmal simple/multifragmentaria
    if (showTriFibulaTracePattern && !formData.fibula_trace_pattern) {
      return {
        options: options.fibula_trace_patterns,
        onSelect: (value: string) => updateFormData({
          ...formData,
          fibula_trace_pattern: value as FibulaTracePattern,
          has_ct_scan: undefined,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Trimaleolar - suprasindesmal - pregunta TAC
    if ((showTriHasCTScanSupraShort || showTriHasCTScanSupraLong || showTriHasCTScanSupraProximal) && formData.has_ct_scan === undefined) {
      return {
        options: [
          { value: 'yes', label: options.labels.yes },
          { value: 'no', label: options.labels.no },
        ],
        onSelect: (value: string) => updateFormData({
          ...formData,
          has_ct_scan: value === 'yes',
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Trimaleolar - suprasindesmal - tipo posterior (solo si tiene TAC)
    if (showTriPosteriorTypeSupra && !formData.posterior_fracture_type) {
      return {
        options: options.posterior_fracture_types,
        onSelect: (value: string) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType }),
      };
    }

    // PATH: Trimaleolar - morfología
    if (showTrimaleolarMorphology && !formData.lateral_morphology) {
      return {
        options: options.fibula_morphology_lm_tri,
        onSelect: (value: string) => updateFormData({
          ...formData,
          lateral_morphology: value as LateralMorphology,
          fibular_level_for_transverse: undefined,
          has_ct_scan: undefined,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Trimaleolar - nivel para transversa
    if (showTrimaleolarTransverseLevel && !formData.fibular_level_for_transverse) {
      return {
        options: options.fibular_levels.filter(o => o.value === 'infrasindesmal' || o.value === 'transindesmal'),
        onSelect: (value: string) => updateFormData({
          ...formData,
          fibular_level_for_transverse: value as FibularLevel,
          has_ct_scan: undefined,
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Trimaleolar - baja (oblicua o espiroidea) - pregunta TAC
    if ((showTriHasCTScanOblique || showTriHasCTScanSpiral) && formData.has_ct_scan === undefined) {
      return {
        options: [
          { value: 'yes', label: options.labels.yes },
          { value: 'no', label: options.labels.no },
        ],
        onSelect: (value: string) => updateFormData({
          ...formData,
          has_ct_scan: value === 'yes',
          posterior_fracture_type: undefined,
        }),
      };
    }

    // PATH: Trimaleolar - baja - tipo posterior (solo si tiene TAC)
    if (showTriPosteriorTypeLow && !formData.posterior_fracture_type) {
      return {
        options: options.posterior_fracture_types,
        onSelect: (value: string) => updateFormData({ ...formData, posterior_fracture_type: value as PosteriorFractureType }),
      };
    }

    return null;
  }, [
    options, involvedMalleoli, formData, handleInvolvedMalleoliChange, updateFormData,
    showPosteriorHasCTScan, showPosteriorType, showMedialMorphology, showLateralLevel,
    showLateralMorphologyInfra, showLateralMorphologyTrans, showSuprasindesmalType,
    showLateralFibulaTracePattern, showLateralPosteriorLevel, showLPMorphologyInfra,
    showLPPosteriorTypeInfraOblique, showLPMorphologyTrans, showLPHasCTScanTransSpiral,
    showLPHasCTScanTransOblique, showLPPosteriorTypeTransSpiral, showLPPosteriorTypeTransOblique,
    showLPSuprasindesmalType, showLPFibulaTracePattern, showLPHasCTScanSupraShort,
    showLPHasCTScanSupraLong, showLPHasCTScanSupraProximal, showLPPosteriorTypeSupra,
    showLMMedialMorphology, showLMFibulaInfraTransverse, showLMFibularLevel,
    showLMSuprasindesmalType, showLMFibulaTracePattern, showLMFibularMorphology,
    showLMTransverseFibularLevel, showTrimaleolarFibularHeight, showTrimaleolarSupraType,
    showTriFibulaTracePattern, showTriHasCTScanSupraShort, showTriHasCTScanSupraLong,
    showTriHasCTScanSupraProximal, showTriPosteriorTypeSupra, showTrimaleolarMorphology,
    showTrimaleolarTransverseLevel, showTriHasCTScanOblique, showTriHasCTScanSpiral,
    showTriPosteriorTypeLow,
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

      // Clear saved draft on successful classification
      if (classificationResult) {
        clearSavedDraft();
      }

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
    clearSavedDraft();
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
    clearSavedDraft();
    resetAll();
    setIsComparing(false);
  };

  const handleShare = async () => {
    if (!lastInputRef.current) return;

    const url = generateShareUrl(lastInputRef.current);
    const success = await copyToClipboard(url);

    if (success) {
      toast.success(t('form.linkCopied'));
    } else {
      toast.error(t('form.copyFailed'));
    }
  };

  if (!options) {
    return <FormSkeleton className="max-w-2xl mx-auto p-6" />;
  }

  // Show loading state when auto-classifying from URL params
  if (loadingFromUrl) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-muted-foreground">{t('form.classifying')}</p>
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
          <Button onClick={handleShare} variant="outline" size="lg" className="gap-2">
            <Share2 className="h-4 w-4" />
            {t('share.button')}
          </Button>
        </div>
      </div>
    );
  }

  // Calculate progress based on the current path
  const progressValue = (() => {
    if (!formData.involved_malleoli) return 0;

    // Define expected questions per path (approximate max)
    const pathQuestions: Record<string, number> = {
      'posterior_only': 3,      // malleoli -> CT? -> type (if CT)
      'medial_only': 2,         // malleoli -> morphology
      'lateral_only': 4,        // malleoli -> level -> morphology/type -> trace
      'medial_posterior': 3,    // malleoli -> CT? -> type (if CT)
      'lateral_posterior': 6,   // malleoli -> level -> morphology -> CT? -> type
      'lateral_medial': 5,      // malleoli -> medial morph -> infra? -> level -> morph
      'trimaleolar': 6,         // malleoli -> level -> type -> trace -> CT? -> type
    };

    const totalForPath = pathQuestions[formData.involved_malleoli] || 4;
    const answered = Object.keys(formData).filter(
      key => formData[key as keyof typeof formData] !== undefined
    ).length;

    // Calculate percentage, cap at 95% until form is complete
    const formComplete = isFormComplete();
    const progress = Math.min((answered / totalForPath) * 100, formComplete ? 100 : 95);
    return Math.round(progress);
  })();

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('app.title')}</h1>
        <p className="text-muted-foreground">
          {t('app.description')}
        </p>
      </div>

      {/* Progress indicator with breadcrumb */}
      {formData.involved_malleoli && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {/* Breadcrumb showing classification path */}
          <div className="flex items-center gap-1 flex-wrap text-xs">
            <Badge variant="outline" className="bg-primary/10 border-primary/30">
              {options.involved_malleoli.find(o => o.value === formData.involved_malleoli)?.label}
            </Badge>
            {formData.fibular_level && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="bg-muted/50">
                  {options.fibular_levels.find(o => o.value === formData.fibular_level)?.label}
                </Badge>
              </>
            )}
            {formData.fibular_level_for_transverse && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="bg-muted/50">
                  {formData.fibular_level_for_transverse === 'suprasindesmal' ? options.labels.high : options.labels.low}
                </Badge>
              </>
            )}
            {formData.lateral_morphology && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="bg-muted/50">
                  {options.lateral_morphology.find(o => o.value === formData.lateral_morphology)?.label}
                </Badge>
              </>
            )}
            {formData.medial_morphology && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="bg-muted/50">
                  {options.medial_morphology.find(o => o.value === formData.medial_morphology)?.label}
                </Badge>
              </>
            )}
            {formData.suprasindesmal_type && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="bg-muted/50">
                  {options.suprasindesmal_types.find(o => o.value === formData.suprasindesmal_type)?.label}
                </Badge>
              </>
            )}
            {formData.fibula_trace_pattern && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="bg-muted/50">
                  {options.fibula_trace_patterns.find(o => o.value === formData.fibula_trace_pattern)?.label}
                </Badge>
              </>
            )}
            {formData.has_ct_scan !== undefined && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="bg-muted/50">
                  CT: {formData.has_ct_scan ? options.labels.yes : options.labels.no}
                </Badge>
              </>
            )}
            {formData.posterior_fracture_type && (
              <>
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <Badge variant="outline" className="bg-muted/50">
                  {options.posterior_fracture_types.find(o => o.value === formData.posterior_fracture_type)?.label}
                </Badge>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <Progress value={progressValue} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground tabular-nums">{progressValue}%</span>
          </div>
        </div>
      )}

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
      <QuestionCard questionKey="involved_malleoli">
        <QuestionCardHeader>
          <QuestionCardTitle>
            {options.questions.involved_malleoli?.title}
          </QuestionCardTitle>
        </QuestionCardHeader>
        <QuestionCardContent>
          <div className="flex flex-col gap-2">
            {options.involved_malleoli.map((option, index) => (
              <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                <SelectionCard
                  id={`malleoli-${option.value}`}
                  value={option.value}
                  label={option.label}
                  selected={formData.involved_malleoli === option.value}
                  onSelect={() => handleInvolvedMalleoliChange(option.value)}
                  keyboardHint={String(index + 1)}
                />
              </div>
            ))}
          </div>
        </QuestionCardContent>
      </QuestionCard>

      {/* PATH: Maléolo posterior - ¿Tiene TAC? */}
      {showPosteriorHasCTScan && (
        <QuestionCard questionKey="posterior-ct-scan">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.has_ct_scan?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="post-ct-yes"
                  value="yes"
                  label={options.labels.yes}
                  selected={formData.has_ct_scan === true}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: true,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="post-ct-no"
                  value="no"
                  label={options.labels.no}
                  selected={formData.has_ct_scan === false}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: false,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maléolo posterior - Tipo de fractura (solo si tiene TAC) */}
      {showPosteriorType && (
        <QuestionCard questionKey="posterior-type">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.posterior_fracture_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.posterior_fracture_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`post-type-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.posterior_fracture_type === option.value}
                    onSelect={() => updateFormData({ ...formData, posterior_fracture_type: option.value as PosteriorFractureType })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maléolo medial - Morfología */}
      {showMedialMorphology && (
        <QuestionCard questionKey="medial-morphology">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.medial_morphology?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.medial_morphology.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`medial-morph-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.medial_morphology === option.value}
                    onSelect={() => updateFormData({ ...formData, medial_morphology: option.value as MedialMorphology })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maléolo lateral - Nivel */}
      {showLateralLevel && (
        <QuestionCard questionKey="lateral-level">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibular_level?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibular_levels.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lat-level-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.fibular_level === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      fibular_level: option.value as FibularLevel,
                      lateral_morphology: undefined,
                      suprasindesmal_type: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maléolo lateral - Morfología para infrasindesmal */}
      {showLateralMorphologyInfra && (
        <QuestionCard questionKey="lateral-morph-infra">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.lateral_morphology?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.lateral_morphology
                .filter(o => o.value === 'transverse' || o.value === 'oblique')
                .map((option, index) => (
                  <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                    <SelectionCard
                      id={`lat-morph-infra-${option.value}`}
                      value={option.value}
                      label={option.label}
                      selected={formData.lateral_morphology === option.value}
                      onSelect={() => updateFormData({ ...formData, lateral_morphology: option.value as LateralMorphology })}
                      keyboardHint={String(index + 1)}
                    />
                  </div>
                ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maléolo lateral - Morfología para transindesmal */}
      {showLateralMorphologyTrans && (
        <QuestionCard questionKey="lateral-morph-trans">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.lateral_morphology?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.lateral_morphology
                .filter(o => o.value === 'spiral' || o.value === 'oblique')
                .map((option, index) => (
                  <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                    <SelectionCard
                      id={`lat-morph-trans-${option.value}`}
                      value={option.value}
                      label={option.label}
                      selected={formData.lateral_morphology === option.value}
                      onSelect={() => updateFormData({ ...formData, lateral_morphology: option.value as LateralMorphology })}
                      keyboardHint={String(index + 1)}
                    />
                  </div>
                ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maléolo lateral - Tipo suprasindesmal */}
      {showSuprasindesmalType && (
        <QuestionCard questionKey="suprasindesmal-type">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.suprasindesmal_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.suprasindesmal_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`supra-type-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.suprasindesmal_type === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      suprasindesmal_type: option.value as SuprasindesmalType,
                      fibula_trace_pattern: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maléolo lateral - Trazo del peroné para suprasindesmal simple/multifragmentaria */}
      {showLateralFibulaTracePattern && (
        <QuestionCard questionKey="lateral-trace-pattern">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibula_trace_pattern?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibula_trace_patterns.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lat-trace-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.fibula_trace_pattern === option.value}
                    onSelect={() => updateFormData({ ...formData, fibula_trace_pattern: option.value as FibulaTracePattern })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos medial y posterior - ¿Tiene TAC? */}
      {involvedMalleoli === 'medial_posterior' && (
        <QuestionCard questionKey="mp-ct-scan">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.has_ct_scan?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="mp-ct-yes"
                  value="yes"
                  label={options.labels.yes}
                  selected={formData.has_ct_scan === true}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: true,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="mp-ct-no"
                  value="no"
                  label={options.labels.no}
                  selected={formData.has_ct_scan === false}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: false,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos medial y posterior - Tipo de fractura posterior (solo si tiene TAC) */}
      {involvedMalleoli === 'medial_posterior' && formData.has_ct_scan === true && (
        <QuestionCard questionKey="mp-posterior-type">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.posterior_fracture_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.posterior_fracture_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`mp-post-type-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.posterior_fracture_type === option.value}
                    onSelect={() => updateFormData({ ...formData, posterior_fracture_type: option.value as PosteriorFractureType })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Nivel */}
      {showLateralPosteriorLevel && (
        <QuestionCard questionKey="lp-level">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibular_level?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibular_levels.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lp-level-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.fibular_level === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      fibular_level: option.value as FibularLevel,
                      lateral_morphology: undefined,
                      suprasindesmal_type: undefined,
                      posterior_fracture_type: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Infrasindesmal - Morfología */}
      {showLPMorphologyInfra && (
        <QuestionCard questionKey="lp-morph-infra">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.lateral_morphology?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.lateral_morphology
                .filter(o => o.value === 'transverse' || o.value === 'oblique')
                .map((option, index) => (
                  <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                    <SelectionCard
                      id={`lp-morph-infra-${option.value}`}
                      value={option.value}
                      label={option.label}
                      selected={formData.lateral_morphology === option.value}
                      onSelect={() => updateFormData({
                        ...formData,
                        lateral_morphology: option.value as LateralMorphology,
                        posterior_fracture_type: undefined,
                      })}
                      keyboardHint={String(index + 1)}
                    />
                  </div>
                ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
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
        <QuestionCard questionKey="lp-post-infra">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.posterior_fracture_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.posterior_fracture_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lp-post-infra-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.posterior_fracture_type === option.value}
                    onSelect={() => updateFormData({ ...formData, posterior_fracture_type: option.value as PosteriorFractureType })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Transindesmal - Morfología */}
      {showLPMorphologyTrans && (
        <QuestionCard questionKey="lp-morph-trans">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.lateral_morphology?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.lateral_morphology
                .filter(o => o.value === 'spiral' || o.value === 'oblique')
                .map((option, index) => (
                  <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                    <SelectionCard
                      id={`lp-morph-trans-${option.value}`}
                      value={option.value}
                      label={option.label}
                      selected={formData.lateral_morphology === option.value}
                      onSelect={() => updateFormData({
                        ...formData,
                        lateral_morphology: option.value as LateralMorphology,
                        has_ct_scan: undefined,
                        posterior_fracture_type: undefined,
                      })}
                      keyboardHint={String(index + 1)}
                    />
                  </div>
                ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Transindesmal - ¿Tiene TAC? */}
      {(showLPHasCTScanTransSpiral || showLPHasCTScanTransOblique) && (
        <QuestionCard questionKey="lp-trans-ct">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.has_ct_scan?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="lp-trans-ct-yes"
                  value="yes"
                  label={options.labels.yes}
                  selected={formData.has_ct_scan === true}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: true,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="lp-trans-ct-no"
                  value="no"
                  label={options.labels.no}
                  selected={formData.has_ct_scan === false}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: false,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Transindesmal - Espiroidea/Oblicua - Tipo posterior (solo si tiene TAC) */}
      {(showLPPosteriorTypeTransSpiral || showLPPosteriorTypeTransOblique) && (
        <QuestionCard questionKey="lp-post-trans">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.posterior_fracture_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.posterior_fracture_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lp-post-trans-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.posterior_fracture_type === option.value}
                    onSelect={() => updateFormData({ ...formData, posterior_fracture_type: option.value as PosteriorFractureType })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Suprasindesmal - Tipo */}
      {showLPSuprasindesmalType && (
        <QuestionCard questionKey="lp-supra-type">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.suprasindesmal_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.suprasindesmal_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lp-supra-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.suprasindesmal_type === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      suprasindesmal_type: option.value as SuprasindesmalType,
                      fibula_trace_pattern: undefined,
                      has_ct_scan: undefined,
                      posterior_fracture_type: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Suprasindesmal - Trazo del peroné */}
      {showLPFibulaTracePattern && (
        <QuestionCard questionKey="lp-trace">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibula_trace_pattern?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibula_trace_patterns.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lp-trace-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.fibula_trace_pattern === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      fibula_trace_pattern: option.value as FibulaTracePattern,
                      has_ct_scan: undefined,
                      posterior_fracture_type: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Suprasindesmal - ¿Tiene TAC? */}
      {(showLPHasCTScanSupraShort || showLPHasCTScanSupraLong || showLPHasCTScanSupraProximal) && (
        <QuestionCard questionKey="lp-supra-ct">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.has_ct_scan?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="lp-supra-ct-yes"
                  value="yes"
                  label={options.labels.yes}
                  selected={formData.has_ct_scan === true}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: true,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="lp-supra-ct-no"
                  value="no"
                  label={options.labels.no}
                  selected={formData.has_ct_scan === false}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: false,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y posterior - Suprasindesmal - Tipo posterior (solo si tiene TAC) */}
      {showLPPosteriorTypeSupra && (
        <QuestionCard questionKey="lp-post-supra">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.posterior_fracture_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.posterior_fracture_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lp-post-supra-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.posterior_fracture_type === option.value}
                    onSelect={() => updateFormData({ ...formData, posterior_fracture_type: option.value as PosteriorFractureType })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y medial - Morfología del medial */}
      {showLMMedialMorphology && (
        <QuestionCard questionKey="lm-medial-morph">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.medial_morphology_lm?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.medial_morphology_lm.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lm-medial-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.medial_morphology === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      medial_morphology: option.value as MedialMorphology,
                      fibula_infrasindesmal_transverse: undefined,
                      fibular_level_for_transverse: undefined,
                      suprasindesmal_type: undefined,
                      lateral_morphology: undefined,
                      fibular_level: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y medial - Oblicuo - ¿Peroné infrasindesmal y transversa? */}
      {showLMFibulaInfraTransverse && (
        <QuestionCard questionKey="lm-infra-trans">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibula_infrasindesmal_transverse?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="lm-infra-trans-yes"
                  value="yes"
                  label={options.labels.yes}
                  selected={formData.fibula_infrasindesmal_transverse === true}
                  onSelect={() => updateFormData({
                    ...formData,
                    fibula_infrasindesmal_transverse: true,
                    fibular_level_for_transverse: undefined,
                    suprasindesmal_type: undefined,
                    lateral_morphology: undefined,
                    fibular_level: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="lm-infra-trans-no"
                  value="no"
                  label={options.labels.no}
                  selected={formData.fibula_infrasindesmal_transverse === false}
                  onSelect={() => updateFormData({
                    ...formData,
                    fibula_infrasindesmal_transverse: false,
                    fibular_level_for_transverse: undefined,
                    suprasindesmal_type: undefined,
                    lateral_morphology: undefined,
                    fibular_level: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y medial - Nivel del peroné */}
      {showLMFibularLevel && (
        <QuestionCard questionKey="lm-fib-level">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibular_level_lm?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibular_levels
                .filter(o => o.value === 'suprasindesmal' || o.value === 'transindesmal')
                .map((option, index) => (
                  <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                    <SelectionCard
                      id={`lm-fib-level-${option.value}`}
                      value={option.value}
                      label={option.value === 'suprasindesmal' ? options.labels.high : options.labels.low}
                      selected={formData.fibular_level_for_transverse === option.value}
                      onSelect={() => updateFormData({
                        ...formData,
                        fibular_level_for_transverse: option.value as FibularLevel,
                        suprasindesmal_type: undefined,
                        lateral_morphology: undefined,
                        fibular_level: undefined,
                      })}
                      keyboardHint={String(index + 1)}
                    />
                  </div>
                ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y medial - Suprasindesmal - Tipo */}
      {showLMSuprasindesmalType && (
        <QuestionCard questionKey="lm-supra-type">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.suprasindesmal_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.suprasindesmal_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lm-supra-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.suprasindesmal_type === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      suprasindesmal_type: option.value as SuprasindesmalType,
                      fibula_trace_pattern: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y medial - Suprasindesmal - Trazo del peroné */}
      {showLMFibulaTracePattern && (
        <QuestionCard questionKey="lm-trace">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibula_trace_pattern?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibula_trace_patterns.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lm-trace-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.fibula_trace_pattern === option.value}
                    onSelect={() => updateFormData({ ...formData, fibula_trace_pattern: option.value as FibulaTracePattern })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y medial - Nivel bajo - Morfología */}
      {showLMFibularMorphology && (
        <QuestionCard questionKey="lm-morph">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.lateral_morphology?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibula_morphology_lm_tri.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`lm-morph-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.lateral_morphology === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      lateral_morphology: option.value as LateralMorphology,
                      fibular_level: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Maleolos lateral y medial - Transversa - Nivel del peroné */}
      {showLMTransverseFibularLevel && (
        <QuestionCard questionKey="lm-trans-level">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibular_level?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibular_levels
                .filter(o => o.value === 'infrasindesmal' || o.value === 'transindesmal')
                .map((option, index) => (
                  <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                    <SelectionCard
                      id={`lm-trans-level-${option.value}`}
                      value={option.value}
                      label={option.label}
                      selected={formData.fibular_level === option.value}
                      onSelect={() => updateFormData({ ...formData, fibular_level: option.value as FibularLevel })}
                      keyboardHint={String(index + 1)}
                    />
                  </div>
                ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Nivel del peroné (Alta/Baja) */}
      {showTrimaleolarFibularHeight && (
        <QuestionCard questionKey="tri-level">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibular_level_tri?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="tri-level-high"
                  value="suprasindesmal"
                  label={options.labels.high}
                  selected={formData.fibular_level === 'suprasindesmal'}
                  onSelect={() => updateFormData({
                    ...formData,
                    fibular_level: 'suprasindesmal' as FibularLevel,
                    suprasindesmal_type: undefined,
                    lateral_morphology: undefined,
                    fibular_level_for_transverse: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="tri-level-low"
                  value="infrasindesmal"
                  label={options.labels.low}
                  selected={formData.fibular_level === 'infrasindesmal'}
                  onSelect={() => updateFormData({
                    ...formData,
                    fibular_level: 'infrasindesmal' as FibularLevel,
                    suprasindesmal_type: undefined,
                    lateral_morphology: undefined,
                    fibular_level_for_transverse: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Suprasindesmal - Tipo */}
      {showTrimaleolarSupraType && (
        <QuestionCard questionKey="tri-supra-type">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.suprasindesmal_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.suprasindesmal_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`tri-supra-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.suprasindesmal_type === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      suprasindesmal_type: option.value as SuprasindesmalType,
                      fibula_trace_pattern: undefined,
                      has_ct_scan: undefined,
                      posterior_fracture_type: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Suprasindesmal - Trazo del peroné */}
      {showTriFibulaTracePattern && (
        <QuestionCard questionKey="tri-trace">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibula_trace_pattern?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibula_trace_patterns.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`tri-trace-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.fibula_trace_pattern === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      fibula_trace_pattern: option.value as FibulaTracePattern,
                      has_ct_scan: undefined,
                      posterior_fracture_type: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Suprasindesmal - ¿Tiene TAC? */}
      {(showTriHasCTScanSupraShort || showTriHasCTScanSupraLong || showTriHasCTScanSupraProximal) && (
        <QuestionCard questionKey="tri-supra-ct">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.has_ct_scan?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="tri-supra-ct-yes"
                  value="yes"
                  label={options.labels.yes}
                  selected={formData.has_ct_scan === true}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: true,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="tri-supra-ct-no"
                  value="no"
                  label={options.labels.no}
                  selected={formData.has_ct_scan === false}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: false,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Suprasindesmal - Tipo posterior (solo si tiene TAC) */}
      {showTriPosteriorTypeSupra && (
        <QuestionCard questionKey="tri-supra-post">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.posterior_fracture_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.posterior_fracture_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`tri-supra-post-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.posterior_fracture_type === option.value}
                    onSelect={() => updateFormData({ ...formData, posterior_fracture_type: option.value as PosteriorFractureType })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Baja - Morfología */}
      {showTrimaleolarMorphology && (
        <QuestionCard questionKey="tri-morph">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.lateral_morphology?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibula_morphology_lm_tri.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`tri-morph-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.lateral_morphology === option.value}
                    onSelect={() => updateFormData({
                      ...formData,
                      lateral_morphology: option.value as LateralMorphology,
                      fibular_level_for_transverse: undefined,
                      has_ct_scan: undefined,
                      posterior_fracture_type: undefined,
                    })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Baja - Transversa - Transindesmal - ¿Tiene TAC? */}
      {showTriHasCTScanTransverse && (
        <QuestionCard questionKey="tri-trans-ct">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.has_ct_scan?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="tri-trans-ct-yes"
                  value="yes"
                  label={options.labels.yes}
                  selected={formData.has_ct_scan === true}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: true,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="tri-trans-ct-no"
                  value="no"
                  label={options.labels.no}
                  selected={formData.has_ct_scan === false}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: false,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Baja - Oblicua/Espiroidea - ¿Tiene TAC? */}
      {(showTriHasCTScanOblique || showTriHasCTScanSpiral) && (
        <QuestionCard questionKey="tri-low-ct">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.has_ct_scan?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="selection-option-enter stagger-1">
                <SelectionCard
                  id="tri-low-ct-yes"
                  value="yes"
                  label={options.labels.yes}
                  selected={formData.has_ct_scan === true}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: true,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="1"
                />
              </div>
              <div className="selection-option-enter stagger-2">
                <SelectionCard
                  id="tri-low-ct-no"
                  value="no"
                  label={options.labels.no}
                  selected={formData.has_ct_scan === false}
                  onSelect={() => updateFormData({
                    ...formData,
                    has_ct_scan: false,
                    posterior_fracture_type: undefined,
                  })}
                  keyboardHint="2"
                />
              </div>
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Baja - Tipo posterior (solo si tiene TAC) */}
      {showTriPosteriorTypeLow && (
        <QuestionCard questionKey="tri-low-post">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.posterior_fracture_type?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.posterior_fracture_types.map((option, index) => (
                <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                  <SelectionCard
                    id={`tri-low-post-${option.value}`}
                    value={option.value}
                    label={option.label}
                    selected={formData.posterior_fracture_type === option.value}
                    onSelect={() => updateFormData({ ...formData, posterior_fracture_type: option.value as PosteriorFractureType })}
                    keyboardHint={String(index + 1)}
                  />
                </div>
              ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
      )}

      {/* PATH: Trimaleolar - Baja - Transversa - Nivel */}
      {showTrimaleolarTransverseLevel && (
        <QuestionCard questionKey="tri-trans-level">
          <QuestionCardHeader>
            <QuestionCardTitle>
              {options.questions.fibular_level?.title}
            </QuestionCardTitle>
          </QuestionCardHeader>
          <QuestionCardContent>
            <div className="flex flex-col gap-2">
              {options.fibular_levels
                .filter(o => o.value === 'infrasindesmal' || o.value === 'transindesmal')
                .map((option, index) => (
                  <div key={option.value} className={`selection-option-enter stagger-${index + 1}`}>
                    <SelectionCard
                      id={`tri-trans-level-${option.value}`}
                      value={option.value}
                      label={option.label}
                      selected={formData.fibular_level_for_transverse === option.value}
                      onSelect={() => updateFormData({
                        ...formData,
                        fibular_level_for_transverse: option.value as FibularLevel,
                        has_ct_scan: undefined,
                        posterior_fracture_type: undefined,
                      })}
                      keyboardHint={String(index + 1)}
                    />
                  </div>
                ))}
            </div>
          </QuestionCardContent>
        </QuestionCard>
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

      {/* Scroll anchor for smooth scroll to new questions */}
      <div ref={formEndRef} />

      <Button
        type="submit"
        disabled={!isFormComplete() || loading}
        className={cn(
          "w-full relative overflow-hidden transition-all duration-300",
          isFormComplete() && !loading
            ? "bg-gradient-to-r from-primary to-primary/90 hover:shadow-lg hover:shadow-primary/25"
            : ""
        )}
        size="lg"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('form.classifying')}
          </span>
        ) : isFormComplete() ? (
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('form.classify')}
          </span>
        ) : (
          t('form.classify')
        )}
      </Button>

      {/* Keyboard shortcuts hint */}
      <p className="text-xs text-muted-foreground text-center">
        {t('form.keyboardHint')}
      </p>
    </form>
  );
}
