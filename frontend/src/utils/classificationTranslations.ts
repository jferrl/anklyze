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
 * Get the translated AO/OTA display name (for "not_classifiable" → "No clasificable")
 */
export function getAOOTADisplayName(t: TFunction, code: string): string {
  if (code === 'not_classifiable') {
    return t('results.classifications.aoOta.not_classifiable_name');
  }
  return code;
}

/**
 * Get the translated impossible reason
 */
export function getImpossibleReason(t: TFunction, impossibleKey: string): string {
  return t(`results.impossible.${impossibleKey}`);
}
