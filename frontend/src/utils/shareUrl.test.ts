import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  encodeInputToParams,
  decodeParamsToInput,
  generateShareUrl,
  copyToClipboard,
} from './shareUrl'
import type { FractureInput } from '@/types'

describe('shareUrl', () => {
  describe('encodeInputToParams', () => {
    it('encodes basic fracture input', () => {
      const input: FractureInput = {
        involved_malleoli: 'lateral_only',
      }

      const params = encodeInputToParams(input)

      expect(params.get('m')).toBe('lateral_only')
    })

    it('encodes all fields with short keys', () => {
      const input: FractureInput = {
        involved_malleoli: 'trimaleolar',
        posterior_fracture_type: 'posterolateral',
        medial_morphology: 'transverse',
        fibular_level: 'suprasindesmal',
        lateral_morphology: 'spiral',
        suprasindesmal_type: 'simple_diaphyseal',
        fibular_level_for_transverse: 'transindesmal',
      }

      const params = encodeInputToParams(input)

      expect(params.get('m')).toBe('trimaleolar')
      expect(params.get('pt')).toBe('posterolateral')
      expect(params.get('mm')).toBe('transverse')
      expect(params.get('fl')).toBe('suprasindesmal')
      expect(params.get('lm')).toBe('spiral')
      expect(params.get('st')).toBe('simple_diaphyseal')
      expect(params.get('flt')).toBe('transindesmal')
    })

    it('encodes boolean values correctly', () => {
      const input: FractureInput = {
        involved_malleoli: 'lateral_medial',
        fibula_infrasindesmal_transverse: true,
      }

      const params = encodeInputToParams(input)

      expect(params.get('fit')).toBe('1')

      // Test with false value
      const inputFalse: FractureInput = {
        involved_malleoli: 'lateral_medial',
        fibula_infrasindesmal_transverse: false,
      }

      const paramsFalse = encodeInputToParams(inputFalse)
      expect(paramsFalse.get('fit')).toBe('0')
    })

    it('skips undefined and null values', () => {
      const input: FractureInput = {
        involved_malleoli: 'lateral_only',
        posterior_fracture_type: undefined,
        medial_morphology: undefined,
      }

      const params = encodeInputToParams(input)

      expect(params.has('m')).toBe(true)
      expect(params.has('pt')).toBe(false)
      expect(params.has('mm')).toBe(false)
    })

    it('returns empty params for empty input', () => {
      const input: FractureInput = {
        involved_malleoli: undefined as unknown as FractureInput['involved_malleoli'],
      }

      const params = encodeInputToParams(input)
      expect(params.toString()).toBe('')
    })
  })

  describe('decodeParamsToInput', () => {
    it('decodes basic fracture input', () => {
      const params = new URLSearchParams()
      params.set('m', 'lateral_only')

      const input = decodeParamsToInput(params)

      expect(input).toEqual({
        involved_malleoli: 'lateral_only',
      })
    })

    it('decodes all fields from short keys', () => {
      const params = new URLSearchParams()
      params.set('m', 'trimaleolar')
      params.set('pt', 'posterolateral')
      params.set('mm', 'transverse')
      params.set('fl', 'suprasindesmal')
      params.set('lm', 'spiral')
      params.set('st', 'simple_diaphyseal')
      params.set('flt', 'transindesmal')

      const input = decodeParamsToInput(params)

      expect(input).toEqual({
        involved_malleoli: 'trimaleolar',
        posterior_fracture_type: 'posterolateral',
        medial_morphology: 'transverse',
        fibular_level: 'suprasindesmal',
        lateral_morphology: 'spiral',
        suprasindesmal_type: 'simple_diaphyseal',
        fibular_level_for_transverse: 'transindesmal',
      })
    })

    it('decodes boolean values correctly', () => {
      const paramsTrue = new URLSearchParams()
      paramsTrue.set('m', 'lateral_medial')
      paramsTrue.set('fit', '1')

      const inputTrue = decodeParamsToInput(paramsTrue)
      expect(inputTrue?.fibula_infrasindesmal_transverse).toBe(true)

      const paramsFalse = new URLSearchParams()
      paramsFalse.set('m', 'lateral_medial')
      paramsFalse.set('fit', '0')

      const inputFalse = decodeParamsToInput(paramsFalse)
      expect(inputFalse?.fibula_infrasindesmal_transverse).toBe(false)
    })

    it('returns null for empty params', () => {
      const params = new URLSearchParams()

      const input = decodeParamsToInput(params)

      expect(input).toBeNull()
    })

    it('ignores unknown params', () => {
      const params = new URLSearchParams()
      params.set('m', 'lateral_only')
      params.set('unknown', 'value')

      const input = decodeParamsToInput(params)

      expect(input).toEqual({
        involved_malleoli: 'lateral_only',
      })
    })
  })

  describe('round-trip encoding/decoding', () => {
    it('preserves all fields through encode/decode cycle', () => {
      const original: FractureInput = {
        involved_malleoli: 'trimaleolar',
        posterior_fracture_type: 'posterolateral',
        medial_morphology: 'oblique',
        fibular_level: 'transindesmal',
        lateral_morphology: 'oblique',
      }

      const params = encodeInputToParams(original)
      const decoded = decodeParamsToInput(params)

      expect(decoded).toEqual(original)
    })

    it('preserves boolean values through encode/decode cycle', () => {
      const original: FractureInput = {
        involved_malleoli: 'lateral_medial',
        fibula_infrasindesmal_transverse: true,
      }

      const params = encodeInputToParams(original)
      const decoded = decodeParamsToInput(params)

      expect(decoded?.fibula_infrasindesmal_transverse).toBe(true)
    })

    it('handles minimal input through encode/decode cycle', () => {
      const original: FractureInput = {
        involved_malleoli: 'medial_only',
      }

      const params = encodeInputToParams(original)
      const decoded = decodeParamsToInput(params)

      expect(decoded).toEqual(original)
    })
  })

  describe('generateShareUrl', () => {
    beforeEach(() => {
      // Mock window.location.origin
      Object.defineProperty(window, 'location', {
        value: {
          origin: 'https://anklyze.com',
        },
        writable: true,
      })
    })

    it('generates URL with encoded params', () => {
      const input: FractureInput = {
        involved_malleoli: 'lateral_only',
        fibular_level: 'transindesmal',
      }

      const url = generateShareUrl(input)

      expect(url).toBe('https://anklyze.com/classify?m=lateral_only&fl=transindesmal')
    })

    it('generates URL with /classify path', () => {
      const input: FractureInput = {
        involved_malleoli: 'medial_only',
      }

      const url = generateShareUrl(input)

      expect(url).toContain('/classify')
    })

    it('generates valid URL that can be parsed', () => {
      const input: FractureInput = {
        involved_malleoli: 'trimaleolar',
        posterior_fracture_type: 'large_posterolateral',
      }

      const url = generateShareUrl(input)
      const parsed = new URL(url)

      expect(parsed.pathname).toBe('/classify')
      expect(parsed.searchParams.get('m')).toBe('trimaleolar')
      expect(parsed.searchParams.get('pt')).toBe('large_posterolateral')
    })
  })

  describe('copyToClipboard', () => {
    let originalClipboard: Clipboard | undefined

    beforeEach(() => {
      // Store original clipboard
      originalClipboard = navigator.clipboard
    })

    afterEach(() => {
      vi.restoreAllMocks()
      // Restore original clipboard using Object.defineProperty
      if (originalClipboard) {
        Object.defineProperty(navigator, 'clipboard', {
          value: originalClipboard,
          writable: true,
          configurable: true,
        })
      }
    })

    it('copies text using navigator.clipboard.writeText', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock,
        },
        writable: true,
        configurable: true,
      })

      const result = await copyToClipboard('test text')

      expect(result).toBe(true)
      expect(writeTextMock).toHaveBeenCalledWith('test text')
    })

    it('returns true on successful copy', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
        writable: true,
        configurable: true,
      })

      const result = await copyToClipboard('some text')

      expect(result).toBe(true)
    })

    it('falls back to document.execCommand when clipboard API fails', async () => {
      // Make clipboard API fail
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Not supported')),
        },
        writable: true,
        configurable: true,
      })

      // Mock document.execCommand
      const execCommandMock = vi.fn().mockReturnValue(true)
      document.execCommand = execCommandMock

      const result = await copyToClipboard('fallback text')

      expect(result).toBe(true)
      expect(execCommandMock).toHaveBeenCalledWith('copy')
    })

    it('returns false when both methods fail', async () => {
      // Make clipboard API fail
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Not supported')),
        },
        writable: true,
        configurable: true,
      })

      // Make execCommand also fail
      document.execCommand = vi.fn().mockImplementation(() => {
        throw new Error('execCommand failed')
      })

      const result = await copyToClipboard('will fail')

      expect(result).toBe(false)
    })

    it('removes temporary textarea after fallback copy', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Not supported')),
        },
        writable: true,
        configurable: true,
      })

      document.execCommand = vi.fn().mockReturnValue(true)

      const initialTextareas = document.querySelectorAll('textarea').length

      await copyToClipboard('test')

      const finalTextareas = document.querySelectorAll('textarea').length
      expect(finalTextareas).toBe(initialTextareas)
    })
  })
})
