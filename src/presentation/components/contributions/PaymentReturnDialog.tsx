import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';

export type PaymentReturnOutcome = 'success' | 'failed';

export interface PaymentReturn {
  outcome: PaymentReturnOutcome;
  reference?: string;
}

/**
 * Reads the provider's return URL. Flutterwave appends its own `status`
 * (successful | completed | cancelled | failed) to our redirect, which always
 * says `payment=success`, so `status` is the source of truth when present.
 * Returns null when the URL is not a payment return.
 */
export function readPaymentReturn(search: string): PaymentReturn | null {
  const params = new URLSearchParams(search);
  if (!params.has('payment')) return null;
  const status = params.get('status')?.toLowerCase();
  const ok = status
    ? status === 'successful' || status === 'completed'
    : params.get('payment') === 'success';
  return {
    outcome: ok ? 'success' : 'failed',
    reference: params.get('tx_ref') ?? undefined,
  };
}

interface PaymentReturnDialogProps {
  result: PaymentReturn | null;
  onClose: () => void;
  onOpenContributions: () => void;
}

export function PaymentReturnDialog({ result, onClose, onOpenContributions }: PaymentReturnDialogProps) {
  if (!result) return null;
  const ok = result.outcome === 'success';

  const goToContributions = () => {
    onOpenContributions();
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2">
            {ok
              ? <CheckCircle2 className="h-8 w-8 text-primary" />
              : <XCircle className="h-8 w-8 text-destructive" />}
          </div>
          <DialogTitle>{ok ? 'Payment sent' : 'Payment didn’t go through'}</DialogTitle>
          <DialogDescription>
            {ok
              ? 'We’re confirming it with the payment provider. It will show as paid for your group, usually within a minute.'
              : 'Nothing was taken and nothing was recorded. You can pay another way or try again.'}
          </DialogDescription>
        </DialogHeader>

        {result.reference && (
          <p className="text-xs text-muted-foreground font-mono break-all">Ref {result.reference}</p>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
          {ok ? (
            <Button onClick={goToContributions}>View contributions</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>Not now</Button>
              <Button variant="outline" onClick={goToContributions}>Try again</Button>
              <Button onClick={goToContributions}>Paid cash or EFT? Add proof</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
