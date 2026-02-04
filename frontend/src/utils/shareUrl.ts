import type { FractureInput } from '@/types';

// Short keys for URL params to keep URLs compact
const KEY_MAP = {
  involved_malleoli: 'm',
  posterior_fracture_type: 'pt',
  medial_morphology: 'mm',
  fibular_level: 'fl',
  lateral_morphology: 'lm',
  suprasindesmal_type: 'st',
  fibula_infrasindesmal_transverse: 'fit',
  fibular_level_for_transverse: 'flt',
} as const;

// Reverse map for decoding
const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k])
) as Record<string, keyof FractureInput>;

/**
 * Encode FractureInput to URL search params
 */
export function encodeInputToParams(input: FractureInput): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, shortKey] of Object.entries(KEY_MAP)) {
    const value = input[key as keyof FractureInput];
    if (value !== undefined && value !== null) {
      // Convert boolean to '1' or '0'
      if (typeof value === 'boolean') {
        params.set(shortKey, value ? '1' : '0');
      } else {
        params.set(shortKey, String(value));
      }
    }
  }

  return params;
}

/**
 * Decode URL search params to FractureInput
 */
export function decodeParamsToInput(params: URLSearchParams): Partial<FractureInput> | null {
  const input: Partial<FractureInput> = {};
  let hasAnyParam = false;

  for (const [shortKey, fullKey] of Object.entries(REVERSE_KEY_MAP)) {
    const value = params.get(shortKey);
    if (value !== null) {
      hasAnyParam = true;
      // Handle boolean field
      if (fullKey === 'fibula_infrasindesmal_transverse') {
        (input as Record<string, unknown>)[fullKey] = value === '1';
      } else {
        (input as Record<string, unknown>)[fullKey] = value;
      }
    }
  }

  return hasAnyParam ? input : null;
}

/**
 * Generate a shareable URL for the given input
 */
export function generateShareUrl(input: FractureInput): string {
  const params = encodeInputToParams(input);
  const baseUrl = window.location.origin + '/classify';
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Copy text to clipboard and return success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}
