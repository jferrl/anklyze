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
export function isAOOTASubtype(code: string): boolean {
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

/**
 * Get the translated Bartonicek display name (for "not_classifiable" → "No clasificable")
 */
export function getBartonicekDisplayName(t: TFunction, type: string): string {
  if (type === 'not_classifiable') {
    return t('results.classifications.bartonicek.not_classifiable_name');
  }
  return type;
}

/**
 * Get the translated impossible reason
 */
export function getImpossibleReason(t: TFunction, impossibleKey: string): string {
  return t(`results.impossible.${impossibleKey}`);
}
