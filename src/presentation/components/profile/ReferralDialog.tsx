import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Card, CardContent } from '@/presentation/ui/card';
import { Gift, Copy, Check, Share2, Loader2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReferralData {
  code: string;
  invitedCount: number;
  rewardedCount: number;
}

export function ReferralDialog({ open, onOpenChange }: ReferralDialogProps) {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.getReferral()
      .then((d) => setData(d))
      .catch(() => toast.error('Could not load referral info'))
      .finally(() => setLoading(false));
  }, [open]);

  const referralUrl = data
    ? `${window.location.origin}/?ref=${data.code}`
    : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Stokpile',
          text: 'Manage your stokvel transparently. New groups get 90 days free!',
          url: referralUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Refer & Earn
          </DialogTitle>
          <DialogDescription>
            Invite other groups to Stokpile. Both of you get 1 month of Pro free for every paying referral.
          </DialogDescription>
        </DialogHeader>

        {loading || !data ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{data.invitedCount}</p>
                  <p className="text-xs text-muted-foreground">People invited</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-2xl font-bold text-green-500">{data.rewardedCount}</p>
                  <p className="text-xs text-muted-foreground">Months earned</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Your referral link</p>
              <div className="flex gap-2">
                <Input value={referralUrl} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Code: <span className="font-mono font-semibold">{data.code}</span>
              </p>
            </div>

            <Button onClick={handleShare} className="w-full">
              <Share2 className="h-4 w-4 mr-2" />
              Share Link
            </Button>

            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
              <p className="font-medium mb-1">How it works:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Share your link with friends running stokvels or savings groups</li>
                <li>They sign up and create a paying group</li>
                <li>You both get 1 month free Pro added to your subscriptions</li>
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
