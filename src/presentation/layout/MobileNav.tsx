import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/presentation/ui/sheet';
import { Button } from '@/presentation/ui/button';
import { Menu, Home, DollarSign, TrendingUp, Calendar, Info, LogOut, User, Moon, Sun, MoreHorizontal } from 'lucide-react';
import { CreateGroupDialog } from '@/presentation/components/groups/CreateGroupDialog';
import { JoinGroupDialog } from '@/presentation/components/groups/JoinGroupDialog';
import { SearchPublicGroupsDialog } from '@/presentation/components/groups/SearchPublicGroupsDialog';
import { ProfileDialog } from '@/presentation/components/profile/ProfileDialog';
import { useTheme } from '@/presentation/shared/ThemeProvider';
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

export function MobileNav({
  session,
  selectedGroup,
  activeTab,
  onTabChange,
  onSignOut,
  onGroupsChanged,
  onProfileUpdate,
  hasGroups: _hasGroups = false,
  renderAsHamburger = false,
  renderAsBottomNav: _renderAsBottomNav = false
}: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Always show exactly 5 items in bottom nav
  // Priority: Home > Contributions > Payouts (if allowed) OR Meetings > Meetings OR Info > More
  const getBottomNavItems = () => {
    if (!selectedGroup) {
      return [
        { id: 'dashboard', icon: Home, label: 'Home' },
      ];
    }

    if (selectedGroup?.payoutsAllowed) {
      // If payouts allowed: Home, Contributions, Payouts, Meetings, More
      return [
        { id: 'dashboard', icon: Home, label: 'Home' },
        { id: 'contributions', icon: DollarSign, label: 'Money' },
        { id: 'payouts', icon: TrendingUp, label: 'Payouts' },
        { id: 'meetings', icon: Calendar, label: 'Meetings' },
        { id: 'more', icon: MoreHorizontal, label: 'More' },
      ];
    } else {
      // If no payouts: Home, Contributions, Meetings, Info, More
      return [
        { id: 'dashboard', icon: Home, label: 'Home' },
        { id: 'contributions', icon: DollarSign, label: 'Money' },
        { id: 'meetings', icon: Calendar, label: 'Meetings' },
        { id: 'info', icon: Info, label: 'Info' },
        { id: 'more', icon: MoreHorizontal, label: 'More' },
      ];
    }
  };

  const navItems = getBottomNavItems();

  // Render as hamburger menu in header (top left)
  if (renderAsHamburger) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px]">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>
              Access your profile, groups, and app settings
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-6">
            {/* User Info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{session.user.fullName || session.user.email?.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
              </div>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>

            {/* Actions */}
            <div className="space-y-1 border-t pt-4">
              <p className="text-xs text-muted-foreground px-2 mb-2">My Account</p>
              <ProfileDialog session={session} onProfileUpdate={onProfileUpdate} />
            </div>

            {/* Groups */}
            <div className="space-y-1 border-t pt-4">
              <p className="text-xs text-muted-foreground px-2 mb-2">Groups</p>
              <CreateGroupDialog onSuccess={onGroupsChanged} />
              <JoinGroupDialog onSuccess={onGroupsChanged} />
              <SearchPublicGroupsDialog onSuccess={onGroupsChanged} />
            </div>

            {/* Sign Out */}
            <Button
              variant="outline"
              className="justify-start text-destructive hover:text-destructive"
              onClick={() => {
                onSignOut();
                setOpen(false);
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Render as bottom navigation (exactly 5 items)
  return (
    <div className="bg-white dark:bg-[#0f0f14] border-t border-border backdrop-blur-sm dark:bg-[#0f0f14]/95">
      <Sheet open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-around px-2 py-3 max-w-lg mx-auto safe-area-inset-bottom">
          {selectedGroup ? (
            <>
              {/* Main Navigation Items - Always exactly 5 */}
              {navItems.map((item) => {
                // Handle the "more" button specially
                if (item.id === 'more') {
                  return (
                    <SheetTrigger asChild key={item.id}>
                      <button
                        className="flex flex-col items-center gap-1 min-w-0 flex-1 py-1 px-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                        aria-label={item.label}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium truncate w-full text-center leading-tight">
                          {item.label}
                        </span>
                      </button>
                    </SheetTrigger>
                  );
                }

                return (
                  <button
                    key={item.id}
                    className={`flex flex-col items-center gap-1 min-w-0 flex-1 py-1 px-2 rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => onTabChange(item.id)}
                    aria-label={item.label}
                  >
                    <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'fill-primary/20' : ''}`} />
                    <span className="text-[10px] font-medium truncate w-full text-center leading-tight">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            <>
              {/* If no group selected, show minimal nav */}
              <SheetTrigger asChild>
                <button className="flex flex-col items-center gap-1 flex-1 py-1 px-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                  <Menu className="h-5 w-5" />
                  <span className="text-[10px] font-medium">Menu</span>
                </button>
              </SheetTrigger>
            </>
          )}
        </div>

        {/* Side Sheet for More Options (from bottom nav) */}
<SheetContent side="bottom" className="h-[400px] rounded-t-xl">
          <SheetHeader>
            <SheetTitle>More Options</SheetTitle>
            <SheetDescription>
              Additional app features and settings
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 mt-6 pb-6">
            {/* Show Info tab if payouts are allowed (since it's not in bottom nav) */}
            {selectedGroup?.payoutsAllowed && (
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => {
                  onTabChange('info');
                  setOpen(false);
                }}
              >
                <Info className="h-4 w-4 mr-2" />
                Group Settings
              </Button>
            )}

            {/* Theme Toggle */}
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>

            {/* Actions */}
            <div className="space-y-1 border-t pt-4">
              <p className="text-xs text-muted-foreground px-2 mb-2">My Account</p>
              <ProfileDialog session={session} onProfileUpdate={onProfileUpdate} />
            </div>

            {/* Groups */}
            <div className="space-y-1 border-t pt-4">
              <p className="text-xs text-muted-foreground px-2 mb-2">Groups</p>
              <CreateGroupDialog onSuccess={onGroupsChanged} />
              <JoinGroupDialog onSuccess={onGroupsChanged} />
              <SearchPublicGroupsDialog onSuccess={onGroupsChanged} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
