import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SceneCard } from '@/components/storyboard/scene-card';
import type { Scene } from '@/types/scene';

function makeScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 's-1',
    order: 0,
    screenshotId: 'shot-1',
    title: 'Hero section',
    description: 'Opens on the hero',
    duration: 5,
    transition: { type: 'zoom', duration: 0.8, easing: 'spring' },
    camera: { type: 'zoom-to', target: { x: 50, y: 50, scale: 1.5 } },
    overlays: [
      {
        id: 'ov-1',
        text: 'Paste a URL',
        position: { x: 10, y: 10 },
        fontSize: 48,
        color: '#ffffff',
      },
    ],
    ...overrides,
  };
}

describe('SceneCard', () => {
  it('renders scene title, transition, and duration', () => {
    render(<SceneCard scene={makeScene()} screenshotUrl="/shots/1.png" />);
    expect(screen.getByText('Hero section')).toBeInTheDocument();
    expect(screen.getByText(/Zoom · 5s/)).toBeInTheDocument();
  });

  it('renders the screenshot with the scene title as alt', () => {
    render(<SceneCard scene={makeScene()} screenshotUrl="/shots/1.png" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', '/shots/1.png');
    expect(img).toHaveAttribute('alt', 'Hero section');
  });

  it('calls onEdit and onDelete', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<SceneCard scene={makeScene()} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText('Edit Hero section'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 's-1' }));
    fireEvent.click(screen.getByLabelText('Delete Hero section'));
    expect(onDelete).toHaveBeenCalledWith('s-1');
  });

  it('shows overlay and zoom badges', () => {
    render(<SceneCard scene={makeScene()} />);
    expect(screen.getByText('1 overlay')).toBeInTheDocument();
    expect(screen.getByText('2× zoom')).toBeInTheDocument();
  });

  it('shows fallback text when no screenshot', () => {
    render(<SceneCard scene={makeScene()} />);
    expect(screen.getByText('No screenshot')).toBeInTheDocument();
  });
});
