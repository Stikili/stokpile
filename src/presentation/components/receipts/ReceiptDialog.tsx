import { useState } from 'react';
import { toast } from 'sonner';
import { ImageDown, MessageCircle, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { useContributionReceipt } from '@/application/hooks/useContributionReceipt';
import { receiptText } from '@/domain/receipt';
import { money } from '@/lib/money';
import { shareToWhatsApp } from '@/lib/whatsapp';
import { Receipt } from './Receipt';
import { renderReceiptPng } from './receiptImage';

interface ReceiptDialogProps {
  groupId: string;
  groupName: string;
  groupType?: string;
  /** Contribution to show; null closes the dialog. */
  contributionId: string | null;
  onClose: () => void;
}

export function ReceiptDialog({ groupId, groupName, groupType, contributionId, onClose }: ReceiptDialogProps) {
  const model = useContributionReceipt({ groupId, groupName, groupType, contributionId });
  const [busy, setBusy] = useState<null | 'image' | 'print'>(null);

  const shareImage = async () => {
    if (!model) return;
    setBusy('image');
    try {
      const blob = await renderReceiptPng(model);
      const file = new File([blob], `${model.ref}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Receipt ${model.ref}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success('Receipt image saved');
      }
    } catch (err) {
      // A cancelled share sheet is not an error worth reporting.
      if (!(err instanceof DOMException && err.name === 'AbortError')) toast.error('Could not create the receipt image');
    } finally {
      setBusy(null);
    }
  };

  const print = async () => {
    if (!model) return;
    setBusy('print');
    try {
      const blob = await renderReceiptPng(model);
      const url = URL.createObjectURL(blob);
      const win = window.open('', '_blank', 'width=480,height=720');
      if (!win) {
        toast.error('Allow pop-ups to print the receipt');
        return;
      }
      win.document.write(
        `<title>Receipt ${model.ref}</title><body style="margin:0;display:grid;place-items:center">` +
        `<img src="${url}" style="width:360px" onload="setTimeout(function(){print()},150)"></body>`,
      );
      win.document.close();
    } catch {
      toast.error('Could not prepare the receipt for printing');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={!!contributionId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>Share it with the member or the group so everyone sees the same record.</DialogDescription>
        </DialogHeader>

        {model ? <Receipt model={model} /> : <p className="text-sm text-muted-foreground">This payment could not be found.</p>}

        {model && (
          <div className="grid gap-2">
            <Button onClick={shareImage} disabled={busy !== null}>
              {busy === 'image' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageDown className="h-4 w-4 mr-2" />}
              Share receipt image
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => shareToWhatsApp(receiptText(model, (a) => money(a, { decimals: true })))}>
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp text
              </Button>
              <Button variant="outline" onClick={print} disabled={busy !== null}>
                {busy === 'print' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
                Print
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
