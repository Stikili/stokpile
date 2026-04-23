import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { ScrollArea } from '@/presentation/ui/scroll-area';

interface PrivacyPolicyProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicy({ open, onOpenChange }: PrivacyPolicyProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Privacy Policy</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Last updated: April 2026</p>

            <section>
              <h3 className="font-semibold mb-2">1. Who we are</h3>
              <p>Stokpile is a group savings and stokvel management platform. We are committed to protecting your personal information in compliance with the Protection of Personal Information Act (POPIA) and applicable data protection laws across SADC.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. What we collect</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account data:</strong> name, surname, email, country, phone number</li>
                <li><strong>Group data:</strong> contributions, payouts, meetings, votes, notes you create or are shared with</li>
                <li><strong>Payment data:</strong> processed by Paystack and Flutterwave (we do not store card numbers)</li>
                <li><strong>Technical data:</strong> IP address, browser, device, session timestamps</li>
                <li><strong>Optional uploads:</strong> payment proofs, group documents</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. How we use your data</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>To provide the service: creating groups, tracking contributions, processing payouts</li>
                <li>To send notifications via SMS, email, or in-app</li>
                <li>To process subscription payments</li>
                <li>To improve security and detect fraud</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Who we share with</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Other group members</strong> — your contributions and activity are visible within your groups</li>
                <li><strong>Paystack and Flutterwave</strong> — for payment processing</li>
                <li><strong>Africa's Talking</strong> — for SMS delivery</li>
                <li><strong>Supabase</strong> — our hosting and database provider</li>
              </ul>
              <p className="mt-2">We never sell your data to third parties.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Your rights</h3>
              <p>Under POPIA and similar laws, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Access the data we hold about you</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and all associated data (Profile menu → Delete Account)</li>
                <li>Object to certain processing</li>
                <li>Lodge a complaint with the Information Regulator (South Africa) or your country's equivalent</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Data retention</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Active accounts:</strong> retained indefinitely while you continue to use the service</li>
                <li><strong>Cancelled subscriptions:</strong> group data retained for 12 months so you can reactivate without losing history</li>
                <li><strong>After 12 months of inactivity:</strong> personal identifiers are anonymised; aggregated financial records remain for audit purposes</li>
                <li><strong>Deleted accounts:</strong> personal data purged within 30 days (POPIA s. 14)</li>
                <li><strong>Audit logs:</strong> retained for 90 days then removed automatically</li>
                <li><strong>Financial records</strong> (contribution / payout amounts, dates, references): retained for 5 years, anonymised after account deletion — required under the Financial Intelligence Centre Act 38 of 2001</li>
                <li><strong>AI assistant prompts:</strong> retained in the usage ledger for 180 days for billing accuracy and abuse prevention, then deleted</li>
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">See our <strong>Cancellation Policy</strong> for a fuller explanation of what happens to your group's data after cancellation.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Security</h3>
              <p>We use HTTPS encryption, secure password hashing, role-based access control, and regular security audits. However, no online service can guarantee absolute security.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Contact</h3>
              <p>For privacy questions or to exercise your rights, email us at <a href="mailto:admin@siti-group-ltd.com" className="text-primary underline">admin@siti-group-ltd.com</a></p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
