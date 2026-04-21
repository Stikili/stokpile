// Print-friendly contribution receipt the treasurer can save as PDF
// (browser print dialog → Save as PDF) or hand out.

import { useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Printer, Share2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/export';
import { openWhatsAppShare } from '@/lib/whatsappShare';

interface ContributionReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: {
    groupName: string;
    memberName: string;
    memberEmail: string;
    amount: number;
    date: string;
    reference?: string;
    treasurerName?: string;
    treasurerSignature?: string; // free text
    receiptNumber: string;
  };
}

export function ContributionReceiptDialog({ open, onOpenChange, receipt }: ContributionReceiptProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const html = ref.current?.innerHTML || '';
    const w = window.open('', '_blank', 'width=800,height=1100');
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>Receipt ${receipt.receiptNumber}</title>
      <style>
        body { font-family: Inter, system-ui, sans-serif; color: #0a0a0a; margin: 48px; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .muted { color: #666; font-size: 12px; }
        .receipt { max-width: 640px; margin: 0 auto; border: 1px solid #ddd; padding: 36px; border-radius: 16px; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .row:last-child { border-bottom: 0; }
        .big { font-size: 28px; font-weight: 700; color: #0b5b3f; }
        .footer { margin-top: 28px; padding-top: 14px; border-top: 1px solid #eee; font-size: 11px; color: #999; }
        @media print { body { margin: 0; } .receipt { border: 0; } }
      </style></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 200);
  };

  const handleShareToWhatsApp = () => {
    const msg = `Receipt ${receipt.receiptNumber}\n\n` +
      `${receipt.groupName}\n` +
      `${receipt.memberName} — ${formatCurrency(receipt.amount)}\n` +
      `Date: ${formatDate(receipt.date)}\n` +
      (receipt.reference ? `Ref: ${receipt.reference}\n` : '') +
      (receipt.treasurerName ? `\nSigned: ${receipt.treasurerName}` : '');
    openWhatsAppShare({ message: msg });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Contribution receipt</DialogTitle>
          <DialogDescription>Print or save as PDF, or share the details via WhatsApp.</DialogDescription>
        </DialogHeader>

        <div ref={ref}>
          <div className="receipt rounded-xl border bg-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Receipt</p>
                <h1 className="text-xl font-bold">{receipt.groupName}</h1>
              </div>
              <div className="text-right">
                <p className="muted text-xs text-muted-foreground">No.</p>
                <p className="text-sm font-mono">{receipt.receiptNumber}</p>
              </div>
            </div>

            <div className="row flex justify-between py-2.5 border-b text-sm">
              <span className="text-muted-foreground">Member</span>
              <span className="font-medium">{receipt.memberName}</span>
            </div>
            <div className="row flex justify-between py-2.5 border-b text-sm">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono text-xs">{receipt.memberEmail}</span>
            </div>
            <div className="row flex justify-between py-2.5 border-b text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{formatDate(receipt.date)}</span>
            </div>
            {receipt.reference && (
              <div className="row flex justify-between py-2.5 border-b text-sm">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{receipt.reference}</span>
              </div>
            )}
            <div className="row flex justify-between py-3 text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="big text-2xl font-bold text-primary">{formatCurrency(receipt.amount)}</span>
            </div>

            {(receipt.treasurerName || receipt.treasurerSignature) && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-xs text-muted-foreground">Signed</p>
                <p className="text-sm font-medium">{receipt.treasurerName}</p>
                {receipt.treasurerSignature && (
                  <p className="text-[11px] text-muted-foreground italic mt-0.5">{receipt.treasurerSignature}</p>
                )}
              </div>
            )}

            <div className="footer mt-4 pt-3 border-t text-[10px] text-muted-foreground">
              Generated by Stokpile · stokpile.app · {new Date().toLocaleDateString('en-ZA')}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleShareToWhatsApp}>
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            WhatsApp
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Print / PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
