/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FracturePanel } from './FracturePanel'
import { mockFractureStats } from '@/test/mocks/researchMockData'

describe('FracturePanel', () => {
  it('renders loading skeleton while fetching', () => {
    render(<FracturePanel data={undefined} isLoading={true} />)
    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })

  it('renders empty state when no data', () => {
    render(
      <FracturePanel
        data={{
          total_records: 0,
          laterality_distribution: {},
          mechanism_distribution: {},
          trauma_energy_distribution: {},
          open_closed_distribution: {},
        }}
        isLoading={false}
      />,
    )
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('renders empty state when data is undefined', () => {
    render(<FracturePanel data={undefined} isLoading={false} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })

  it('renders panel title', () => {
    render(<FracturePanel data={mockFractureStats} isLoading={false} />)
    expect(screen.getByText('Fracture Characteristics')).toBeInTheDocument()
  })

  it('renders total records count', () => {
    render(<FracturePanel data={mockFractureStats} isLoading={false} />)
    expect(screen.getByText(/150 total records/)).toBeInTheDocument()
  })

  it('renders trauma energy labels', () => {
    render(<FracturePanel data={mockFractureStats} isLoading={false} />)
    expect(screen.getByText('Low')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('renders open/closed labels', () => {
    render(<FracturePanel data={mockFractureStats} isLoading={false} />)
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('renders trauma energy values', () => {
    render(<FracturePanel data={mockFractureStats} isLoading={false} />)
    expect(screen.getByText('95')).toBeInTheDocument()
    expect(screen.getByText('55')).toBeInTheDocument()
  })
})
