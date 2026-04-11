import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { ScrollArea } from '@/presentation/ui/scroll-area';

interface TermsOfServiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsOfService({ open, onOpenChange }: TermsOfServiceProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">Last updated: April 2026</p>

            <section>
              <h3 className="font-semibold mb-2">1. Acceptance</h3>
              <p>By creating an account on Stokpile, you agree to these Terms of Service and our Privacy Policy. If you don't agree, do not use the service.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Service description</h3>
              <p>Stokpile is a software platform that helps groups manage savings, contributions, and payouts. We provide record-keeping, communication, and payment-processing tools. <strong>We do not hold or invest your money</strong> — funds are managed by you and your group, with payment processing handled by third parties (Paystack, Flutterwave).</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. Not financial advice</h3>
              <p>Stokpile is not a registered financial services provider (FSP) under the Financial Sector Conduct Authority (FSCA) or any equivalent regulator. We do not give financial, investment, tax, or legal advice. Stokvels in South Africa fall under exempt status — operate within those rules.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. Your responsibilities</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Keep your account credentials secure</li>
                <li>Provide accurate information about yourself and your group</li>
                <li>Comply with the rules of your group and local laws</li>
                <li>Not use the service for fraud, money laundering, or any illegal activity</li>
                <li>Resolve disputes among group members directly — Stokpile is a tool, not a mediator</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Subscription and payment</h3>
              <p>Paid plans (Starter R19/mo, Pro R39/mo) are billed monthly via Paystack. New groups receive a 90-day free trial of Pro features. You may cancel at any time and will retain access until the end of the billing period. Refunds are not provided for partial months.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Data and content</h3>
              <p>You retain ownership of all content and data you create. By uploading content, you grant Stokpile a limited licence to display and process that content for the purpose of providing the service. We will not access your data except as necessary for support, security, or legal compliance.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Termination</h3>
              <p>You may delete your account at any time via Profile → Delete Account. We may suspend or terminate accounts that violate these terms, engage in fraud, or pose a security risk. On termination, your data will be permanently deleted within 30 days.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Limitation of liability</h3>
              <p>Stokpile is provided "as is" without warranty. To the maximum extent permitted by law, we are not liable for: lost contributions or payouts, disputes between members, errors in member-entered data, third-party payment failures, or service interruptions. Our total liability is limited to the amount you paid us in the previous 12 months.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">9. Changes to terms</h3>
              <p>We may update these terms occasionally. Material changes will be notified via in-app announcement or email at least 14 days before taking effect.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">10. Governing law</h3>
              <p>These terms are governed by the laws of the Republic of South Africa. Any disputes will be resolved in the courts of Johannesburg.</p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">11. Contact</h3>
              <p>Questions? Email <a href="mailto:admin@siti-group-ltd.com" className="text-primary underline">admin@siti-group-ltd.com</a></p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
