'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ScrollArea } from '@/components/ui/scroll-area';

// Monaco is loaded lazily from CDN; if it fails (offline/tests) we fall back
// to a styled <pre>. The `mounted` flag keeps SSR + first render consistent.
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), {
  ssr: false,
  loading: () => null,
});

function highlightSyntax(code: string): string {
  return code
    .replace(/(\/\/.*$)/gm, '<span class="text-zinc-500">$1</span>')
    .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-emerald-300">$1</span>')
    .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-emerald-300">$1</span>')
    .replace(
      /\b(import|export|default|from|const|function|return|yield)\b/g,
      '<span class="text-violet-300">$1</span>',
    );
}

function languageFor(filename: string): string {
  if (filename.endsWith('.tsx')) return 'typescript';
  if (filename.endsWith('.json')) return 'json';
  return 'typescript';
}

export function CodePreview({
  files,
  activeFile,
  onChange,
  onFileChange,
}: {
  files: Record<string, string>;
  activeFile: string;
  onChange?: (value: string) => void;
  onFileChange?: (file: string) => void;
}) {
  const filenames = useMemo(() => Object.keys(files).sort((a, b) => a.localeCompare(b)), [files]);
  const content = files[activeFile] ?? '';
  const lang = languageFor(activeFile);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-800 bg-zinc-900 px-2 py-1.5">
        {filenames.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onFileChange?.(name)}
            className={`shrink-0 rounded px-2 py-1 font-mono text-xs transition-colors ${
              name === activeFile
                ? 'bg-violet-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <ScrollArea className="h-[420px]">
        {mounted ? (
          <MonacoEditor
            height="420px"
            language={lang}
            value={content}
            onChange={(value) => onChange?.(value ?? '')}
            theme="vs-dark"
            options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
          />
        ) : (
          <pre
            className="p-4 font-mono text-xs leading-relaxed text-zinc-200"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: highlightSyntax(content) }}
          />
        )}
      </ScrollArea>
    </div>
  );
}
