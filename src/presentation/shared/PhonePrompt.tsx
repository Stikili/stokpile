import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Smartphone } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

const DISMISSED_KEY = 'phone-prompt-dismissed-until';
const SNOOZE_DAYS = 7;

interface PhonePromptProps {
  userId: string; // used to re-check per user
}

export function PhonePrompt({ userId }: PhonePromptProps) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;

    // Check snooze
    const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) return;

    // Load profile and check for phone
    api.getProfile().then((profile) => {
      if (!profile.phone) setOpen(true);
    }).catch(() => {});
  }, [userId]);

  const handleSave = async () => {
    const trimmed = phone.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const profile = await api.getProfile();
      await api.updateProfile({
        fullName: profile.fullName,
        surname: profile.surname,
        profilePictureUrl: profile.profilePictureUrl,
        phone: trimmed,
      });
      toast.success('WhatsApp number saved');
      setOpen(false);
    } catch {
      toast.error('Failed to save number');
    } finally {
      setSaving(false);
    }
  };

  const handleRemindLater = () => {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(until));
    setOpen(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={() => handleRemindLater()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-5 w-5 text-primary" />
            <DialogTitle>Add your WhatsApp number</DialogTitle>
          </div>
          <DialogDescription>
            Get notified on WhatsApp when contributions are logged or payouts are scheduled in your group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="phone-prompt">WhatsApp / Cell Number</Label>
          <Input
            id="phone-prompt"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+27 82 123 4567"
            disabled={saving}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleRemindLater} disabled={saving} className="text-muted-foreground">
            Remind me later
          </Button>
          <Button onClick={handleSave} disabled={saving || !phone.trim()} className="flex-1">
            {saving ? 'Saving...' : 'Save Number'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
