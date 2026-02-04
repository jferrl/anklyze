/// <reference types="@testing-library/jest-dom" />
import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'

describe('Button', () => {
  describe('rendering', () => {
    it('renders with default props', () => {
      render(<Button>Click me</Button>)

      const button = screen.getByRole('button', { name: 'Click me' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('data-slot', 'button')
    })

    it('renders children correctly', () => {
      render(<Button>Test Button</Button>)

      expect(screen.getByText('Test Button')).toBeInTheDocument()
    })

    it('renders with custom className', () => {
      render(<Button className="custom-class">Button</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
  })

  describe('variants', () => {
    it('renders default variant correctly', () => {
      render(<Button variant="default">Default</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'default')
      expect(button).toHaveClass('bg-primary')
    })

    it('renders destructive variant correctly', () => {
      render(<Button variant="destructive">Destructive</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'destructive')
      expect(button).toHaveClass('bg-destructive')
    })

    it('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'outline')
      expect(button).toHaveClass('border')
    })

    it('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'secondary')
      expect(button).toHaveClass('bg-secondary')
    })

    it('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'ghost')
    })

    it('renders link variant correctly', () => {
      render(<Button variant="link">Link</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'link')
      expect(button).toHaveClass('text-primary')
    })
  })

  describe('sizes', () => {
    it('renders default size correctly', () => {
      render(<Button size="default">Default Size</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'default')
      expect(button).toHaveClass('h-9')
    })

    it('renders xs size correctly', () => {
      render(<Button size="xs">XS</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'xs')
      expect(button).toHaveClass('h-6')
    })

    it('renders sm size correctly', () => {
      render(<Button size="sm">SM</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'sm')
      expect(button).toHaveClass('h-8')
    })

    it('renders lg size correctly', () => {
      render(<Button size="lg">LG</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'lg')
      expect(button).toHaveClass('h-10')
    })

    it('renders icon size correctly', () => {
      render(<Button size="icon">Icon</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon')
      expect(button).toHaveClass('size-9')
    })

    it('renders icon-xs size correctly', () => {
      render(<Button size="icon-xs">Icon XS</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon-xs')
      expect(button).toHaveClass('size-6')
    })

    it('renders icon-sm size correctly', () => {
      render(<Button size="icon-sm">Icon SM</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon-sm')
      expect(button).toHaveClass('size-8')
    })

    it('renders icon-lg size correctly', () => {
      render(<Button size="icon-lg">Icon LG</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon-lg')
      expect(button).toHaveClass('size-10')
    })
  })

  describe('interactions', () => {
    it('handles onClick events', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(<Button onClick={handleClick}>Click me</Button>)

      await user.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not trigger onClick when disabled', async () => {
      const user = userEvent.setup()
      const handleClick = vi.fn()

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      )

      await user.click(screen.getByRole('button'))

      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('disabled state', () => {
    it('renders disabled button correctly', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('disabled:opacity-50')
      expect(button).toHaveClass('disabled:pointer-events-none')
    })

    it('can be enabled after being disabled', () => {
      const { rerender } = render(<Button disabled>Button</Button>)

      expect(screen.getByRole('button')).toBeDisabled()

      rerender(<Button disabled={false}>Button</Button>)

      expect(screen.getByRole('button')).not.toBeDisabled()
    })
  })

  describe('asChild prop', () => {
    it('renders as Slot when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      )

      const link = screen.getByRole('link', { name: 'Link Button' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/test')
      expect(link).toHaveAttribute('data-slot', 'button')
    })

    it('applies button styles to child element', () => {
      render(
        <Button asChild variant="destructive" size="lg">
          <a href="/test">Styled Link</a>
        </Button>
      )

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('data-variant', 'destructive')
      expect(link).toHaveAttribute('data-size', 'lg')
      expect(link).toHaveClass('bg-destructive')
      expect(link).toHaveClass('h-10')
    })
  })

  describe('button type', () => {
    it('uses type="button" when specified', () => {
      render(<Button type="button">Button Type</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })

    it('uses type="submit" when specified', () => {
      render(<Button type="submit">Submit</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
    })

    it('uses type="reset" when specified', () => {
      render(<Button type="reset">Reset</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset')
    })
  })

  describe('accessibility', () => {
    it('can be focused', async () => {
      const user = userEvent.setup()

      render(<Button>Focusable</Button>)

      const button = screen.getByRole('button')
      await user.tab()

      expect(button).toHaveFocus()
    })

    it('supports aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>)

      expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
    })

    it('supports aria-disabled', () => {
      render(<Button aria-disabled="true">Aria Disabled</Button>)

      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
    })

    it('has appropriate focus styles', () => {
      render(<Button>Focus Me</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('focus-visible:ring-ring/50')
    })
  })

  describe('with icons', () => {
    it('renders with leading icon', () => {
      render(
        <Button>
          <svg data-testid="icon" />
          With Icon
        </Button>
      )

      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('With Icon')).toBeInTheDocument()
    })

    it('renders icon-only button', () => {
      render(
        <Button size="icon" aria-label="Settings">
          <svg data-testid="settings-icon" />
        </Button>
      )

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    })
  })
})
