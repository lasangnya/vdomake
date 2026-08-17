'use client';

import { useState } from 'react';
import { Check, Eye, EyeOff, ClipboardPaste, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type KeyValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

export function ApiKeyInput({
  value,
  onChange,
  validationState = 'idle',
  onValidate,
  placeholder = 'sk-…',
}: {
  value: string;
  onChange: (value: string) => void;
  validationState?: KeyValidationState;
  onValidate?: () => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);

  const handlePaste = async () => {
    const text = await navigator.clipboard.readText();
    onChange(text);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'pr-24 font-mono text-sm',
            validationState === 'invalid' && 'border-red-400',
          )}
          aria-label="API key"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {validationState === 'valid' && <Check className="h-4 w-4 text-emerald-500" />}
          {validationState === 'invalid' && <X className="h-4 w-4 text-red-500" />}
          {validationState === 'validating' && (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide key' : 'Show key'}
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
            onClick={handlePaste}
            aria-label="Paste key from clipboard"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={onValidate}
          disabled={!value || validationState === 'validating'}
        >
          {validationState === 'validating' ? 'Validating…' : 'Validate'}
        </Button>
      </div>
    </div>
  );
}
