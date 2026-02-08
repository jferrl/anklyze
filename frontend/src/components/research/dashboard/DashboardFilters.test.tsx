/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DashboardFilters } from './DashboardFilters'

describe('DashboardFilters', () => {
  it('renders all filter controls', () => {
    render(<DashboardFilters filters={{}} onChange={vi.fn()} />)

    expect(screen.getByText(/sex/i)).toBeInTheDocument()
    expect(screen.getByText(/energy/i)).toBeInTheDocument()
    expect(screen.getByText(/laterality/i)).toBeInTheDocument()
  })

  it('renders all toggle options', () => {
    render(<DashboardFilters filters={{}} onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Male' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Female' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Low' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Left' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Right' })).toBeInTheDocument()
  })

  it('calls onChange when sex filter changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DashboardFilters filters={{}} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Female' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sex: 'female' }))
  })

  it('calls onChange when energy filter changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DashboardFilters filters={{}} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'High' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ trauma_energy: 'high' }),
    )
  })

  it('calls onChange when laterality filter changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DashboardFilters filters={{}} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Left' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ laterality: 'left' }),
    )
  })

  it('deselects filter when clicking active option', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DashboardFilters filters={{ sex: 'female' }} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Female' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sex: undefined }),
    )
  })

  it('shows clear button when filters are active', () => {
    render(
      <DashboardFilters
        filters={{ sex: 'female', trauma_energy: 'high' }}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
  })

  it('does not show clear button when no filters are active', () => {
    render(<DashboardFilters filters={{}} onChange={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
  })

  it('clears all filters on clear button click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <DashboardFilters
        filters={{ sex: 'female', trauma_energy: 'high' }}
        onChange={onChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /clear/i }))
    expect(onChange).toHaveBeenCalledWith({})
  })

  it('highlights active filter buttons', () => {
    render(
      <DashboardFilters filters={{ sex: 'male' }} onChange={vi.fn()} />,
    )

    const maleBtn = screen.getByRole('button', { name: 'Male' })
    const femaleBtn = screen.getByRole('button', { name: 'Female' })

    expect(maleBtn).toHaveAttribute('aria-pressed', 'true')
    expect(femaleBtn).toHaveAttribute('aria-pressed', 'false')
  })
})
