import type { TFunction } from 'i18next';

/**
 * Get the translated fracture description based on the fracture type key
 */
export function getFractureDescription(t: TFunction, fractureType: string): string {
  return t(`results.fractureDescriptions.${fractureType}`);
}

/**
 * Get the translated Danis-Weber description
 */
export function getDanisWeberDescription(t: TFunction, type: string): string {
  // Type comes as "Weber A", "Weber B", "Weber C"
  // Extract just the letter
  const letter = type.split(' ')[1] || type;
  return t(`results.classifications.danisWeber.${letter}_desc`);
}

/**
 * Get the translated Lauge-Hansen full name
 */
export function getLaugeHansenFullName(t: TFunction, type: string, ambiguous?: boolean): string {
  if (ambiguous) {
    return t('results.classifications.laugeHansen.ambiguous_name');
  }
  return t(`results.classifications.laugeHansen.${type}_name`);
}

/**
 * Get the translated Lauge-Hansen description
 */
export function getLaugeHansenDescription(t: TFunction, type: string, ambiguous?: boolean): string {
  if (ambiguous && !type) {
    return t('results.classifications.laugeHansen.unclassifiable_desc');
  }
  if (ambiguous) {
    return t('results.classifications.laugeHansen.ambiguous_desc');
  }
  return t(`results.classifications.laugeHansen.${type}_desc`);
}

/**
 * Get the translated AO/OTA description
 */
export function getAOOTADescription(t: TFunction, code: string): string {
  // Code comes as "44-A1", "44-B2", etc.
  // Extract the part after "44-" and replace hyphen with underscore for translation key
  const key = code.replace('44-', '').replace('-', '');
  return t(`results.classifications.aoOta.${key}_desc`);
}

/**
 * Get the translated Bartonicek description
 */
export function getBartonicekDescription(t: TFunction, type: string): string {
  // Type comes as "Bartonicek 1", "Bartonicek 2", etc.
  // Extract just the number
  const number = type.split(' ')[1] || type;
  return t(`results.classifications.bartonicek.${number}_desc`);
}

/**
 * Get the translated impossible reason
 */
export function getImpossibleReason(t: TFunction, impossibleKey: string): string {
  return t(`results.impossible.${impossibleKey}`);
}
