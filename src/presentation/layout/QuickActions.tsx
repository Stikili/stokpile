import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Plus, DollarSign, TrendingUp, Calendar, Users, Settings } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
  isAdmin: boolean;
  payoutsAllowed: boolean;
}

export function QuickActions({ onAction, isAdmin, payoutsAllowed }: QuickActionsProps) {
  const [open, setOpen] = useState(false);

  const actions = [
    { id: 'contribution', icon: DollarSign, label: 'Add Contribution', enabled: true },
    { id: 'payout', icon: TrendingUp, label: 'Schedule Payout', enabled: isAdmin && payoutsAllowed, disabledReason: !isAdmin ? 'Only admins can schedule payouts' : 'Payouts are disabled — enable in Group Settings' },
    { id: 'meeting', icon: Calendar, label: 'Schedule Meeting', enabled: isAdmin, disabledReason: 'Only admins can schedule meetings' },
    { id: 'members', icon: Users, label: 'Manage Members', enabled: isAdmin, disabledReason: 'Only admins can manage members' },
    { id: 'info', icon: Settings, label: 'Group Settings', enabled: true },
  ];

  return (
    <div className="fixed bottom-16 lg:bottom-4 right-4 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="lg" className="h-12 w-12 rounded-full shadow-lg">
            <Plus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1.5" align="end">
          <div className="space-y-0.5">
            {actions.map((action) =>
              action.enabled ? (
                <Button
                  key={action.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-sm h-8"
                  onClick={() => { onAction(action.id); setOpen(false); }}
                >
                  <action.icon className="h-3.5 w-3.5 mr-2" />
                  {action.label}
                </Button>
              ) : (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <span className="block">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-sm h-8 opacity-50 cursor-not-allowed"
                        disabled
                      >
                        <action.icon className="h-3.5 w-3.5 mr-2" />
                        {action.label}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left">{action.disabledReason}</TooltipContent>
                </Tooltip>
              )
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
