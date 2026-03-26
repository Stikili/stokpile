import { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { X, Lightbulb, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface Tip {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ContextualTipsProps {
  context: 'dashboard' | 'contributions' | 'payouts' | 'meetings' | 'info';
  isAdmin: boolean;
  hasData: boolean;
}

export function ContextualTips({ context, isAdmin, hasData }: ContextualTipsProps) {
  const [dismissedTips, setDismissedTips] = useState<string[]>(() => {
    const saved = localStorage.getItem('dismissedTips');
    return saved ? JSON.parse(saved) : [];
  });

  const allTips: Record<string, Tip[]> = {
    dashboard: [
      {
        id: 'dashboard-overview',
        icon: TrendingUp,
        title: 'Track Your Progress',
        description: 'Your dashboard shows real-time financial metrics. The contribution chart helps visualize payment trends over time.',
        action: isAdmin ? {
          label: 'View Reports',
          onClick: () => {}
        } : undefined
      },
      {
        id: 'dashboard-quick-actions',
        icon: Lightbulb,
        title: 'Quick Actions Available',
        description: 'Use the blue floating button (bottom right) to quickly record contributions or create meetings without switching tabs.',
      }
    ],
    contributions: [
      {
        id: 'contributions-record',
        icon: DollarSign,
        title: hasData ? 'Export Your Data' : 'Start Recording Contributions',
        description: hasData 
          ? 'You can export contribution records to CSV for external reporting or record-keeping.'
          : 'Record member contributions to start tracking your group\'s savings. You can add multiple contributions at once.',
        action: hasData ? {
          label: 'Export to CSV',
          onClick: () => {}
        } : undefined
      },
      {
        id: 'contributions-frequency',
        icon: Calendar,
        title: 'Set Contribution Frequency',
        description: 'Configure how often members should contribute (weekly, monthly, etc.) in the Group Settings tab. This helps track who\'s up to date.',
      }
    ],
    meetings: [
      {
        id: 'meetings-organization',
        icon: Calendar,
        title: 'Organize Everything by Meeting',
        description: 'Each meeting can have an agenda, attendance register, notes, votes, and chat. All meeting-specific content is kept together for easy reference.',
      },
      {
        id: 'meetings-attendance',
        icon: Users,
        title: 'Members Can Self-Register',
        description: 'Members can mark their own attendance as present or absent. Admins can also mark attendance for all members.',
      }
    ],
    info: [
      {
        id: 'info-constitution',
        icon: Lightbulb,
        title: 'Upload Your Constitution',
        description: 'Keep your group\'s constitution accessible to all members. Admins can upload and update the document securely.',
      },
      {
        id: 'info-invite',
        icon: Users,
        title: 'Grow Your Group',
        description: 'Invite new members via email or shareable link. You can also make your group discoverable in public searches.',
      }
    ],
    payouts: []
  };

  const tips = allTips[context] || [];
  const visibleTips = tips.filter(tip => !dismissedTips.includes(tip.id));

  const handleDismiss = (tipId: string) => {
    const updated = [...dismissedTips, tipId];
    setDismissedTips(updated);
    localStorage.setItem('dismissedTips', JSON.stringify(updated));
  };

  if (visibleTips.length === 0) return null;

  // Show only the first undismissed tip
  const currentTip = visibleTips[0];
  const Icon = currentTip.icon;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="rounded-full bg-primary/10 p-1.5">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-1">
              <h4 className="text-sm">{currentTip.title}</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0"
                onClick={() => handleDismiss(currentTip.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              {currentTip.description}
            </p>
            {currentTip.action && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={currentTip.action.onClick}>
                {currentTip.action.label}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Reset dismissed tips utility
export function resetContextualTips() {
  localStorage.removeItem('dismissedTips');
}
