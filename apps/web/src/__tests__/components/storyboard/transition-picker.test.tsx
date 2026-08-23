import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TransitionPicker } from '@/components/storyboard/transition-picker';

describe('TransitionPicker', () => {
  const value = { type: 'fade' as const, duration: 0.6, easing: 'smooth' as const };

  it('renders all transition options', () => {
    render(<TransitionPicker value={value} onChange={vi.fn()} />);
    for (const label of ['Fade', 'Slide', 'Zoom', 'Morph', 'Wipe', 'Dissolve']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('marks the active transition as pressed', () => {
    render(<TransitionPicker value={value} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Fade/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Zoom/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits the new transition type on click', () => {
    const onChange = vi.fn();
    render(<TransitionPicker value={value} onChange={onChange} />);
    const zoomButton = screen.getByRole('button', { name: /Zoom/ });
    // Zoom's accessible name includes "Pull focus" hint text.
    zoomButton.click();
    expect(onChange).toHaveBeenCalledWith({ ...value, type: 'zoom' });
  });

  it('emits easing changes', () => {
    const onChange = vi.fn();
    render(<TransitionPicker value={value} onChange={onChange} />);
    screen.getByRole('button', { name: 'spring' }).click();
    expect(onChange).toHaveBeenCalledWith({ ...value, easing: 'spring' });
  });
});
