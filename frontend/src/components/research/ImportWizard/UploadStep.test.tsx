/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UploadStep } from './UploadStep'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback || _key,
  }),
}))

function createCsvFile(name = 'patients.csv', size?: number) {
  const content = size ? 'x'.repeat(size) : 'code,age,sex\nP001,45,M'
  return new File([content], name, { type: 'text/csv' })
}

describe('UploadStep', () => {
  describe('rendering', () => {
    it('renders the drop zone when no file is selected', () => {
      render(<UploadStep onFileSelected={vi.fn()} />)

      expect(
        screen.getByText('Drag and drop a CSV file, or click to browse'),
      ).toBeInTheDocument()
      expect(screen.getByText('Max file size: 50MB. Only .csv files.')).toBeInTheDocument()
    })

    it('renders the file input with accessible label', () => {
      render(<UploadStep onFileSelected={vi.fn()} />)

      expect(screen.getByLabelText('Select file')).toBeInTheDocument()
    })

    it('renders file info when a file is provided', () => {
      const file = createCsvFile('test-data.csv')

      render(<UploadStep onFileSelected={vi.fn()} file={file} />)

      expect(screen.getByText('test-data.csv')).toBeInTheDocument()
      expect(screen.queryByText('Drag and drop a CSV file, or click to browse')).not.toBeInTheDocument()
    })
  })

  describe('file selection', () => {
    it('calls onFileSelected when a CSV file is chosen via input', async () => {
      const user = userEvent.setup()
      const onFileSelected = vi.fn()

      render(<UploadStep onFileSelected={onFileSelected} />)

      const input = screen.getByLabelText('Select file')
      const file = createCsvFile()

      await user.upload(input, file)

      expect(onFileSelected).toHaveBeenCalledWith(expect.objectContaining({ name: 'patients.csv' }))
    })
  })

  describe('file removal', () => {
    it('calls onFileSelected(null) when remove button is clicked', async () => {
      const user = userEvent.setup()
      const onFileSelected = vi.fn()
      const file = createCsvFile()

      render(<UploadStep onFileSelected={onFileSelected} file={file} />)

      const removeButton = screen.getByRole('button')
      await user.click(removeButton)

      expect(onFileSelected).toHaveBeenCalledWith(null)
    })
  })

  describe('file rejection', () => {
    it('does not call onFileSelected for non-CSV file type', async () => {
      const user = userEvent.setup()
      const onFileSelected = vi.fn()

      render(<UploadStep onFileSelected={onFileSelected} />)

      const input = screen.getByLabelText('Select file')
      const txtFile = new File(['hello'], 'data.txt', { type: 'text/plain' })

      await user.upload(input, txtFile)

      expect(onFileSelected).not.toHaveBeenCalled()
    })
  })
})
