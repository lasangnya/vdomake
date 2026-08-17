'use client';

import { useCallback, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getProvider } from '@/lib/providers/provider-registry';
import type { ProviderId, ProviderKeyRecord } from '@/types/provider';
import { ApiKeyInput, type KeyValidationState } from './api-key-input';
import { ProviderStatus } from './provider-status';

const PROVIDER_ACCENTS: Record<ProviderId, string> = {
  openai: 'bg-emerald-600',
  anthropic: 'bg-amber-600',
  gemini: 'bg-sky-600',
  ollama: 'bg-fuchsia-600',
  custom: 'bg-zinc-600',
};

export function ProviderCard({
  providerId,
  record,
  onSaveKey,
}: {
  providerId: ProviderId;
  record?: ProviderKeyRecord | null;
  onSaveKey: (key: string) => Promise<void> | void;
}) {
  const provider = getProvider(providerId);
  const [key, setKey] = useState('');
  const [validation, setValidation] = useState<KeyValidationState>('idle');
  const [saving, setSaving] = useState(false);

  const status = record?.isValid === true ? 'connected' : record ? 'invalid' : 'not_configured';

  const handleSave = useCallback(async () => {
    if (!key.trim()) return;
    setSaving(true);
    try {
      await onSaveKey(key.trim());
      setKey('');
      setValidation('valid');
    } catch {
      setValidation('invalid');
    } finally {
      setSaving(false);
    }
  }, [key, onSaveKey]);

  const handleValidate = useCallback(() => {
    setValidation('validating');
    void provider.validateKey(key.trim()).then((ok) => setValidation(ok ? 'valid' : 'invalid'));
  }, [key, provider]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white',
              PROVIDER_ACCENTS[providerId],
            )}
            aria-hidden
          >
            {provider.name.charAt(0)}
          </span>
          <div>
            <CardTitle className="text-base">{provider.name}</CardTitle>
            <CardDescription className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {provider.capabilities.map((cap) => (
                <Badge key={cap} variant="outline" className="text-[10px] capitalize text-zinc-500">
                  {cap}
                </Badge>
              ))}
            </CardDescription>
          </div>
        </div>
        <ProviderStatus status={status} />
      </CardHeader>
      <CardContent>
        <ApiKeyInput
          value={key}
          onChange={setKey}
          validationState={validation}
          onValidate={handleValidate}
          placeholder={record?.keyHint ? `••••${record.keyHint}` : 'Enter API key'}
        />
        <div className="mt-3 space-y-1 text-xs text-zinc-500">
          <p>
            Default models:{' '}
            <span className="font-mono text-zinc-700">{provider.defaultModels.text}</span>
            {provider.defaultModels.vision !== provider.defaultModels.text && (
              <>
                {' · '}
                <span className="font-mono text-zinc-700">{provider.defaultModels.vision}</span>
              </>
            )}
          </p>
          {providerId === 'ollama' && (
            <p className="text-amber-600">
              Local server — key optional, checks Ollama availability.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="justify-end border-t bg-zinc-50 px-4 py-3">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!key.trim() || saving}
          className="bg-violet-600 hover:bg-violet-500"
        >
          {saving ? 'Saving…' : record ? 'Update key' : 'Save key'}
        </Button>
      </CardFooter>
    </Card>
  );
}
