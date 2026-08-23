import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExportDialog, type ExportConfigValue } from '@/components/timeline/export-dialog';

describe('ExportDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ExportDialog
        open={false}
        onClose={() => undefined}
        onStart={() => undefined}
        durationSec={10}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('opens with defaults (single, 1080p, h264, 30fps)', () => {
    render(
      <ExportDialog open onClose={() => undefined} onStart={() => undefined} durationSec={10} />,
    );
    expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
    expect(screen.getByText('1080p')).toBeInTheDocument();
    expect(screen.getByText('30 fps')).toBeInTheDocument();
  });

  it('starts an export with the selected resolution and fps', () => {
    const onStart = vi.fn();
    render(<ExportDialog open onClose={() => undefined} onStart={onStart} durationSec={10} />);

    fireEvent.click(screen.getByRole('button', { name: '4K' }));
    fireEvent.click(screen.getByRole('button', { name: '60 fps' }));
    fireEvent.click(screen.getByTestId('export-start'));

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'single',
        format: 'video',
        codec: 'h264',
        frameRate: 60,
      }),
    );
    const config = onStart.mock.calls[0][0] as ExportConfigValue;
    expect(config.resolution).toEqual({ width: 3840, height: 2160 });
  });

  it('includes all resolutions when batch mode is selected', () => {
    const onStart = vi.fn();
    render(<ExportDialog open onClose={() => undefined} onStart={onStart} durationSec={10} />);

    fireEvent.click(screen.getByRole('button', { name: 'Batch (all resolutions)' }));
    fireEvent.click(screen.getByTestId('export-start'));

    const config = onStart.mock.calls[0][0] as ExportConfigValue;
    expect(config.mode).toBe('batch');
    expect(config.batchResolutions).toHaveLength(3);
    expect(config.batchResolutions[0]).toEqual({ width: 1280, height: 720 });
    expect(config.batchResolutions[2]).toEqual({ width: 3840, height: 2160 });
  });

  it('cancels via the cancel button', () => {
    const onClose = vi.fn();
    render(<ExportDialog open onClose={onClose} onStart={() => undefined} durationSec={10} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
