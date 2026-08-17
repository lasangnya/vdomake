'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export interface UsageLogEntry {
  providerId: string;
  taskType: string;
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;
}

export function UsageDashboard({ logs = [] }: { logs?: UsageLogEntry[] }) {
  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
          <CardDescription>Token and cost tracking per provider</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="text-sm text-zinc-500">No usage recorded yet.</p>
          <p className="text-xs text-zinc-400">
            Usage appears here once you generate storyboards or transcribe audio.
          </p>
        </CardContent>
      </Card>
    );
  }

  const byProvider = new Map<string, { tokens: number; cost: number; tasks: Set<string> }>();
  for (const entry of logs) {
    const bucket = byProvider.get(entry.providerId) ?? { tokens: 0, cost: 0, tasks: new Set() };
    bucket.tokens += entry.tokensIn + entry.tokensOut;
    bucket.cost += entry.estimatedCost;
    bucket.tasks.add(entry.taskType);
    byProvider.set(entry.providerId, bucket);
  }

  const maxTokens = Math.max(...[...byProvider.values()].map((b) => b.tokens), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage</CardTitle>
        <CardDescription>Token and cost tracking per provider</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {[...byProvider.entries()].map(([providerId, bucket]) => (
          <div key={providerId} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium capitalize text-zinc-800">{providerId}</span>
              <span className="text-xs text-zinc-500">
                {bucket.tokens.toLocaleString()} tokens · ${bucket.cost.toFixed(4)}
              </span>
            </div>
            <Progress value={(bucket.tokens / maxTokens) * 100} className="h-1.5" />
            <p className="text-[11px] text-zinc-400">Tasks: {[...bucket.tasks].join(', ')}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
