import { Lock } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { useSubscription } from '@/application/context/SubscriptionContext';
import type { SubscriptionFeature } from '@/domain/types';

interface FeatureGateProps {
  feature: SubscriptionFeature;
  mode?: 'overlay' | 'hide' | 'badge';
  onUpgradeClick?: () => void;
  children: React.ReactNode;
}

export function FeatureGate({ feature, mode = 'overlay', onUpgradeClick, children }: FeatureGateProps) {
  const { hasFeature } = useSubscription();

  if (hasFeature(feature)) return <>{children}</>;

  if (mode === 'hide') return null;

  if (mode === 'badge') {
    return (
      <span className="relative inline-flex items-center gap-1">
        {children}
        <Lock className="h-3 w-3 text-muted-foreground" />
      </span>
    );
  }

  // overlay mode
  return (
    <div className="relative min-h-[200px]">
      <div className="pointer-events-none opacity-25 select-none blur-[2px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm rounded-xl border border-border/50">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="font-medium text-sm">Feature locked</p>
          <p className="text-xs text-muted-foreground mt-0.5">Upgrade your plan to access this</p>
        </div>
        {onUpgradeClick && (
          <Button size="sm" onClick={onUpgradeClick}>
            Upgrade Plan
          </Button>
        )}
      </div>
    </div>
  );
}
