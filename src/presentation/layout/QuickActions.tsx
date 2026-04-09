import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/presentation/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Separator } from '@/presentation/ui/separator';
import {
  Plus, DollarSign, TrendingUp, Calendar, Users, Settings,
  ShoppingCart, HeartHandshake, RefreshCw, Megaphone,
} from 'lucide-react';
import type { GroupType } from '@/domain/types';

interface QuickActionsProps {
  onAction: (action: string) => void;
  isAdmin: boolean;
  payoutsAllowed: boolean;
  groupType?: GroupType;
}

export function QuickActions({ onAction, isAdmin, payoutsAllowed, groupType }: QuickActionsProps) {
  const [open, setOpen] = useState(false);

  const run = (id: string) => { onAction(id); setOpen(false); };

  const hasRotation = groupType === 'rotating' || groupType === 'susu' || groupType === 'tontine' || groupType === 'chama';

  // Build the context-aware action list
  const memberActions = [
    { id: 'contribution', icon: DollarSign, label: 'Add Contribution', enabled: true },
    ...(groupType === 'grocery' ? [{ id: 'grocery',  icon: ShoppingCart,   label: 'Add Grocery Item', enabled: true }] : []),
    ...(groupType === 'burial'  ? [{ id: 'burial',   icon: HeartHandshake, label: 'Submit Claim',     enabled: true }] : []),
  ];

  const adminActions = isAdmin ? [
    ...(payoutsAllowed ? [{ id: 'payout', icon: TrendingUp, label: 'Schedule Payout', enabled: true, disabledReason: '' }]
      : [{ id: 'payout', icon: TrendingUp, label: 'Schedule Payout', enabled: false, disabledReason: 'Payouts are disabled — enable in Group Settings' }]),
    { id: 'meeting',     icon: Calendar,      label: 'Schedule Meeting',   enabled: true,  disabledReason: '' },
    { id: 'members',     icon: Users,         label: 'Manage Members',     enabled: true,  disabledReason: '' },
    ...(hasRotation ? [{ id: 'rotation', icon: RefreshCw, label: 'Advance Rotation', enabled: true, disabledReason: '' }] : []),
    { id: 'announcements', icon: Megaphone,   label: 'New Announcement',   enabled: true,  disabledReason: '' },
    { id: 'info',        icon: Settings,      label: 'Group Settings',     enabled: true,  disabledReason: '' },
  ] : [];

  const renderAction = (action: { id: string; icon: React.ElementType; label: string; enabled: boolean; disabledReason?: string }) =>
    action.enabled ? (
      <Button
        key={action.id}
        variant="ghost"
        size="sm"
        className="w-full justify-start text-sm h-8 font-normal"
        onClick={() => run(action.id)}
      >
        <action.icon className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
        {action.label}
      </Button>
    ) : (
      <Tooltip key={action.id}>
        <TooltipTrigger asChild>
          <span className="block">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-sm h-8 font-normal opacity-40 cursor-not-allowed"
              disabled
            >
              <action.icon className="h-3.5 w-3.5 mr-2" />
              {action.label}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="left">{action.disabledReason}</TooltipContent>
      </Tooltip>
    );

  return (
    <div className="hidden lg:block fixed bottom-4 right-4 z-40">
      <Popover open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                size="lg"
                className="h-12 w-12 rounded-full shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
                aria-label="Quick actions"
              >
                <Plus className={`h-5 w-5 transition-transform ${open ? 'rotate-45' : ''}`} />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="left">Quick actions</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-52 p-1.5" align="end" sideOffset={8}>
          <div className="space-y-0.5">
            {memberActions.map(renderAction)}
            {adminActions.length > 0 && (
              <>
                {memberActions.length > 0 && <Separator className="my-1" />}
                <p className="text-[10px] text-muted-foreground font-medium px-2 py-0.5 uppercase tracking-wide">Admin</p>
                {adminActions.map(renderAction)}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
