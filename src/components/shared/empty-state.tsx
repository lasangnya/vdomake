'use client';

import type { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Card className="mx-auto w-full max-w-lg border-dashed">
      <CardHeader className="items-center text-center">
        {icon != null && <div className="mb-2 text-violet-500">{icon}</div>}
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="max-w-sm">{description}</CardDescription>
      </CardHeader>
      {actionLabel !== undefined && onAction !== undefined && (
        <CardContent className="flex justify-center pb-6">
          <Button onClick={onAction} className="bg-violet-600 hover:bg-violet-500">
            <Plus className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
