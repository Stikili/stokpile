// Refund policy. Conservative drafting language throughout — a SA-qualified
// attorney should redline before publication. Flagged sections marked with
// TODO: lawyer-review.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { ScrollArea } from '@/presentation/ui/scroll-area';

interface RefundPolicyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RefundPolicy({ open, onOpenChange }: RefundPolicyProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Refund Policy</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Last updated: April 2026</p>

            <section>
              <h3 className="font-semibold mb-2">1. What this policy covers</h3>
              <p>This policy applies to Stokpile subscription fees (Starter and Pro monthly plans). It does <strong>not</strong> apply to contributions or payouts between group members — Stokpile does not hold those funds.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. When we will refund</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Duplicate or accidental charges</strong> — if you were billed twice for the same period</li>
                <li><strong>Failed service delivery</strong> — if a verified Stokpile outage prevented you from accessing the paid feature for more than 72 hours in a billing month, we will credit the affected portion</li>
                <li><strong>Unauthorised payments</strong> — if someone made a payment without your consent and you report it within 7 business days</li>
                <li><strong>Cancelled subscription billed after cancellation</strong> — if billing continued after you cancelled through the app, we'll refund the errant charge</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. When we will not refund</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Partial unused subscription months after a mid-period cancellation (you retain access until the end of the period)</li>
                <li>Changes of mind where the service functioned as advertised</li>
                <li>Dissatisfaction with features that are clearly described in the pricing page</li>
                <li>Member disputes within a group (that's between members)</li>
                <li>Fees charged by payment providers (card processing fees, FX spread) — those flow to the provider, not us</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. How to request a refund</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Email <a href="mailto:admin@siti-group-ltd.com" className="text-primary underline">admin@siti-group-ltd.com</a> with the subject "Refund request"</li>
                <li>Include your account email, the transaction reference, the amount, and the reason</li>
                <li>We respond within 3 business days and, where approved, refund via the original payment method</li>
                <li>Refunds are typically settled by your card issuer within 5–10 business days; we do not control the banks' end</li>
              </ol>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Chargebacks</h3>
              <p>If you dispute a charge with your bank before raising it with us, your account may be suspended until the chargeback resolves. We recommend contacting us first — it's faster for everyone.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Statutory rights</h3>
              <p>This policy does not override rights you have under the Consumer Protection Act 68 of 2008 or other applicable legislation in South Africa or your country of residence.</p>
              <p className="text-xs text-muted-foreground mt-1">{/* TODO: lawyer-review — confirm CPA carve-outs for subscription services */}</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Contact</h3>
              <p>Refund queries: <a href="mailto:admin@siti-group-ltd.com" className="text-primary underline">admin@siti-group-ltd.com</a></p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
