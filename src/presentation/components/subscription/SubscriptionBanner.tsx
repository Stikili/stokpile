import { AlertTriangle, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { useSubscription } from '@/application/context/SubscriptionContext';

interface SubscriptionBannerProps {
  onUpgradeClick: () => void;
}

export function SubscriptionBanner({ onUpgradeClick }: SubscriptionBannerProps) {
  const { tier, isTrialActive, daysLeftInTrial, isTrialExpired } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Trial with > 7 days left — no banner (TrialBadge in header handles visibility)
  if (isTrialActive && (daysLeftInTrial === null || daysLeftInTrial > 7)) return null;

  // Trial expiring soon
  if (isTrialActive && daysLeftInTrial !== null && daysLeftInTrial >= 0) {
    const urgency = daysLeftInTrial <= 3;
    return (
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-sm
        ${urgency
          ? 'bg-destructive/10 border border-destructive/20 text-destructive'
          : 'bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          {daysLeftInTrial === 0
            ? 'Your free trial expires today.'
            : `Your free trial ends in ${daysLeftInTrial} day${daysLeftInTrial === 1 ? '' : 's'}.`}
          {' '}Upgrade to keep all Pro features.
        </span>
        <Button size="sm" variant={urgency ? 'destructive' : 'default'} className="shrink-0 h-7 text-xs" onClick={onUpgradeClick}>
          Upgrade
        </Button>
        <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Trial expired → now on Free
  if (isTrialExpired || tier === 'free') {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 text-sm bg-muted border border-border">
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1 text-muted-foreground">
          {isTrialExpired ? 'Your trial has ended — you\'re now on the Free plan.' : 'You\'re on the Free plan.'}
          {' '}Upgrade for more features.
        </span>
        <Button size="sm" variant="outline" className="shrink-0 h-7 text-xs" onClick={onUpgradeClick}>
          Upgrade
        </Button>
        <button onClick={() => setDismissed(true)} className="shrink-0 opacity-60 hover:opacity-100" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
