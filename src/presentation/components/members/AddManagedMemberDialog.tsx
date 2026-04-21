import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface AddManagedMemberDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddManagedMemberDialog({ groupId, open, onOpenChange, onSuccess }: AddManagedMemberDialogProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setPhone(''); setEmail(''); };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await api.addManagedMember(groupId, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      toast.success(`${name} added`);
      reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add member without the app
          </DialogTitle>
          <DialogDescription>
            You'll log contributions on their behalf. If they sign up later with the same email,
            the account links up automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="mm-name">Full name <span className="text-destructive">*</span></Label>
            <Input id="mm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Thandi Nkosi" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mm-phone">Phone (optional)</Label>
            <Input id="mm-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 123 4567" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mm-email">Email (optional)</Label>
            <Input id="mm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="thandi@example.com" />
            <p className="text-[11px] text-muted-foreground">
              If they already have a Stokpile account, use that email so the link-up works later.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Adding...</> : 'Add member'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
