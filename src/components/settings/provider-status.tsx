'use client';

import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProviderConnectionStatus =
  'connected' | 'invalid' | 'not_configured' | 'rate_limited' | 'validating';

const STATUS_STYLES: Record<ProviderConnectionStatus, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'bg-emerald-100 text-emerald-700' },
  invalid: { label: 'Invalid Key', className: 'bg-red-100 text-red-700' },
  not_configured: { label: 'Not Configured', className: 'bg-zinc-100 text-zinc-600' },
  rate_limited: { label: 'Rate Limited', className: 'bg-amber-100 text-amber-700' },
  validating: { label: 'Validating', className: 'bg-violet-100 text-violet-700' },
};

export function ProviderStatus({ status }: { status: ProviderConnectionStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <Badge variant="secondary" className={cn('gap-1.5', style.className)}>
      {status === 'validating' && <Loader2 className="h-3 w-3 animate-spin" />}
      {style.label}
    </Badge>
  );
}
