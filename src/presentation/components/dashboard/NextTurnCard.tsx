import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { RefreshCw, Crown } from 'lucide-react';
import { api } from '@/infrastructure/api';
import type { RotationOrder } from '@/domain/types';

interface NextTurnCardProps {
  groupId: string;
  groupType?: string;
}

const ROTATING_TYPES = new Set(['rotating', 'susu', 'tontine', 'chama']);

export function NextTurnCard({ groupId, groupType }: NextTurnCardProps) {
  const [rotation, setRotation] = useState<RotationOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupType || !ROTATING_TYPES.has(groupType)) {
      setLoading(false);
      return;
    }
    api.getRotationOrder(groupId)
      .then((res) => setRotation(res.rotation))
      .catch(() => setRotation(null))
      .finally(() => setLoading(false));
  }, [groupId, groupType]);

  if (!groupType || !ROTATING_TYPES.has(groupType)) return null;
  if (loading || !rotation || rotation.slots.length === 0) return null;

  const current = rotation.slots[rotation.currentPosition];
  const next = rotation.slots[(rotation.currentPosition + 1) % rotation.slots.length];
  if (!current) return null;

  const displayName = current.fullName
    ? `${current.fullName} ${current.surname || ''}`.trim()
    : current.email;
  const nextName = next?.fullName
    ? `${next.fullName} ${next.surname || ''}`.trim()
    : next?.email;

  return (
    <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/10">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Crown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            Cycle {rotation.currentCycle} · It's their turn
          </p>
          <p className="text-sm font-semibold truncate">{displayName}</p>
        </div>
        {next && next.email !== current.email && (
          <div className="text-right hidden sm:block">
            <Badge variant="outline" className="text-[10px]">Next: {nextName}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
