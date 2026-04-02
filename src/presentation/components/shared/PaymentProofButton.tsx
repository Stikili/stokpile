import { useState } from 'react';
import type { PaymentProof } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { Receipt, Upload, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface PaymentProofButtonProps {
  groupId: string;
  linkedType: 'contribution' | 'payout';
  linkedId: string;
  isAdmin: boolean;
}

export function PaymentProofButton({ groupId, linkedType, linkedId, isAdmin }: PaymentProofButtonProps) {
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState<PaymentProof | null | undefined>(undefined); // undefined = not loaded yet
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const loadProof = async () => {
    setLoading(true);
    try {
      const data = await api.getPaymentProof(groupId, linkedType, linkedId);
      setProof(data.proof);
      if (data.proof) {
        setReferenceNumber(data.proof.referenceNumber || '');
        setNotes(data.proof.notes || '');
      }
    } catch {
      setProof(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (proof === undefined) loadProof();
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      const data = await api.uploadPaymentProof(groupId, linkedType, linkedId, file, referenceNumber || undefined, notes || undefined);
      setProof(data.proof);
      setFile(null);
      toast.success('Payment proof uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deletePaymentProof(groupId, linkedType, linkedId);
      setProof(null);
      setReferenceNumber('');
      setNotes('');
      setDeleteConfirm(false);
      toast.success('Proof removed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove proof');
    }
  };

  const hasProof = proof !== null && proof !== undefined;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${hasProof ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}
            onClick={handleOpen}
            aria-label={hasProof ? 'View payment proof' : 'Attach payment proof'}
          >
            <Receipt className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{hasProof ? 'View payment proof' : 'Attach payment proof'}</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
            <DialogDescription>
              {hasProof ? 'Attached receipt or proof of payment' : 'Upload a receipt or proof of payment'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hasProof ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-sm font-medium">{proof!.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {(proof!.fileSize / 1024).toFixed(1)} KB · Uploaded {new Date(proof!.uploadedAt).toLocaleDateString()}
                </p>
                {proof!.referenceNumber && (
                  <p className="text-xs">Ref: <span className="font-mono">{proof!.referenceNumber}</span></p>
                )}
                {proof!.notes && (
                  <p className="text-xs text-muted-foreground">{proof!.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                {proof!.downloadUrl && (
                  <Button variant="outline" className="flex-1" asChild>
                    <a href={proof!.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open File
                    </a>
                  </Button>
                )}
                {isAdmin && (
                  <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(true)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {isAdmin && (
                <p className="text-xs text-muted-foreground text-center">To replace, delete first then upload a new file.</p>
              )}
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="proof-file">File (PDF, PNG, JPG — max 5 MB)</Label>
                <Input
                  id="proof-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                  disabled={uploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof-ref">Reference Number (optional)</Label>
                <Input
                  id="proof-ref"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. TXN123456"
                  disabled={uploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="proof-notes">Notes (optional)</Label>
                <Textarea
                  id="proof-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional details..."
                  disabled={uploading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={uploading || !file}>
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Upload Proof</>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Remove Payment Proof"
        description="This will permanently remove the attached proof file. This action cannot be undone."
        onConfirm={handleDelete}
        confirmText="Remove"
        variant="destructive"
      />
    </>
  );
}
