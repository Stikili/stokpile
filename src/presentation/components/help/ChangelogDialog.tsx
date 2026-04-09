import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/ui/dialog';
import { ScrollArea } from '@/presentation/ui/scroll-area';
import { Badge } from '@/presentation/ui/badge';
import { Sparkles } from 'lucide-react';

interface ChangelogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'feature' | 'fix';
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.5.0',
    date: '2026-04-09',
    type: 'major',
    title: 'Compliance, accessibility & onboarding',
    changes: [
      'POPIA-compliant Privacy Policy and Terms of Service',
      'Right to deletion: delete account from Profile menu',
      'Email verification on signup',
      'Session management — see and revoke active sessions',
      'Audit log retention (90 days)',
      'Rate limiting on auth endpoints',
      'Help & FAQ centre',
      'In-app changelog',
      'Localised number and date formats per country',
      'Onboarding flow for new admins',
      'Group templates (burial, stokvel, chama presets)',
      'Bulk member import via CSV',
      'Global search across the app',
      'Offline write queue',
      'iOS PWA install banner',
      'Referral system',
    ],
  },
  {
    version: '1.4.0',
    date: '2026-04-07',
    type: 'feature',
    title: 'Subscription tiers with Paystack billing',
    changes: [
      '4 tiers: Free, Community (R49/mo), Pro (R99/mo), Enterprise',
      '90-day free Pro trial for new groups',
      'Paystack hosted checkout integration',
      'Webhook handling for subscription lifecycle',
      'Cancel subscription from in-app dialog',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-04-06',
    type: 'feature',
    title: 'Africa & SADC features',
    changes: [
      'Burial Society, Grocery, Chama, Susu, Tontine, VSLA group types',
      'Rotation order manager',
      'Penalties & fines tracking',
      'SMS notifications via Africa\'s Talking',
      'Flutterwave payment integration',
      'Lite Mode for low-data connections',
      '5 new languages: Setswana, Swahili, Shona, French, Portuguese',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-04-05',
    type: 'feature',
    title: 'Reports, analytics & announcements',
    changes: [
      'Group-wide announcements / broadcast messages',
      'Payment proofs — upload receipts',
      'Financial reports with PDF/CSV export',
      'Analytics dashboard (health score, payment rate, trends)',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-04-04',
    type: 'feature',
    title: 'Usability improvements',
    changes: [
      'Command palette (⌘K) for quick navigation',
      'Context-aware Quick Actions FAB',
      'Mobile More menu with grid layout',
      'Desktop tab overflow with smart highlighting',
    ],
  },
];

const TYPE_COLORS: Record<ChangelogEntry['type'], string> = {
  major: 'bg-primary text-primary-foreground',
  feature: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  fix: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
};

export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            What's New
          </DialogTitle>
          <DialogDescription>
            Recent updates and improvements to Stokpile.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {CHANGELOG.map((entry) => (
              <div key={entry.version} className="space-y-2 pb-4 border-b last:border-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={TYPE_COLORS[entry.type]}>v{entry.version}</Badge>
                  <span className="text-xs text-muted-foreground">{entry.date}</span>
                </div>
                <h3 className="font-semibold text-sm">{entry.title}</h3>
                <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                  {entry.changes.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export const LATEST_VERSION = CHANGELOG[0].version;
