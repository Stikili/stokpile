import { useState } from 'react';
import { Check, Loader2, Sparkles, Zap, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Badge } from '@/presentation/ui/badge';
import { api } from '@/infrastructure/api';
import { useSubscription } from '@/application/context/SubscriptionContext';
import { TIER_PRICES, TIER_FEATURES } from '@/domain/types';
import type { SubscriptionTier } from '@/domain/types';
import { toast } from 'sonner';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
}

const PLANS: {
  tier: SubscriptionTier;
  label: string;
  icon: React.ElementType;
  color: string;
  highlight?: boolean;
  features: string[];
}[] = [
  {
    tier: 'community',
    label: 'Community',
    icon: Sparkles,
    color: 'text-blue-500',
    features: [
      '3 groups',
      'Up to 30 members',
      'Payment proofs',
      'Rotation order manager',
      'Grocery & burial workflows',
      'Flutterwave payments',
      '50 SMS / month',
    ],
  },
  {
    tier: 'pro',
    label: 'Pro',
    icon: Zap,
    color: 'text-primary',
    highlight: true,
    features: [
      'Unlimited groups',
      'Up to 100 members',
      'Everything in Community',
      'Financial reports & PDF export',
      'Analytics dashboard',
      'Penalties & fines',
      'Audit log',
      'Unlimited SMS',
    ],
  },
  {
    tier: 'enterprise',
    label: 'Enterprise',
    icon: Building2,
    color: 'text-purple-500',
    features: [
      'Unlimited everything',
      'Custom branding',
      'API access',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
];

export function UpgradeDialog({ open, onOpenChange, groupId }: UpgradeDialogProps) {
  const { tier: currentTier, refresh } = useSubscription();
  const [upgrading, setUpgrading] = useState<SubscriptionTier | null>(null);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === 'enterprise') return;
    setUpgrading(tier);
    try {
      await api.upgradeSubscription(groupId, tier);
      toast.success(`Upgraded to ${tier.charAt(0).toUpperCase() + tier.slice(1)}!`);
      refresh();
      onOpenChange(false);
    } catch {
      toast.error('Upgrade failed. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const isCurrent = (tier: SubscriptionTier) =>
    tier === currentTier || (currentTier === 'trial' && tier === 'pro');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Upgrade Your Plan</DialogTitle>
          <DialogDescription>
            Choose the plan that fits your group's needs.
            {currentTier === 'trial' && ' Your trial includes all Pro features.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {PLANS.map(plan => (
            <div
              key={plan.tier}
              className={`rounded-xl border p-4 flex flex-col gap-3 relative
                ${plan.highlight
                  ? 'border-primary bg-primary/5 shadow-md'
                  : 'border-border bg-card'}`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="text-[10px] px-2 py-0.5 bg-primary text-primary-foreground">Most Popular</Badge>
                </span>
              )}

              <div className="flex items-center gap-2">
                <plan.icon className={`h-5 w-5 ${plan.color}`} />
                <span className="font-semibold">{plan.label}</span>
                {isCurrent(plan.tier) && (
                  <Badge variant="secondary" className="text-[10px] ml-auto">Current</Badge>
                )}
              </div>

              <p className={`text-xl font-bold ${plan.color}`}>
                {TIER_PRICES[plan.tier]}
              </p>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {plan.tier === 'enterprise' ? (
                <Button variant="outline" className="w-full mt-2" asChild>
                  <a href="mailto:hello@stokpile.app">Contact Us</a>
                </Button>
              ) : isCurrent(plan.tier) ? (
                <Button variant="outline" className="w-full mt-2" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full mt-2"
                  variant={plan.highlight ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.tier)}
                  disabled={!!upgrading}
                >
                  {upgrading === plan.tier ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Upgrading…</>
                  ) : (
                    `Upgrade to ${plan.label}`
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          All plans include a 3-month free trial for new groups. Prices in ZAR.
        </p>
      </DialogContent>
    </Dialog>
  );
}
