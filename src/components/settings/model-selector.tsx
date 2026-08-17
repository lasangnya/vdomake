'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { ProviderId } from '@/types/provider';

export function ModelSelector({
  models,
  value,
  onChange,
  label = 'Model',
  id,
}: {
  models: string[];
  value: string;
  onChange: (model: string) => void;
  label?: string;
  id: string;
}) {
  if (models.length === 0) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Custom model name"
        className="h-8 font-mono text-xs"
        aria-label={label}
      />
    );
  }
  return (
    <Select
      value={value}
      onValueChange={(model) => {
        if (model) onChange(model);
      }}
    >
      <SelectTrigger id={id} className="h-8 w-full font-mono text-xs" aria-label={label}>
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model} value={model} className="font-mono text-xs">
            {model}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ProviderSelect({
  providers,
  value,
  onChange,
  id,
  label,
}: {
  providers: Array<{ id: ProviderId; name: string }>;
  value: string;
  onChange: (providerId: ProviderId) => void;
  id: string;
  label: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(providerId) => {
        if (providerId) onChange(providerId as ProviderId);
      }}
    >
      <SelectTrigger id={id} className="h-8 w-full text-xs" aria-label={label}>
        <SelectValue placeholder="Provider" />
      </SelectTrigger>
      <SelectContent>
        {providers.map((provider) => (
          <SelectItem key={provider.id} value={provider.id} className="text-xs">
            {provider.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
