import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/ui/dialog';
import { ScrollArea } from '@/presentation/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/presentation/ui/accordion';
import { HelpCircle, Mail, MessageCircle } from 'lucide-react';
import { Button } from '@/presentation/ui/button';

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FAQS = [
  {
    q: 'What is a stokvel?',
    a: 'A stokvel is a community savings group where members contribute regularly and receive payouts in turn or for specific purposes (burial, groceries, investment, education). Stokpile helps you manage these groups transparently.',
  },
  {
    q: 'Is my money safe with Stokpile?',
    a: 'Stokpile does NOT hold your money. We are a record-keeping and management tool. Funds are managed by your group treasurer and processed by licensed providers (Paystack, Flutterwave) when you make contributions through the app.',
  },
  {
    q: 'How do I create a group?',
    a: 'Click your profile icon → Create Group, choose a group type (Rotating, Burial, Grocery, etc.), set the contribution amount and frequency, and invite members.',
  },
  {
    q: 'How do I invite members?',
    a: 'Open the group → Settings → Members → Invite. You can invite by email or share a join link. Bulk import via CSV is also available.',
  },
  {
    q: 'What does the free trial include?',
    a: 'New groups get 90 days of full Pro features for free — unlimited groups, up to 100 members, all reports, analytics, penalties, and audit log. After 90 days, the group reverts to the Free plan unless upgraded.',
  },
  {
    q: 'How does payout rotation work?',
    a: 'For rotating stokvels, set up an order in the Rotation tab. Each cycle, the next member in line receives the payout. Admins can reorder or skip members.',
  },
  {
    q: 'Can I export my data?',
    a: 'Yes — admins can export contributions and payouts to CSV from the relevant tabs. Pro plans include PDF financial reports.',
  },
  {
    q: 'How do I cancel my subscription?',
    a: 'Open the Upgrade dialog → click "Cancel subscription" at the bottom. You\'ll keep access until the end of the billing period.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Profile menu → Delete Account. This permanently removes your account, all groups you created, and all your data. This cannot be undone.',
  },
  {
    q: 'What happens to the group if the admin leaves?',
    a: 'The group needs at least one admin. Promote another member to admin first via Group Settings → Members.',
  },
  {
    q: 'Does Stokpile work offline?',
    a: 'You can view your data offline. New entries made offline are queued and synced when you reconnect.',
  },
  {
    q: 'Which countries are supported?',
    a: 'Stokpile works across SADC and Africa: South Africa, Botswana, Namibia, Lesotho, Eswatini, Zimbabwe, Mozambique, Zambia, Malawi, Angola, DRC, Kenya, Uganda, Tanzania, Rwanda, Ghana, Nigeria, Ethiopia, and more.',
  },
];

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & FAQ
          </DialogTitle>
          <DialogDescription>
            Common questions about Stokpile. Can't find your answer? Contact support.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <a href="mailto:admin@siti-group-ltd.com">
              <Mail className="h-4 w-4 mr-2" />Email Support
            </a>
          </Button>
          <Button variant="outline" size="sm" className="flex-1" asChild>
            {/* TODO: Replace with your real WhatsApp Business number */}
            <a href="https://wa.me/27XXXXXXXXX" target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-4 w-4 mr-2" />WhatsApp
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
