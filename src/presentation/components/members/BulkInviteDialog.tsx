import { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Textarea } from '@/presentation/ui/textarea';
import { Alert, AlertDescription } from '@/presentation/ui/alert';
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface BulkInviteDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface InviteResult {
  email: string;
  status: 'success' | 'failed';
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BulkInviteDialog({ groupId, open, onOpenChange, onSuccess }: BulkInviteDialogProps) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<InviteResult[]>([]);
  const [processing, setProcessing] = useState(false);

  const parseEmails = (text: string): string[] => {
    return text
      .split(/[\s,;\n]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
      .filter((email, i, arr) => arr.indexOf(email) === i); // dedupe
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setInput(text);
  };

  const handleSubmit = async () => {
    const emails = parseEmails(input);
    if (emails.length === 0) {
      toast.error('No valid emails found');
      return;
    }

    const invalid = emails.filter((e) => !EMAIL_REGEX.test(e));
    if (invalid.length > 0) {
      toast.error(`Invalid emails: ${invalid.slice(0, 3).join(', ')}${invalid.length > 3 ? '…' : ''}`);
      return;
    }

    if (emails.length > 100) {
      toast.error('Maximum 100 emails per batch');
      return;
    }

    setProcessing(true);
    setResults([]);
    const newResults: InviteResult[] = [];

    for (const email of emails) {
      try {
        await api.inviteUser(groupId, email);
        newResults.push({ email, status: 'success' });
      } catch (e) {
        newResults.push({
          email,
          status: 'failed',
          error: e instanceof Error ? e.message : 'Failed',
        });
      }
      setResults([...newResults]);
    }

    setProcessing(false);
    const successCount = newResults.filter((r) => r.status === 'success').length;
    const failCount = newResults.length - successCount;
    if (successCount > 0) toast.success(`Invited ${successCount} member${successCount === 1 ? '' : 's'}`);
    if (failCount > 0) toast.error(`${failCount} invite${failCount === 1 ? '' : 's'} failed`);
    if (successCount > 0 && onSuccess) onSuccess();
  };

  const reset = () => {
    setInput('');
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Invite Members
          </DialogTitle>
          <DialogDescription>
            Paste a list of emails or upload a CSV file. Up to 100 emails per batch.
          </DialogDescription>
        </DialogHeader>

        {results.length === 0 ? (
          <div className="space-y-3">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="alice@example.com, bob@example.com&#10;charlie@example.com&#10;..."
              rows={8}
              disabled={processing}
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <FileText className="h-4 w-4 mr-2" />
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </Button>
              <span className="text-xs text-muted-foreground">
                {parseEmails(input).length} email{parseEmails(input).length === 1 ? '' : 's'} detected
              </span>
            </div>
            <Alert>
              <AlertDescription className="text-xs">
                Members will receive an email invite with a link to join. They must accept to be added to the group.
              </AlertDescription>
            </Alert>
            <Button onClick={handleSubmit} disabled={processing || parseEmails(input).length === 0} className="w-full">
              {processing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending invites…</> : `Send ${parseEmails(input).length} invite${parseEmails(input).length === 1 ? '' : 's'}`}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {results.map((r) => (
              <div key={r.email} className="flex items-center gap-2 text-sm p-2 rounded border bg-card">
                {r.status === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                )}
                <span className="flex-1 truncate">{r.email}</span>
                {r.error && <span className="text-xs text-muted-foreground">{r.error}</span>}
              </div>
            ))}
            {!processing && (
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={reset} className="flex-1">Send More</Button>
                <Button onClick={() => onOpenChange(false)} className="flex-1">Done</Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
