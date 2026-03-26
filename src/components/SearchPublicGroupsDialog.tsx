import { useState } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Search, Users, Loader2, CheckCircle, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { toast } from 'sonner';
import type { Group } from '../types';

interface SearchPublicGroupsDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SearchPublicGroupsDialog({ onSuccess, open: controlledOpen, onOpenChange }: SearchPublicGroupsDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [searchQuery, setSearchQuery] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      const data = await api.searchPublicGroups(searchQuery.trim());
      setGroups(data.groups || []);
      if (data.groups.length === 0) {
        toast.info('No public groups found matching your search');
      } else {
        toast.success(`Found ${data.groups.length} public ${data.groups.length === 1 ? 'group' : 'groups'}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to search groups');
      setGroups([]);
    } finally {
      setSearching(false);
    }
  };

  const handleJoinRequest = async (groupId: string) => {
    setJoining(groupId);
    try {
      await api.joinGroupById(groupId);
      toast.success('Join request sent! Waiting for admin approval.');
      
      // Update local state
      setGroups(groups.map(g => 
        g.id === groupId ? { ...g, userStatus: 'pending' } : g
      ));

      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send join request');
    } finally {
      setJoining(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setSearchQuery('');
      setGroups([]);
      setHasSearched(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full justify-start">
          <Search className="h-4 w-4 mr-2" />
          Search Groups
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Public Groups</DialogTitle>
          <DialogDescription>
            Find and join public groups by name
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search by group name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
              autoFocus
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>

          {hasSearched && (
            <div className="space-y-3">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No public groups found</p>
                  <p className="text-sm">Try a different search term</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Found {groups.length} public {groups.length === 1 ? 'group' : 'groups'}
                  </p>
                  {groups.map((group) => (
                    <Card key={group.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg mb-1">{group.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">
                              {group.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-4 w-4" />
                              <span>{group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            {group.userStatus === 'approved' ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Member
                              </Badge>
                            ) : group.userStatus === 'pending' ? (
                              <Badge variant="secondary" className="gap-1">
                                <Clock className="h-3 w-3" />
                                Pending
                              </Badge>
                            ) : (
                              <Button
                                onClick={() => handleJoinRequest(group.id)}
                                disabled={joining === group.id}
                                size="sm"
                              >
                                {joining === group.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Requesting...
                                  </>
                                ) : (
                                  'Request to Join'
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>
          )}

          {!hasSearched && (
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="text-muted-foreground">
                💡 <strong>Tip:</strong> Only public groups appear in search results. 
                Your join request must be approved by a group admin.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
