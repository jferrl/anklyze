/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SurgicalPanel } from './SurgicalPanel'
import { mockSurgicalStats } from '@/test/mocks/researchMockData'

describe('SurgicalPanel', () => {
  it('renders loading skeleton while fetching', () => {
    render(<SurgicalPanel data={undefined} isLoading={true} />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('renders empty state when no data', () => {
    render(
      <SurgicalPanel
        data={{
          total_records: 0,
          emergency_treatment_distribution: {},
          syndesmosis_repair_count: 0,
          preop_ct_count: 0,
          approach_distribution: {},
        }}
        isLoading={false}
      />,
    )
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('renders empty state when data is undefined', () => {
    render(<SurgicalPanel data={undefined} isLoading={false} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('renders panel title', () => {
    render(<SurgicalPanel data={mockSurgicalStats} isLoading={false} />)
    expect(screen.getByText('Surgical Details')).toBeInTheDocument()
  })

  it('renders total records count', () => {
    render(<SurgicalPanel data={mockSurgicalStats} isLoading={false} />)
    expect(screen.getByText(/150 total records/)).toBeInTheDocument()
  })

  it('renders syndesmosis repair count', () => {
    render(<SurgicalPanel data={mockSurgicalStats} isLoading={false} />)
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('renders preop CT count', () => {
    render(<SurgicalPanel data={mockSurgicalStats} isLoading={false} />)
    expect(screen.getByText('85')).toBeInTheDocument()
  })

  it('renders days to surgery stats', () => {
    render(<SurgicalPanel data={mockSurgicalStats} isLoading={false} />)
    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('3.5')).toBeInTheDocument()
  })

  it('does not render days to surgery when stats missing', () => {
    const dataWithout = {
      ...mockSurgicalStats,
      days_to_surgery_stats: undefined,
    }
    render(<SurgicalPanel data={dataWithout} isLoading={false} />)
    expect(screen.queryByText('4.2')).not.toBeInTheDocument()
  })
})
