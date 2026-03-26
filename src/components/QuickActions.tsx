import { useState } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Plus, DollarSign, TrendingUp, Calendar, Users, Info } from 'lucide-react';

interface QuickActionsProps {
  onAction: (action: string) => void;
  isAdmin: boolean;
  payoutsAllowed: boolean;
}

export function QuickActions({ onAction, isAdmin, payoutsAllowed }: QuickActionsProps) {
  const [open, setOpen] = useState(false);

  const actions = [
    { id: 'contribution', icon: DollarSign, label: 'Add Contribution', show: true },
    { id: 'payout', icon: TrendingUp, label: 'Schedule Payout', show: isAdmin && payoutsAllowed },
    { id: 'meeting', icon: Calendar, label: 'Schedule Meeting', show: isAdmin },
    { id: 'members', icon: Users, label: 'Manage Members', show: isAdmin },
    { id: 'info', icon: Info, label: 'Group Settings', show: true },
  ].filter(a => a.show);

  return (
    <div className="fixed bottom-16 lg:bottom-4 right-4 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="lg"
            className="h-12 w-12 rounded-full shadow-lg"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-1.5" align="end">
          <div className="space-y-0.5">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm h-8"
                onClick={() => {
                  onAction(action.id);
                  setOpen(false);
                }}
              >
                <action.icon className="h-3.5 w-3.5 mr-2" />
                {action.label}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
