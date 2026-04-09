import { Sparkles } from 'lucide-react';
import { useSubscription } from '@/application/context/SubscriptionContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';

interface TrialBadgeProps {
  onClick: () => void;
}

export function TrialBadge({ onClick }: TrialBadgeProps) {
  const { isTrialActive, daysLeftInTrial } = useSubscription();

  if (!isTrialActive || daysLeftInTrial === null) return null;

  // Color shifts as trial nears expiry
  const urgent = daysLeftInTrial <= 7;
  const warning = daysLeftInTrial <= 14;

  const colorClass = urgent
    ? 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/15'
    : warning
    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/15'
    : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${colorClass}`}
          aria-label={`Trial: ${daysLeftInTrial} days left`}
        >
          <Sparkles className="h-3 w-3" />
          Trial: {daysLeftInTrial}d
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {daysLeftInTrial === 0
          ? 'Trial expires today — click to upgrade'
          : `${daysLeftInTrial} day${daysLeftInTrial === 1 ? '' : 's'} left in your free trial. Click to upgrade.`}
      </TooltipContent>
    </Tooltip>
  );
}
