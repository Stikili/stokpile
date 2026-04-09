import { useState } from 'react';
import { Button } from '@/presentation/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/presentation/ui/dropdown-menu';
import { User, Plus, UserPlus, Search, LogOut, Trash2, UserX, Bell, HelpCircle, Sparkles, Monitor, Gift, Download } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { NotificationPrefsDialog } from '@/presentation/components/profile/NotificationPrefsDialog';
import { ProfileDialog } from '@/presentation/components/profile/ProfileDialog';
import { CreateGroupDialog } from '@/presentation/components/groups/CreateGroupDialog';
import { JoinGroupDialog } from '@/presentation/components/groups/JoinGroupDialog';
import { SearchPublicGroupsDialog } from '@/presentation/components/groups/SearchPublicGroupsDialog';
import { ClearDataDialog } from '@/presentation/shared/ClearDataDialog';
import { DeleteAccountDialog } from '@/presentation/components/profile/DeleteAccountDialog';
import { HelpDialog } from '@/presentation/components/help/HelpDialog';
import { ChangelogDialog, LATEST_VERSION } from '@/presentation/components/help/ChangelogDialog';
import { SessionsDialog } from '@/presentation/components/profile/SessionsDialog';
import { ReferralDialog } from '@/presentation/components/profile/ReferralDialog';
import { DataExportDialog } from '@/presentation/components/profile/DataExportDialog';
import type { Session } from '@/domain/types';

interface ProfileMenuProps {
  session: Session;
  onProfileUpdate: () => void;
  onGroupsChanged: () => void;
  onSignOut: () => void;
  hasGroups?: boolean;
}

export function ProfileMenu({
  session,
  onProfileUpdate,
  onGroupsChanged,
  onSignOut,
  hasGroups: _hasGroups = false
}: ProfileMenuProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showSearchGroups, setShowSearchGroups] = useState(false);
  const [showClearData, setShowClearData] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showDataExport, setShowDataExport] = useState(false);
  const [hasUnseenChangelog, setHasUnseenChangelog] = useState(() => {
    const seen = localStorage.getItem('changelog-seen-version');
    return seen !== LATEST_VERSION;
  });

  return (
    <>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Account & groups</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-60">
          {/* Account */}
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Account
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowProfile(true)}>
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </DropdownMenuItem>
          <NotificationPrefsDialog>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </DropdownMenuItem>
          </NotificationPrefsDialog>
          <DropdownMenuItem onClick={() => setShowSessions(true)}>
            <Monitor className="h-4 w-4 mr-2" />
            Active Sessions
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDataExport(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export My Data
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Groups */}
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Groups
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowCreateGroup(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Group
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowJoinGroup(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Join Group
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowSearchGroups(true)}>
            <Search className="h-4 w-4 mr-2" />
            Search Public Groups
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Referral upfront — revenue lever */}
          <DropdownMenuItem onClick={() => setShowReferral(true)} className="text-primary focus:text-primary">
            <Gift className="h-4 w-4 mr-2" />
            Refer & Earn
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Support */}
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Support
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowHelp(true)}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Help & FAQ
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            setShowChangelog(true);
            localStorage.setItem('changelog-seen-version', LATEST_VERSION);
            setHasUnseenChangelog(false);
          }}>
            <Sparkles className="h-4 w-4 mr-2" />
            What's New
            {hasUnseenChangelog && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Danger zone */}
          {import.meta.env.DEV && (
            <DropdownMenuItem
              onClick={() => setShowClearData(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Data (dev)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => setShowDeleteAccount(true)}
            className="text-destructive focus:text-destructive"
          >
            <UserX className="h-4 w-4 mr-2" />
            Delete Account
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showProfile && (
        <ProfileDialog
          session={session}
          onProfileUpdate={onProfileUpdate}
          open={showProfile}
          onOpenChange={setShowProfile}
        />
      )}
      {showCreateGroup && (
        <CreateGroupDialog
          open={showCreateGroup}
          onOpenChange={setShowCreateGroup}
          onSuccess={() => {
            onGroupsChanged();
            setShowCreateGroup(false);
          }}
        />
      )}
      {showJoinGroup && (
        <JoinGroupDialog
          open={showJoinGroup}
          onOpenChange={setShowJoinGroup}
          onSuccess={() => {
            onGroupsChanged();
            setShowJoinGroup(false);
          }}
        />
      )}
      {showSearchGroups && (
        <SearchPublicGroupsDialog
          open={showSearchGroups}
          onOpenChange={setShowSearchGroups}
          onSuccess={() => {
            onGroupsChanged();
            setShowSearchGroups(false);
          }}
        />
      )}
      {showClearData && (
        <ClearDataDialog
          open={showClearData}
          onOpenChange={setShowClearData}
          onSuccess={() => {
            onGroupsChanged();
            setShowClearData(false);
          }}
        />
      )}
      {showDeleteAccount && (
        <DeleteAccountDialog
          open={showDeleteAccount}
          onOpenChange={setShowDeleteAccount}
        />
      )}
      <HelpDialog open={showHelp} onOpenChange={setShowHelp} />
      <ChangelogDialog open={showChangelog} onOpenChange={setShowChangelog} />
      <SessionsDialog open={showSessions} onOpenChange={setShowSessions} />
      <ReferralDialog open={showReferral} onOpenChange={setShowReferral} />
      <DataExportDialog open={showDataExport} onOpenChange={setShowDataExport} />
    </>
  );
}
