/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ValidationStep } from './ValidationStep'
import type { ValidationIssue } from '@/services/research/types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}))

const mockError: ValidationIssue = {
  row: 3,
  column: 'age',
  message: 'Invalid age value',
  severity: 'error',
}

const mockWarning: ValidationIssue = {
  row: 5,
  column: 'sex',
  message: 'Ambiguous sex value',
  severity: 'warning',
}

const mockGlobalError: ValidationIssue = {
  row: 0,
  column: '',
  message: 'Missing required column: internal_code',
  severity: 'error',
}

describe('ValidationStep', () => {
  const defaultProps = {
    errors: [] as ValidationIssue[],
    warnings: [] as ValidationIssue[],
    onNext: vi.fn(),
    onBack: vi.fn(),
  }

  describe('no issues', () => {
    it('renders success message when there are no errors or warnings', () => {
      render(<ValidationStep {...defaultProps} />)

      expect(
        screen.getByText('Validation passed with no issues.'),
      ).toBeInTheDocument()
    })

    it('enables the confirm button', () => {
      render(<ValidationStep {...defaultProps} />)

      const confirmBtn = screen.getByRole('button', { name: 'Confirm Import' })
      expect(confirmBtn).not.toBeDisabled()
    })
  })

  describe('blocking errors', () => {
    it('renders error alert with count', () => {
      render(<ValidationStep {...defaultProps} errors={[mockError]} />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('displays individual error messages', () => {
      render(<ValidationStep {...defaultProps} errors={[mockError]} />)

      expect(screen.getByText('Invalid age value')).toBeInTheDocument()
      expect(screen.getByText('Row 3')).toBeInTheDocument()
      expect(screen.getByText('age')).toBeInTheDocument()
    })

    it('displays global error without row number', () => {
      render(<ValidationStep {...defaultProps} errors={[mockGlobalError]} />)

      expect(screen.getByText('Global')).toBeInTheDocument()
      expect(screen.getByText('Missing required column: internal_code')).toBeInTheDocument()
    })

    it('disables the confirm button when errors exist', () => {
      render(<ValidationStep {...defaultProps} errors={[mockError]} />)

      const confirmBtn = screen.getByRole('button', { name: 'Confirm Import' })
      expect(confirmBtn).toBeDisabled()
    })
  })

  describe('warnings only', () => {
    it('renders warnings alert when no errors but warnings present', () => {
      render(<ValidationStep {...defaultProps} warnings={[mockWarning]} />)

      expect(screen.getByText('Ambiguous sex value')).toBeInTheDocument()
    })

    it('enables the confirm button with only warnings', () => {
      render(<ValidationStep {...defaultProps} warnings={[mockWarning]} />)

      const confirmBtn = screen.getByRole('button', { name: 'Confirm Import' })
      expect(confirmBtn).not.toBeDisabled()
    })

    it('displays warning row and column badges', () => {
      render(<ValidationStep {...defaultProps} warnings={[mockWarning]} />)

      expect(screen.getByText('Row 5')).toBeInTheDocument()
      expect(screen.getByText('sex')).toBeInTheDocument()
    })
  })

  describe('mixed errors and warnings', () => {
    it('shows both errors and warnings lists', () => {
      render(
        <ValidationStep
          {...defaultProps}
          errors={[mockError]}
          warnings={[mockWarning]}
        />,
      )

      expect(screen.getByText(/^Errors/)).toBeInTheDocument()
      expect(screen.getByText(/^Warnings/)).toBeInTheDocument()
      expect(screen.getByText('Invalid age value')).toBeInTheDocument()
      expect(screen.getByText('Ambiguous sex value')).toBeInTheDocument()
    })

    it('disables confirm button with mixed issues', () => {
      render(
        <ValidationStep
          {...defaultProps}
          errors={[mockError]}
          warnings={[mockWarning]}
        />,
      )

      const confirmBtn = screen.getByRole('button', { name: 'Confirm Import' })
      expect(confirmBtn).toBeDisabled()
    })
  })

  describe('navigation', () => {
    it('calls onNext when confirm button is clicked', async () => {
      const user = userEvent.setup()
      const onNext = vi.fn()

      render(<ValidationStep {...defaultProps} onNext={onNext} />)

      await user.click(screen.getByRole('button', { name: 'Confirm Import' }))

      expect(onNext).toHaveBeenCalledTimes(1)
    })

    it('calls onBack when back button is clicked', async () => {
      const user = userEvent.setup()
      const onBack = vi.fn()

      render(<ValidationStep {...defaultProps} onBack={onBack} />)

      await user.click(screen.getByRole('button', { name: 'Back' }))

      expect(onBack).toHaveBeenCalledTimes(1)
    })

    it('does not call onNext when confirm is disabled', async () => {
      const user = userEvent.setup()
      const onNext = vi.fn()

      render(
        <ValidationStep {...defaultProps} errors={[mockError]} onNext={onNext} />,
      )

      const confirmBtn = screen.getByRole('button', { name: 'Confirm Import' })
      await user.click(confirmBtn)

      expect(onNext).not.toHaveBeenCalled()
    })
  })
})
