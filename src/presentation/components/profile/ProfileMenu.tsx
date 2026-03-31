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
import { User, Plus, UserPlus, Search, LogOut, Trash2, Bell } from 'lucide-react';
import { NotificationPrefsDialog } from '@/presentation/components/profile/NotificationPrefsDialog';
import { ProfileDialog } from '@/presentation/components/profile/ProfileDialog';
import { CreateGroupDialog } from '@/presentation/components/groups/CreateGroupDialog';
import { JoinGroupDialog } from '@/presentation/components/groups/JoinGroupDialog';
import { SearchPublicGroupsDialog } from '@/presentation/components/groups/SearchPublicGroupsDialog';
import { ClearDataDialog } from '@/presentation/shared/ClearDataDialog';
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowProfile(true)}>
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </DropdownMenuItem>
          <NotificationPrefsDialog>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Bell className="h-4 w-4 mr-2" />
              Notification Settings
            </DropdownMenuItem>
          </NotificationPrefsDialog>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Groups</DropdownMenuLabel>
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
            Search Groups
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowClearData(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
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
    </>
  );
}
