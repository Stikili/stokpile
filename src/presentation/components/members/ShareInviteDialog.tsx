import { useState, useEffect } from 'react';
import { Button } from '@/presentation/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Share2, Copy, Check } from 'lucide-react';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';

interface ShareInviteDialogProps {
  groupId: string;
  groupName: string;
}

export function ShareInviteDialog({ groupId, groupName }: ShareInviteDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && !inviteLink) {
      generateInviteLink();
    }
  }, [open]);

  const generateInviteLink = async () => {
    setLoading(true);
    try {
      const data = await api.createInviteLink(groupId);
      const baseUrl = window.location.origin;
      const link = `${baseUrl}?invite=${data.token}`;
      setInviteLink(link);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate invite link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `Join our group "${groupName}" on Stokpile!\n\nClick this link to join:\n${inviteLink}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaSMS = () => {
    const message = encodeURIComponent(
      `Join our group "${groupName}" on Stokpile! Click: ${inviteLink}`
    );
    window.location.href = `sms:?body=${message}`;
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Join ${groupName} on Stokpile`);
    const body = encodeURIComponent(
      `You've been invited to join "${groupName}" on Stokpile!\n\nClick this link to join:\n${inviteLink}\n\nSee you there!`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName}`,
          text: `Join our group "${groupName}" on Stokpile!`,
          url: inviteLink
        });
      } catch (error) {
        // User cancelled or error occurred
        console.log('Share cancelled');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Share Invite Link
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Group Invite Link</DialogTitle>
          <DialogDescription>
            Generate and share a join link via WhatsApp, SMS, or other platforms
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Invite Link</Label>
            {loading ? (
              <div className="h-10 bg-muted animate-pulse rounded"></div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="flex-1"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={copyToClipboard} variant="outline" size="icon">
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copied ? 'Copied!' : 'Copy link'}</TooltipContent>
                </Tooltip>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Anyone with this link can join the group automatically
            </p>
          </div>

          <div className="space-y-2">
            <Label>Share via</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={shareViaWhatsApp}
                variant="outline"
                className="w-full"
                disabled={!inviteLink}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                WhatsApp
              </Button>

              <Button
                onClick={shareViaSMS}
                variant="outline"
                className="w-full"
                disabled={!inviteLink}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                SMS
              </Button>

              <Button
                onClick={shareViaEmail}
                variant="outline"
                className="w-full"
                disabled={!inviteLink}
              >
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                Email
              </Button>

              {typeof navigator.share === 'function' && (
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="w-full"
                  disabled={!inviteLink}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  More
                </Button>
              )}
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              💡 <strong>Tip:</strong> Share this link with anyone you want to invite.
              They can sign up and join automatically!
            </p>
          </div>
        </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
