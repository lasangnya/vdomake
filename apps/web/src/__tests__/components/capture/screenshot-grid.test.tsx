import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScreenshotGrid } from '@/components/capture/screenshot-grid';

const FRAMES = [
  {
    screenshotUrl: '/api/files/screenshots/p1/frame-0000.png',
    scrollPosition: 0,
    order: 0,
    viewport: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
  },
  {
    screenshotUrl: '/api/files/screenshots/p1/frame-0001.png',
    scrollPosition: 810,
    order: 1,
    viewport: { width: 1440, height: 900, deviceScaleFactor: 2, isMobile: false },
  },
];

describe('ScreenshotGrid', () => {
  it('renders captured frames with metadata', () => {
    render(<ScreenshotGrid frames={FRAMES} />);
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', FRAMES[0].screenshotUrl);
    expect(screen.getByText('y=810 · 1440×900')).toBeInTheDocument();
    expect(screen.getByText('#02')).toBeInTheDocument();
  });

  it('shows skeletons while loading', () => {
    const { container } = render(<ScreenshotGrid frames={[]} loading />);
    expect(
      container.querySelectorAll('.animate-pulse, [data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
  });

  it('shows an empty state', () => {
    render(<ScreenshotGrid frames={[]} />);
    expect(screen.getByText('No screenshots captured yet.')).toBeInTheDocument();
  });

  it('marks mobile frames', () => {
    const mobileFrames = [
      {
        screenshotUrl: '/api/files/screenshots/p1/m.png',
        scrollPosition: 0,
        order: 0,
        viewport: { width: 375, height: 812, deviceScaleFactor: 3, isMobile: true },
      },
    ];
    render(<ScreenshotGrid frames={mobileFrames} />);
    expect(screen.getByText('y=0 · 375×812 · mobile')).toBeInTheDocument();
  });
});
