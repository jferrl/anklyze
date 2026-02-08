/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DemographicPanel } from './DemographicPanel'
import { mockDemographicStats } from '@/test/mocks/researchMockData'

describe('DemographicPanel', () => {
  it('renders loading skeleton while fetching', () => {
    render(<DemographicPanel data={undefined} isLoading={true} />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('renders empty state when no data', () => {
    render(
      <DemographicPanel
        data={{ total_records: 0, sex_distribution: {}, bmi_distribution: {}, age_group_distribution: {} }}
        isLoading={false}
      />,
    )
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('renders empty state when data is undefined', () => {
    render(<DemographicPanel data={undefined} isLoading={false} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('renders panel title', () => {
    render(<DemographicPanel data={mockDemographicStats} isLoading={false} />)
    expect(screen.getByText('Demographics')).toBeInTheDocument()
  })

  it('renders total records count', () => {
    render(<DemographicPanel data={mockDemographicStats} isLoading={false} />)
    expect(screen.getByText(/150 total records/)).toBeInTheDocument()
  })

  it('renders summary table with correct age values', () => {
    render(<DemographicPanel data={mockDemographicStats} isLoading={false} />)
    // mean age
    expect(screen.getByText('52.3')).toBeInTheDocument()
    // SD
    expect(screen.getByText('16.8')).toBeInTheDocument()
  })

  it('renders BMI stats when available', () => {
    render(<DemographicPanel data={mockDemographicStats} isLoading={false} />)
    expect(screen.getByText('26.4')).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
  })

  it('renders vitamin D stats when available', () => {
    render(<DemographicPanel data={mockDemographicStats} isLoading={false} />)
    expect(screen.getByText('28.5')).toBeInTheDocument()
  })

  it('does not render age stats when missing', () => {
    const dataWithoutAge = {
      ...mockDemographicStats,
      age_stats: undefined,
    }
    render(<DemographicPanel data={dataWithoutAge} isLoading={false} />)
    expect(screen.queryByText('52.3')).not.toBeInTheDocument()
  })
})
