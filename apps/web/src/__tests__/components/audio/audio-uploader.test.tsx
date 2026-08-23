import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioUploader } from '@/components/audio/audio-uploader';

function makeFile(name: string, type = 'audio/mpeg'): File {
  return new File([new Uint8Array(1024)], name, { type });
}

describe('AudioUploader', () => {
  it('renders the drop zone and choose button', () => {
    render(<AudioUploader onUpload={vi.fn()} />);
    expect(screen.getByText(/Drag & drop your voiceover/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeInTheDocument();
  });

  it('calls onUpload with a valid audio file', () => {
    const onUpload = vi.fn();
    render(<AudioUploader onUpload={onUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('voice.mp3')] } });
    expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({ name: 'voice.mp3' }));
  });

  it('shows an error for an unsupported file type', () => {
    const onUpload = vi.fn();
    render(<AudioUploader onUpload={onUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile('notes.txt', 'text/plain')] } });
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
  });

  it('shows an error for oversized files', () => {
    const onUpload = vi.fn();
    render(<AudioUploader onUpload={onUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const big = new File([new Uint8Array(60 * 1024 * 1024)], 'big.mp3', { type: 'audio/mpeg' });
    fireEvent.change(input, { target: { files: [big] } });
    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByText(/too large/i)).toBeInTheDocument();
  });

  it('shows the uploading state', () => {
    render(<AudioUploader onUpload={vi.fn()} isUploading />);
    expect(screen.getByText(/Uploading & transcribing/i)).toBeInTheDocument();
  });
});
