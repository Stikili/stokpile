import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/presentation/ui/sheet';
import { Button } from '@/presentation/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import {
  Menu, Home, DollarSign, TrendingUp, Calendar, Settings, LogOut, User,
  Moon, Sun, Megaphone, RefreshCw, ShoppingCart,
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

          {/* All navigation tabs, split by section */}
          {selectedGroup && (
            <div className="mb-2 space-y-3">
              {/* Main tabs (Home, Contribute, Payouts, Meetings) */}
              {mainTabs.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">Navigate</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {mainTabs.map(t => (
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

              {/* More sections (Rotation, Grocery, Burial, Announcements, Settings) */}
              {moreTabs.filter(t => t.section === 'more').length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">Sections</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {moreTabs.filter(t => t.section === 'more').map(t => (
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

              {/* Admin-only tabs (Insights, Penalties, Audit) */}
              {moreTabs.filter(t => t.section === 'admin').length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium px-1 mb-1.5">Admin</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {moreTabs.filter(t => t.section === 'admin').map(t => (
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
  // Layout on mobile: [Home] [Contribute] [Pilo] [Payouts] [Meetings]
  // Pilo sits in the centre as a prominent circular button. All overflow
  // navigation (rotation, grocery, burial, admin tabs, settings) lives in
  // the hamburger drawer at the top-left.
  const leftTabs = mainTabs.slice(0, 2);
  const rightTabs = mainTabs.slice(2, 4);
  return (
    <div className="bg-white/95 dark:bg-[#0f0f14]/95 border-t border-border backdrop-blur-sm">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {selectedGroup ? (
          <>
            {leftTabs.map((item) => (
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

            {/* Pilo — prominent centre button */}
            <div className="flex-1 flex justify-center">
              <button
                onClick={openPilo}
                aria-label="Ask Pilo"
                className="relative -mt-6 h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary to-emerald-500 shadow-xl shadow-primary/30 ring-4 ring-background flex items-center justify-center active:scale-95 transition-transform"
              >
                <Sparkles className="h-6 w-6 text-white" />
                <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-20 pointer-events-none" />
              </button>
            </div>

            {rightTabs.map((item) => (
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
          </>
        ) : (
          <div className="flex-1 flex justify-center">
            <button onClick={openPilo} aria-label="Ask Pilo" className="relative -mt-6 h-14 w-14 rounded-full bg-gradient-to-br from-primary via-primary to-emerald-500 shadow-xl shadow-primary/30 ring-4 ring-background flex items-center justify-center active:scale-95 transition-transform">
              <Sparkles className="h-6 w-6 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
