import { useState } from 'react';
import { Check, Loader2, Sparkles, Zap, Building2, ExternalLink, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Badge } from '@/presentation/ui/badge';
import { api } from '@/infrastructure/api';
import { useSubscription } from '@/application/context/SubscriptionContext';
import { TIER_PRICES } from '@/domain/types';
import type { SubscriptionTier } from '@/domain/types';
import { toast } from 'sonner';
import { useSession } from '@/application/hooks/useSession';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  reason?: string;
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
    label: 'Starter',
    icon: Sparkles,
    color: 'text-blue-500',
    features: [
      '2 groups',
      'Up to 30 members',
      'Payment proofs',
      'Rotation order manager',
      'Grocery & burial workflows',
      'Mobile money payments',
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
      'Everything in Starter',
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

function CancelButton({ groupId }: { groupId: string }) {
  const { refresh } = useSubscription();
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription? You\'ll keep access until the end of the billing period.')) return;
    setCancelling(true);
    try {
      await api.cancelSubscription(groupId);
      toast.success('Subscription cancelled. Access continues until end of billing period.');
      refresh();
    } catch {
      toast.error('Failed to cancel. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive h-7" onClick={handleCancel} disabled={cancelling}>
      {cancelling ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
      Cancel subscription
    </Button>
  );
}

export function UpgradeDialog({ open, onOpenChange, groupId, reason }: UpgradeDialogProps) {
  const { tier: currentTier, subscription } = useSubscription();
  const { session } = useSession();
  const [upgrading, setUpgrading] = useState<SubscriptionTier | null>(null);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === 'enterprise') return;
    if (!session?.user?.email) { toast.error('Not signed in'); return; }
    setUpgrading(tier);
    try {
      const { authorizationUrl } = await api.initializeBilling(groupId, tier, session.user.email);
      // Redirect to Paystack hosted checkout; callback URL returns user to app
      window.location.href = authorizationUrl;
    } catch {
      toast.error('Could not start payment. Please try again.');
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

        {reason && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 mt-1 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">{reason}</p>
          </div>
        )}

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
                  <a href="mailto:admin@siti-group-ltd.com">Contact Us</a>
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
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Redirecting to payment…</>
                  ) : (
                    <><ExternalLink className="h-3.5 w-3.5 mr-2" />Upgrade to {plan.label}</>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            All plans include a 3-month free trial for new groups. Prices in ZAR.
          </p>
          {subscription?.paystackSubscriptionCode && (
            <CancelButton groupId={groupId} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
