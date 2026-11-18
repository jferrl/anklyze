/// <reference types="@testing-library/jest-dom" />
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SystemTabs } from './SystemTabs';
import { SYSTEMS } from './systems';

function Harness() {
  const [active, setActive] = useState('lauge_hansen');
  return <SystemTabs systems={SYSTEMS} active={active} onChange={setActive} panelId="p" />;
}

describe('SystemTabs', () => {
  it('moves selection and focus with arrow keys, wrapping, with one tab in the tab order', () => {
    render(<Harness />);
    const tabs = screen.getAllByRole('tab');

    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1, -1]);

    fireEvent.keyDown(tabs[0], { key: 'ArrowLeft' });
    expect(tabs[3]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[3]).toHaveFocus();

    fireEvent.keyDown(tabs[3], { key: 'ArrowRight' });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-controls', 'p');
    expect(tabs[0]).toHaveAttribute('id', 'p-tab-lauge_hansen');
  });
});
