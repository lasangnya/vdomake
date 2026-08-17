import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UrlInput } from '@/components/capture/url-input';

describe('UrlInput', () => {
  it('renders the form with a URL field and submit button', () => {
    render(<UrlInput onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Website URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Capture site/i })).toBeInTheDocument();
  });

  it('rejects empty submission with an error', () => {
    render(<UrlInput onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Capture site/i }));
    expect(screen.getByText('Enter a URL to capture')).toBeInTheDocument();
  });

  it('prepends http:// when localhost mode is enabled', () => {
    const onSubmit = vi.fn();
    render(<UrlInput onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('switch', { name: /Capture localhost/i }));
    fireEvent.change(screen.getByLabelText('Website URL'), { target: { value: 'localhost:3000' } });
    fireEvent.click(screen.getByRole('button', { name: /Capture site/i }));
    expect(onSubmit).toHaveBeenCalledWith('http://localhost:3000', [
      expect.objectContaining({ width: 1440, height: 900, deviceScaleFactor: 2 }),
    ]);
  });

  it('submits the desktop viewport by default', () => {
    const onSubmit = vi.fn();
    render(<UrlInput onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Website URL'), {
      target: { value: 'https://example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Capture site/i }));
    expect(onSubmit).toHaveBeenCalledWith('https://example.com', [
      expect.objectContaining({ width: 1440, height: 900, isMobile: false }),
    ]);
  });

  it('shows submitting state', () => {
    render(<UrlInput onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole('button', { name: /Capturing…/i })).toBeDisabled();
  });
});
