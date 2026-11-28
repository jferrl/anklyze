/// <reference types="@testing-library/jest-dom" />
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AnatomyTabs } from './AnatomyTabs';

// The inactive panel is hidden by its class, which the test DOM does not style, so its state is checked.
const shown = (text: string) => screen.getByText(text).closest('[role="tabpanel"]')?.getAttribute('data-state') === 'active';
const tabs = (complete: boolean) => <AnatomyTabs anatomy={<p>tinted</p>} fracture={<p>broken</p>} complete={complete} />;

describe('AnatomyTabs', () => {
  it('opens on the anatomy and keeps both figures mounted, hiding the other one', () => {
    render(tabs(false));
    expect(shown('tinted')).toBe(true);
    expect(shown('broken')).toBe(false);

    fireEvent.mouseDown(screen.getAllByRole('tab')[1]);
    expect(shown('broken')).toBe(true);
    expect(screen.getByText('tinted')).toBeInTheDocument();
  });

  it('turns to the fracture once the form is complete, and lets the rater turn back', () => {
    const { rerender } = render(tabs(false));
    rerender(tabs(true));
    expect(shown('broken')).toBe(true);

    fireEvent.mouseDown(screen.getAllByRole('tab')[0]);
    rerender(tabs(true));
    expect(shown('tinted')).toBe(true);
  });
});
