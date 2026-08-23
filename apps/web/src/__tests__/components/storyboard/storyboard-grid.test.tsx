import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StoryboardGrid } from '@/components/storyboard/storyboard-grid';
import type { Scene } from '@/types/scene';

function makeScene(id: string, order: number, title: string): Scene {
  return {
    id,
    order,
    screenshotId: `shot-${id}`,
    title,
    description: '',
    duration: 4,
    transition: { type: 'fade', duration: 0.6, easing: 'smooth' },
    camera: { type: 'static' },
    overlays: [],
  };
}

describe('StoryboardGrid', () => {
  it('renders scenes in order with screenshots mapped by screenshotId', () => {
    const scenes = [makeScene('a', 0, 'Scene A'), makeScene('b', 1, 'Scene B')];
    render(
      <StoryboardGrid
        scenes={scenes}
        screenshotUrls={{ 'shot-a': '/shots/a.png', 'shot-b': '/shots/b.png' }}
      />,
    );
    expect(screen.getByText('Scene A')).toBeInTheDocument();
    expect(screen.getByText('Scene B')).toBeInTheDocument();
    const imgs = screen.getAllByRole('img');
    expect(imgs.map((i) => i.getAttribute('src'))).toEqual(['/shots/a.png', '/shots/b.png']);
  });

  it('renders empty grid for no scenes', () => {
    const { container } = render(<StoryboardGrid scenes={[]} />);
    expect(container.querySelectorAll('[data-slot="card"]')).toHaveLength(0);
  });

  it('handles missing screenshot mapping with fallback text', () => {
    render(<StoryboardGrid scenes={[makeScene('a', 0, 'Scene A')]} />);
    expect(screen.getByText('No screenshot')).toBeInTheDocument();
  });
});
