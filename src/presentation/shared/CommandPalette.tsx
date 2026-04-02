import { useEffect, useState, useCallback } from 'react';
import type { Group } from '@/domain/types';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
} from '@/presentation/ui/command';
import {
  PieChart, DollarSign, TrendingUp, Calendar, Settings, Megaphone,
  RefreshCw, ShoppingCart, HeartHandshake, Gavel, FileBarChart,
  Activity, ClipboardList, Plus, Users, Search, LogOut, User, Gauge,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGroup: Group | null;
  isAdmin: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAction: (action: string) => void;
  onSignOut: () => void;
}

export function CommandPalette({
  open, onOpenChange, selectedGroup, isAdmin, onTabChange, onAction, onSignOut,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');

  const run = useCallback((fn: () => void) => {
    fn();
    onOpenChange(false);
    setQuery('');
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const groupType = selectedGroup?.groupType;
  const hasRotation = groupType === 'rotating' || groupType === 'susu' || groupType === 'tontine' || groupType === 'chama';

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command Palette" description="Type a command or search">
      <CommandInput
        placeholder="Search tabs, actions, settings…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results for "{query}"</CommandEmpty>

        {selectedGroup && (
          <>
            <CommandGroup heading="Navigate">
              <CommandItem onSelect={() => run(() => onTabChange('dashboard'))}>
                <PieChart /> Dashboard
                <CommandShortcut>Home</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(() => onTabChange('contributions'))}>
                <DollarSign /> Contributions
                <CommandShortcut>⌃N</CommandShortcut>
              </CommandItem>
              {selectedGroup.payoutsAllowed && (
                <CommandItem onSelect={() => run(() => onTabChange('payouts'))}>
                  <TrendingUp /> Payouts
                  <CommandShortcut>⌃P</CommandShortcut>
                </CommandItem>
              )}
              <CommandItem onSelect={() => run(() => onTabChange('meetings'))}>
                <Calendar /> Meetings
                <CommandShortcut>⌃M</CommandShortcut>
              </CommandItem>
              <CommandItem onSelect={() => run(() => onTabChange('announcements'))}>
                <Megaphone /> Announcements
              </CommandItem>
              {hasRotation && (
                <CommandItem onSelect={() => run(() => onTabChange('rotation'))}>
                  <RefreshCw /> Rotation Order
                </CommandItem>
              )}
              {groupType === 'grocery' && (
                <CommandItem onSelect={() => run(() => onTabChange('grocery'))}>
                  <ShoppingCart /> Grocery List
                </CommandItem>
              )}
              {groupType === 'burial' && (
                <CommandItem onSelect={() => run(() => onTabChange('burial'))}>
                  <HeartHandshake /> Burial Society
                </CommandItem>
              )}
              <CommandItem onSelect={() => run(() => onTabChange('info'))}>
                <Settings /> Group Settings
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => run(() => onAction('contribution'))}>
                <Plus /> Add Contribution
              </CommandItem>
              {isAdmin && selectedGroup.payoutsAllowed && (
                <CommandItem onSelect={() => run(() => onAction('payout'))}>
                  <TrendingUp /> Schedule Payout
                </CommandItem>
              )}
              {isAdmin && (
                <CommandItem onSelect={() => run(() => onAction('meeting'))}>
                  <Calendar /> Schedule Meeting
                </CommandItem>
              )}
              {isAdmin && (
                <CommandItem onSelect={() => run(() => onAction('members'))}>
                  <Users /> Manage Members
                </CommandItem>
              )}
              {groupType === 'grocery' && (
                <CommandItem onSelect={() => run(() => onTabChange('grocery'))}>
                  <ShoppingCart /> Add Grocery Item
                </CommandItem>
              )}
              {groupType === 'burial' && (
                <CommandItem onSelect={() => run(() => onTabChange('burial'))}>
                  <HeartHandshake /> Submit Burial Claim
                </CommandItem>
              )}
              {hasRotation && isAdmin && (
                <CommandItem onSelect={() => run(() => onTabChange('rotation'))}>
                  <RefreshCw /> Advance Rotation
                </CommandItem>
              )}
            </CommandGroup>

            {isAdmin && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Admin">
                  <CommandItem onSelect={() => run(() => onTabChange('penalties'))}>
                    <Gavel /> Penalties &amp; Fines
                  </CommandItem>
                  <CommandItem onSelect={() => run(() => onTabChange('reports'))}>
                    <FileBarChart /> Financial Reports
                  </CommandItem>
                  <CommandItem onSelect={() => run(() => onTabChange('analytics'))}>
                    <Activity /> Analytics
                  </CommandItem>
                  <CommandItem onSelect={() => run(() => onTabChange('audit'))}>
                    <ClipboardList /> Audit Log
                  </CommandItem>
                </CommandGroup>
              </>
            )}

            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Account">
          <CommandItem onSelect={() => run(() => onAction('search-groups'))}>
            <Search /> Search Public Groups
          </CommandItem>
          <CommandItem onSelect={() => run(() => onAction('profile'))}>
            <User /> My Profile
          </CommandItem>
          <CommandItem onSelect={() => run(() => onAction('lite-mode'))}>
            <Gauge /> Toggle Lite Mode
          </CommandItem>
          <CommandItem onSelect={() => run(onSignOut)} className="text-destructive data-[selected=true]:text-destructive">
            <LogOut className="text-destructive" /> Sign Out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
