import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { UserPlus, Search, Check } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import type { UserSearchResult } from '../types';

interface InviteMembersDialogProps {
  groupId: string;
}

export function InviteMembersDialog({ groupId }: InviteMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [invitedEmails, setInvitedEmails] = useState<Set<string>>(new Set());

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    setSearching(true);
    try {
      const data = await api.searchUsers(searchQuery);
      setUsers(data.users || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleInvite = async (email: string) => {
    setInviting(email);
    try {
      await api.inviteUser(groupId, email);
      toast.success(`Invite sent to ${email}`);
      setInvitedEmails(prev => new Set([...prev, email]));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setInviting(null);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setSearchQuery('');
      setUsers([]);
      setInvitedEmails(new Set());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Members
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Members to Group</DialogTitle>
          <DialogDescription>
            Send invitations to new members by email
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="search">Search for registered users</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name or email..."
              />
              <Button onClick={handleSearch} disabled={searching} size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[300px] pr-4">
            {searching ? (
              <div className="text-center py-8 text-muted-foreground">
                Searching...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No users found' : 'Search for users to invite'}
              </div>
            ) : (
              <div className="space-y-2">
                {users.map((user) => {
                  const isInvited = invitedEmails.has(user.email);
                  
                  return (
                    <div
                      key={user.email}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate">
                          {user.fullName} {user.surname}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleInvite(user.email)}
                        disabled={inviting === user.email || isInvited}
                        variant={isInvited ? 'outline' : 'default'}
                      >
                        {isInvited ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Invited
                          </>
                        ) : inviting === user.email ? (
                          'Inviting...'
                        ) : (
                          'Invite'
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <p className="text-xs text-muted-foreground text-center">
            Invited members will receive a notification and can accept or decline the invite.
          </p>
        </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
