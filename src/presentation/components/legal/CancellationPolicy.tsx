// Cancellation policy. Conservative drafting — SA attorney should redline
// before publication. TODO: lawyer-review markers flag ambiguous clauses.

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { ScrollArea } from '@/presentation/ui/scroll-area';

interface CancellationPolicyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancellationPolicy({ open, onOpenChange }: CancellationPolicyProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Cancellation Policy</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Last updated: April 2026</p>

            <section>
              <h3 className="font-semibold mb-2">1. How to cancel</h3>
              <p>You can cancel any paid subscription at any time from <strong>Profile → My Rewards / Upgrade → Cancel subscription</strong> — or by emailing <a href="mailto:admin@siti-group-ltd.com" className="text-primary underline">admin@siti-group-ltd.com</a>.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. What happens immediately</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Billing stops — no further monthly charges</li>
                <li>Your group keeps full access until the end of the current billing period (no pro-rata refund for unused days)</li>
                <li>Your Paystack subscription is disabled at the provider end</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. What happens at the end of the billing period</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>The group drops to the <strong>Free tier</strong> — not deleted</li>
                <li>Paid features (payment proofs, SMS, burial/grocery workflows, reports, analytics, audit log, Pilo AI quota) lock</li>
                <li>Members beyond the Free 8-member cap remain visible but new members can't be added until you free up space or upgrade again</li>
                <li>All contributions, payouts, meetings, and history stay intact</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Data retention after cancellation</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>First 12 months:</strong> your group's data is retained in full. You can reactivate at any time by resubscribing — nothing is lost.</li>
                <li><strong>After 12 months of inactivity and no payment:</strong> personal identifiers are anonymised. Contribution and payout records are preserved in aggregated/anonymous form for auditability.</li>
                <li><strong>Financial records</strong> (contribution amounts, payout amounts, dates) are retained for <strong>5 years</strong> regardless of cancellation — this is required under the Financial Intelligence Centre Act (SA).</li>
                <li><strong>Immediate full deletion</strong> of your personal account is available via <em>Profile → Delete Account</em>. Financial records linked to transactions you participated in remain for the 5-year period, anonymised.</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-1">{/* TODO: lawyer-review — confirm FICA retention is 5 years for stokvel records */}</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Reactivation</h3>
              <p>You can resubscribe any time within the 12-month retention window. Your groups, members, contributions, and payouts return exactly as you left them. After the retention window, you can still recreate groups, but historical data is no longer linked to you.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Free tier cancellation</h3>
              <p>Free tier accounts can be deleted at any time. There is no billing to cancel. Deletion follows the same 30-day personal-data purge described above.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Chargebacks vs cancellation</h3>
              <p>Please cancel through the app or email us before raising a chargeback with your bank. Chargebacks without a prior refund request take 30–90 days to resolve and may result in account suspension while the dispute is open.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. We may cancel your subscription</h3>
              <p>In limited circumstances we may suspend or cancel a subscription — fraud, abuse, prolonged non-payment, or violation of the <em>Terms of Service</em>. We give 14 days' notice except in cases of fraud or security threat.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">9. Contact</h3>
              <p>Cancellation help: <a href="mailto:admin@siti-group-ltd.com" className="text-primary underline">admin@siti-group-ltd.com</a></p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
