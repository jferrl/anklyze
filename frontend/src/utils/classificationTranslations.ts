import type { TFunction } from 'i18next';

/**
 * Get the translated fracture description based on the fracture type key
 */
export function getFractureDescription(t: TFunction, fractureType: string): string {
  return t(`results.fractureDescriptions.${fractureType}`);
}

/**
 * Get the translated Lauge-Hansen full name
 */
export function getLaugeHansenFullName(t: TFunction, type: string): string {
  return t(`results.classifications.laugeHansen.${type}_name`);
}

/**
 * Check if an AO/OTA code includes a subtype (has a dot notation like 44-B1.1)
 */
function isAOOTASubtype(code: string): boolean {
  return code.includes('.');
}

/**
 * Get the translated AO/OTA display name (for "not_classifiable" → "No clasificable")
 */
export function getAOOTADisplayName(t: TFunction, code: string): string {
  if (code === 'not_classifiable') {
    return t('results.classifications.aoOta.not_classifiable_name');
  }
  return code;
}

/**
 * Get the "subtype not classifiable" label for AO/OTA codes without a subtype
 */
export function getAOOTASubtypeLabel(t: TFunction, code: string): string | null {
  if (code === 'not_classifiable' || isAOOTASubtype(code)) {
    return null;
  }
  return t('results.classifications.aoOta.subtype_not_classifiable');
}

/**
 * Get the translated Danis-Weber display name (for "not_classifiable" → "No clasificable")
 */
export function getDanisWeberDisplayName(t: TFunction, type: string): string {
  if (type === 'not_classifiable') {
    return t('results.classifications.danisWeber.not_classifiable_name');
  }
  return type;
}

/** Fracture types where Bartonicek requires CT to classify */
const POSTERIOR_NEEDS_CT = new Set([
  'unimaleolar_posterior',
  'bimaleolar_medial_posterior',
  'bimaleolar_lateral_posterior',
  'trimaleolar',
]);

export type BartonicekState = 'classified' | 'no_posterior' | 'no_ct' | 'not_classifiable';

/**
 * Determine the Bartonicek card visual state:
 * - "classified": Bartonicek 1-4 (normal amber card)
 * - "no_posterior": no posterior fracture (muted/gray card) — backend sends "no_posterior_fracture"
 * - "no_ct": posterior fracture present but no CT (warning/orange card)
 * - "not_classifiable": posterior fracture >1/3 pilon — Bartonicek doesn't apply (normal amber card, "No clasificable")
 */
export function getBartonicekState(type: string, fractureType?: string): BartonicekState {
  if (type === 'no_posterior_fracture') {
    return 'no_posterior';
  }
  if (type !== 'not_classifiable') {
    return 'classified';
  }
  if (fractureType && POSTERIOR_NEEDS_CT.has(fractureType)) {
    return 'no_ct';
  }
  if (fractureType === 'posterior_distal_tibia') {
    return 'not_classifiable';
  }
  return 'no_posterior';
}

/**
 * Get the translated Bartonicek main label based on state.
 */
export function getBartonicekDisplayName(t: TFunction, type: string, fractureType?: string): string {
  const state = getBartonicekState(type, fractureType);
  switch (state) {
    case 'no_posterior':
      return t('results.classifications.bartonicek.not_applicable_name');
    case 'no_ct':
      return t('results.classifications.bartonicek.not_classifiable_name');
    case 'not_classifiable':
      return t('results.classifications.bartonicek.not_classifiable_name');
    default:
      return type;
  }
}

/**
 * Get the subtitle/reason for a not_classifiable Bartonicek.
 * Returns null when Bartonicek has an actual classification (type 1-4).
 */
export function getBartonicekReason(t: TFunction, type: string, fractureType?: string): string | null {
  const state = getBartonicekState(type, fractureType);
  switch (state) {
    case 'no_posterior':
      return t('results.classifications.bartonicek.reason_no_posterior');
    case 'no_ct':
      return t('results.classifications.bartonicek.reason_no_ct');
    case 'not_classifiable':
      return t('results.classifications.bartonicek.reason_pilon');
    default:
      return null;
  }
}

