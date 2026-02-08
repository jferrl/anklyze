/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutcomePanel } from './OutcomePanel'
import { mockOutcomeStats } from '@/test/mocks/researchMockData'

describe('OutcomePanel', () => {
  it('renders loading skeleton while fetching', () => {
    render(<OutcomePanel data={undefined} isLoading={true} />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('renders empty state when no data', () => {
    render(
      <OutcomePanel
        data={{
          total_records: 0,
          secondary_displacement_count: 0,
          complication_distribution: {},
        }}
        isLoading={false}
      />,
    )
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('renders empty state when data is undefined', () => {
    render(<OutcomePanel data={undefined} isLoading={false} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('renders panel title', () => {
    render(<OutcomePanel data={mockOutcomeStats} isLoading={false} />)
    expect(screen.getByText('Outcomes')).toBeInTheDocument()
  })

  it('renders total records count', () => {
    render(<OutcomePanel data={mockOutcomeStats} isLoading={false} />)
    expect(screen.getByText(/150 total records/)).toBeInTheDocument()
  })

  it('renders secondary displacement count', () => {
    render(<OutcomePanel data={mockOutcomeStats} isLoading={false} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('renders displacement percentage', () => {
    render(<OutcomePanel data={mockOutcomeStats} isLoading={false} />)
    expect(screen.getByText(/5\.3%/)).toBeInTheDocument()
  })

  it('renders complication labels', () => {
    render(<OutcomePanel data={mockOutcomeStats} isLoading={false} />)
    expect(screen.getByText('Complications')).toBeInTheDocument()
  })
})
