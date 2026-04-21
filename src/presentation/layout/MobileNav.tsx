import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/presentation/ui/sheet';
import { Button } from '@/presentation/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import {
  Menu, Home, DollarSign, TrendingUp, Calendar, Settings, LogOut, User,
  Moon, Sun, MoreHorizontal, Megaphone, RefreshCw, ShoppingCart,
  HeartHandshake, Gavel, FileBarChart, Activity, ClipboardList, Gauge,
  Sparkles,
} from 'lucide-react';
import { usePilo } from '@/presentation/components/ai/PiloContext';
import { CreateGroupDialog } from '@/presentation/components/groups/CreateGroupDialog';
import { JoinGroupDialog } from '@/presentation/components/groups/JoinGroupDialog';
import { SearchPublicGroupsDialog } from '@/presentation/components/groups/SearchPublicGroupsDialog';
import { ProfileDialog } from '@/presentation/components/profile/ProfileDialog';
import { UserAvatar } from '@/presentation/components/profile/UserAvatar';
import { useTheme } from '@/presentation/shared/ThemeProvider';
import { useLiteMode } from '@/application/context/LiteModeContext';
import type { Session, Group } from '@/domain/types';

interface MobileNavProps {
  session: Session;
  selectedGroup: Group | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  onGroupsChanged: () => void;
  onProfileUpdate: () => void;
  hasGroups?: boolean;
  renderAsHamburger?: boolean;
  renderAsBottomNav?: boolean;
}

// All possible tab definitions
const ALL_TABS = (group: Group | null, isAdmin: boolean) => {
  if (!group) return [];
  const groupType = group.groupType;
  const hasRotation = groupType === 'rotating' || groupType === 'susu' || groupType === 'tontine' || groupType === 'chama';

  return [
    { id: 'dashboard',      icon: Home,           label: 'Home',         section: 'main' },
    { id: 'contributions',  icon: DollarSign,     label: 'Contribute',   section: 'main' },
    ...(group.payoutsAllowed ? [{ id: 'payouts', icon: TrendingUp, label: 'Payouts', section: 'main' }] : []),
    { id: 'meetings',       icon: Calendar,       label: 'Meetings',     section: 'main' },
    { id: 'announcements',  icon: Megaphone,      label: 'Announcements',section: 'more' },
    ...(hasRotation        ? [{ id: 'rotation',   icon: RefreshCw,       label: 'Rotation',     section: 'more' }] : []),
    ...(groupType === 'grocery' ? [{ id: 'grocery', icon: ShoppingCart,  label: 'Grocery',      section: 'more' }] : []),
    ...(groupType === 'burial'  ? [{ id: 'burial',  icon: HeartHandshake, label: 'Burial',      section: 'more' }] : []),
    { id: 'info',           icon: Settings,       label: 'Settings',     section: 'more' },
    ...(isAdmin ? [
      { id: 'penalties',    icon: Gavel,          label: 'Penalties',    section: 'admin' },
      { id: 'reports',      icon: FileBarChart,   label: 'Reports',      section: 'admin' },
      { id: 'analytics',    icon: Activity,       label: 'Analytics',    section: 'admin' },
      { id: 'audit',        icon: ClipboardList,  label: 'Audit Log',    section: 'admin' },
    ] : []),
  ] as { id: string; icon: React.ElementType; label: string; section: string }[];
};

export function MobileNav({
  session,
  selectedGroup,
  activeTab,
  onTabChange,
  onSignOut,
  onGroupsChanged,
  onProfileUpdate,
  renderAsHamburger = false,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { liteMode, toggleLiteMode } = useLiteMode();
  const { openPilo } = usePilo();

  const isAdmin = selectedGroup?.userRole === 'admin';
  const allTabs = ALL_TABS(selectedGroup, isAdmin ?? false);
  const mainTabs = allTabs.filter(t => t.section === 'main');
  const moreTabs = allTabs.filter(t => t.section === 'more' || t.section === 'admin');
  const moreTabIds = new Set(moreTabs.map(t => t.id));
  const activeIsInMore = moreTabIds.has(activeTab);

  const nav = (tab: string) => { onTabChange(tab); setOpen(false); };

  // ─── Hamburger (top-left) ──────────────────────────────────────────────────
  if (renderAsHamburger) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent>Open menu</TooltipContent>
        </Tooltip>
        <SheetContent side="left" className="w-[300px] flex flex-col">
          <SheetHeader>
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Navigation and account options</SheetDescription>
          </SheetHeader>

          {/* User card */}
          <div className="flex items-center gap-3 p-3 bg-muted/60 rounded-xl mb-2 mt-2">
            <UserAvatar
              name={`${session.user.fullName} ${session.user.surname}`}
              email={session.user.email}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.user.fullName} {session.user.surname}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </div>
          </div>

          {/* Ask Pilo — hero shortcut */}
          <button
            onClick={() => { setOpen(false); openPilo(); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r from-primary/10 to-emerald-500/10 hover:from-primary/15 hover:to-emerald-500/15 transition-colors mb-2"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-primary to-emerald-500 flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold">Ask Pilo</p>
              <p className="text-[11px] text-muted-foreground">AI savings assistant</p>
            </div>
          </button>

          {/* Quick nav shortcuts (if group selected) */}
          {selectedGroup && (
            <div className="mb-2">
              <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">Quick Navigate</p>
              <div className="grid grid-cols-2 gap-1.5">
                {allTabs.slice(0, 6).map(t => (
                  <button
                    key={t.id}
                    onClick={() => nav(t.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left
                      ${activeTab === t.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/50 hover:bg-muted text-foreground'}`}
                  >
                    <t.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-1">
            {/* Account */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">Account</p>
              <ProfileDialog session={session} onProfileUpdate={onProfileUpdate} />
            </div>

            {/* Groups */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">Groups</p>
              <CreateGroupDialog onSuccess={onGroupsChanged} />
              <JoinGroupDialog onSuccess={onGroupsChanged} />
              <SearchPublicGroupsDialog onSuccess={onGroupsChanged} />
            </div>

            {/* Preferences */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">Preferences</p>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-sm"
                onClick={toggleLiteMode}
              >
                <Gauge className={`h-4 w-4 mr-2 ${liteMode ? 'text-green-500' : ''}`} />
                Lite Mode {liteMode ? '(ON)' : '(OFF)'}
              </Button>
            </div>
          </div>

          {/* Sign out */}
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive mt-3"
            onClick={() => { onSignOut(); setOpen(false); }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </SheetContent>
      </Sheet>
    );
  }

  // ─── Bottom nav ────────────────────────────────────────────────────────────
  return (
    <div className="bg-white/95 dark:bg-[#0f0f14]/95 border-t border-border backdrop-blur-sm">
      <Sheet open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {selectedGroup ? (
            <>
              {/* Core nav items */}
              {mainTabs.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1.5 px-1 rounded-xl transition-all
                    ${activeTab === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => onTabChange(item.id)}
                  aria-label={item.label}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  <item.icon className={`h-5 w-5 transition-transform ${activeTab === item.id ? 'scale-110' : ''}`} />
                  <span className="text-[10px] font-medium truncate w-full text-center leading-tight mt-0.5">
                    {item.label}
                  </span>
                </button>
              ))}

              {/* More button — highlights when active tab is in the overflow set */}
              <SheetTrigger asChild>
                <button
                  className={`flex flex-col items-center gap-0.5 min-w-0 flex-1 py-1.5 px-1 rounded-xl transition-all relative
                    ${activeIsInMore ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                  aria-label="More options"
                >
                  <MoreHorizontal className={`h-5 w-5 transition-transform ${activeIsInMore ? 'scale-110' : ''}`} />
                  <span className="text-[10px] font-medium leading-tight mt-0.5">More</span>
                  {activeIsInMore && (
                    <span className="absolute top-1 right-3 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </button>
              </SheetTrigger>
            </>
          ) : (
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1 flex-1 py-1.5 px-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">Menu</span>
              </button>
            </SheetTrigger>
          )}
        </div>

        {/* More sheet — 2-col grid */}
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-2xl pb-safe">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-base">
              {selectedGroup ? selectedGroup.name : 'Navigation'}
            </SheetTitle>
            <SheetDescription className="sr-only">All app sections</SheetDescription>
          </SheetHeader>

          <div className="overflow-y-auto space-y-4 pb-4">
            {/* Pilo AI — hero entry */}
            <button
              onClick={() => { setOpen(false); openPilo(); }}
              className="w-full group flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r from-primary/10 to-emerald-500/10 hover:from-primary/15 hover:to-emerald-500/15 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary via-primary to-emerald-500 flex items-center justify-center shadow-md shadow-primary/30 shrink-0">
                <Sparkles className="h-5 w-5 text-white group-hover:rotate-12 transition-transform" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold">Ask Pilo</p>
                <p className="text-[11px] text-muted-foreground">Your AI savings assistant</p>
              </div>
            </button>

            {/* More navigation tabs */}
            {moreTabs.filter(t => t.section === 'more').length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 px-1">Sections</p>
                <div className="grid grid-cols-3 gap-2">
                  {moreTabs.filter(t => t.section === 'more').map(t => (
                    <button
                      key={t.id}
                      onClick={() => nav(t.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all
                        ${activeTab === t.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:bg-muted text-foreground'}`}
                    >
                      <t.icon className="h-5 w-5" />
                      <span className="text-xs font-medium text-center leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Admin tabs */}
            {moreTabs.filter(t => t.section === 'admin').length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 px-1 flex items-center gap-1.5">
                  <span className="inline-block h-px flex-1 bg-border" />
                  Admin
                  <span className="inline-block h-px flex-1 bg-border" />
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {moreTabs.filter(t => t.section === 'admin').map(t => (
                    <button
                      key={t.id}
                      onClick={() => nav(t.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all
                        ${activeTab === t.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card hover:bg-muted text-foreground'}`}
                    >
                      <t.icon className="h-5 w-5" />
                      <span className="text-xs font-medium text-center leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account actions */}
            <div className="border-t pt-3 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </Button>
              <Button variant="outline" size="sm" className="justify-start" onClick={toggleLiteMode}>
                <Gauge className={`h-4 w-4 mr-2 ${liteMode ? 'text-green-500' : ''}`} />
                Lite {liteMode ? 'ON' : 'OFF'}
              </Button>
              <ProfileDialog session={session} onProfileUpdate={onProfileUpdate} />
              <Button
                variant="outline"
                size="sm"
                className="justify-start text-destructive hover:text-destructive"
                onClick={() => { onSignOut(); setOpen(false); }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Group actions */}
            <div className="border-t pt-3">
              <p className="text-xs text-muted-foreground font-medium mb-2 px-1">Groups</p>
              <div className="space-y-1">
                <CreateGroupDialog onSuccess={() => { onGroupsChanged(); setOpen(false); }} />
                <JoinGroupDialog onSuccess={() => { onGroupsChanged(); setOpen(false); }} />
                <SearchPublicGroupsDialog onSuccess={onGroupsChanged} />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
