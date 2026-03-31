import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Switch } from '@/presentation/ui/switch';
import { Label } from '@/presentation/ui/label';
import { Skeleton } from '@/presentation/ui/skeleton';
import { Mail, MessageSquare, Bell } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import type { NotificationPrefs } from '@/domain/types';

export function NotificationPrefsDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      api.getNotificationPrefs()
        .then(setPrefs)
        .catch(() => setPrefs({ emailEnabled: true, whatsappEnabled: true, pushEnabled: true }));
    }
  }, [open]);

  const handleToggle = async (key: keyof NotificationPrefs) => {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await api.updateNotificationPrefs(updated);
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
      setPrefs(prefs); // revert
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Notification Preferences</DialogTitle>
        </DialogHeader>
        {!prefs ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Email notifications</Label>
                  <p className="text-xs text-muted-foreground">Contributions, payouts, approvals</p>
                </div>
              </div>
              <Switch checked={prefs.emailEnabled} onCheckedChange={() => handleToggle('emailEnabled')} disabled={saving} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">WhatsApp notifications</Label>
                  <p className="text-xs text-muted-foreground">Group activity alerts</p>
                </div>
              </div>
              <Switch checked={prefs.whatsappEnabled} onCheckedChange={() => handleToggle('whatsappEnabled')} disabled={saving} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Push notifications</Label>
                  <p className="text-xs text-muted-foreground">Browser push alerts</p>
                </div>
              </div>
              <Switch checked={prefs.pushEnabled} onCheckedChange={() => handleToggle('pushEnabled')} disabled={saving} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
