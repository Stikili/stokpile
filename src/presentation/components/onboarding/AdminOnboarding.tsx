import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent } from '@/presentation/ui/card';
import { CheckCircle2, Circle, Users, DollarSign, Calendar, Megaphone, Sparkles, X } from 'lucide-react';

interface AdminOnboardingProps {
  groupId: string;
  groupType?: string;
  onAction: (action: string) => void;
  onDismiss: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  action: string;
  storageKey: string;
}

const STEPS: OnboardingStep[] = [
  {
    id: 'invite',
    title: 'Invite your first members',
    description: 'Add members by email or share a join link. You can also bulk invite via CSV.',
    icon: Users,
    action: 'invite-members',
    storageKey: 'onboarded-invite',
  },
  {
    id: 'contribution',
    title: 'Record a contribution',
    description: 'Track your first contribution to start building the group ledger.',
    icon: DollarSign,
    action: 'contribution',
    storageKey: 'onboarded-contribution',
  },
  {
    id: 'meeting',
    title: 'Schedule a meeting',
    description: 'Set up a recurring meeting so members know when you\'re gathering.',
    icon: Calendar,
    action: 'meeting',
    storageKey: 'onboarded-meeting',
  },
  {
    id: 'announcement',
    title: 'Send an announcement',
    description: 'Welcome members and share group rules or important updates.',
    icon: Megaphone,
    action: 'announcements',
    storageKey: 'onboarded-announcement',
  },
];

export function AdminOnboarding({ groupId, onAction, onDismiss }: AdminOnboardingProps) {
  const [completed, setCompleted] = useState<Set<string>>(() => {
    const stored = new Set<string>();
    for (const s of STEPS) {
      if (localStorage.getItem(`${s.storageKey}-${groupId}`) === 'true') stored.add(s.id);
    }
    return stored;
  });

  const handleStepClick = (step: OnboardingStep) => {
    localStorage.setItem(`${step.storageKey}-${groupId}`, 'true');
    setCompleted(new Set([...completed, step.id]));
    onAction(step.action);
  };

  const allComplete = completed.size === STEPS.length;

  if (allComplete) {
    // Auto-dismiss when all done
    if (!localStorage.getItem(`onboarding-dismissed-${groupId}`)) {
      localStorage.setItem(`onboarding-dismissed-${groupId}`, 'true');
    }
    return null;
  }

  return (
    <Card className="mb-3 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Get your group started</h3>
            <span className="text-xs text-muted-foreground">
              {completed.size}/{STEPS.length} complete
            </span>
          </div>
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {STEPS.map((step) => {
            const isDone = completed.has(step.id);
            const Icon = isDone ? CheckCircle2 : Circle;
            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step)}
                disabled={isDone}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg text-left border transition-all
                  ${isDone
                    ? 'border-green-500/30 bg-green-500/5 opacity-70'
                    : 'border-border bg-background hover:border-primary hover:shadow-sm'}`}
              >
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${isDone ? 'text-green-500' : 'text-muted-foreground'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <step.icon className="h-3.5 w-3.5 text-primary" />
                    <p className={`text-xs font-medium ${isDone ? 'line-through' : ''}`}>{step.title}</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
