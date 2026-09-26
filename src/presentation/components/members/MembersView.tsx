import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, Loader2, MoreHorizontal, UserCheck, UserX, X, Users, UploadCloud } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { Skeleton } from '@/presentation/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/presentation/ui/dropdown-menu';
import { AdminAddMembersMenu } from '@/presentation/components/members/AdminAddMembersMenu';
import { BulkInviteDialog } from '@/presentation/components/members/BulkInviteDialog';
import { MemberDetailsDialog } from '@/presentation/components/members/MemberDetailsDialog';
import { MemberStatsDialog } from '@/presentation/components/members/MemberStatsDialog';
import { UserAvatar } from '@/presentation/components/profile/UserAvatar';
import { EmptyState } from '@/presentation/shared/EmptyState';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { StatusChip } from '@/presentation/shared/StatusChip';
import { useMembers, useInvalidate } from '@/application/hooks/queries';
import { api } from '@/infrastructure/api';
import { formatDate } from '@/lib/export';
import { displayName } from '@/domain/round';
import type { Group, Member } from '@/domain/types';

const MAX_ADMINS = 3;

interface MembersViewProps {
  group: Group;
  onGroupUpdate?: () => void;
}

type Pending = { email: string; name: string } | null;

export function MembersView({ group, onGroupUpdate }: MembersViewProps) {
  const membersQ = useMembers(group.id);
  const invalidate = useInvalidate();
  const members = membersQ.data?.members ?? [];
  const isAdmin = group.userRole === 'admin';

  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [deactivate, setDeactivate] = useState<Pending>(null);
  const [remove, setRemove] = useState<Pending>(null);
  const [showBulkInvite, setShowBulkInvite] = useState(false);

  const active = members.filter((m) => m.status !== 'inactive');
  const inactiveCount = members.length - active.length;
  const adminCount = active.filter((m) => m.role === 'admin').length;

  const refresh = () => {
    invalidate.members(group.id);
    onGroupUpdate?.();
  };

  const run = async (email: string, action: () => Promise<unknown>, success: string, failure: string) => {
    setBusyEmail(email);
    try {
      await action();
      toast.success(success);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : failure);
    } finally {
      setBusyEmail(null);
    }
  };

  const nameOf = (m: Member) => (m.fullName && m.fullName !== 'Unknown' ? displayName(m.fullName, m.surname, m.email) : m.email);

  return (
    <section className="card" aria-label="Members">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h2 className="t-heading">Members ({members.length})</h2>
          {members.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {active.length} active · {adminCount}/{MAX_ADMINS} admins{inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ''}
            </p>
          )}
        </div>
        {isAdmin && <AdminAddMembersMenu groupId={group.id} onSuccess={refresh} />}
      </div>

      {membersQ.isLoading ? (
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Invite members to join your group. Share an invite link or upload a CSV with several emails at once."
          action={isAdmin ? { label: 'Bulk invite (CSV)', icon: UploadCloud, onClick: () => setShowBulkInvite(true) } : undefined}
        />
      ) : (
        <ul className="ledger">
          {members.map((member) => {
            const name = nameOf(member);
            const inactive = member.status === 'inactive';
            const isCreator = member.email === group.createdBy && group.admin1 === member.email;
            const canPromote = isAdmin && member.role === 'member' && !inactive && adminCount < MAX_ADMINS;
            const canDemote = isAdmin && member.role === 'admin' && !isCreator;
            const canManage = isAdmin && !isCreator;
            const busy = busyEmail === member.email;

            return (
              <li key={member.email} className={`ledger-row items-center gap-3 ${inactive ? 'opacity-60' : ''}`}>
                <UserAvatar name={name} email={member.email} profilePictureUrl={member.profilePictureUrl} />
                <div className="min-w-0 flex-1">
                  <div className="ledger-row__who truncate">{name}</div>
                  <div className="ledger-row__meta truncate">Joined {formatDate(member.joinedAt)}</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {isCreator && <StatusChip tone="role" label="Creator" />}
                    {member.role === 'admin' && <StatusChip tone="role" label="Admin" />}
                    {inactive && <StatusChip tone="bad" label="Inactive" />}
                    {(member.managed || member.status === 'managed') && <StatusChip tone="due" label="Managed" />}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <MemberDetailsDialog member={member} groupCreatedBy={group.createdBy} />
                  <MemberStatsDialog groupId={group.id} memberEmail={member.email} memberName={name} />
                  {isAdmin && (canPromote || canDemote || canManage) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" aria-label={`Actions for ${name}`} disabled={busy}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canPromote && (
                          <DropdownMenuItem onClick={() => run(member.email, () => api.promoteMember(group.id, member.email), `${name} is now an admin`, 'Failed to promote member')}>
                            <ArrowUp className="h-4 w-4 mr-2" />Promote to admin
                          </DropdownMenuItem>
                        )}
                        {isAdmin && member.role === 'member' && !inactive && !canPromote && (
                          <DropdownMenuItem disabled>
                            <ArrowUp className="h-4 w-4 mr-2" />Admin limit reached ({MAX_ADMINS}/{MAX_ADMINS})
                          </DropdownMenuItem>
                        )}
                        {canDemote && (
                          <DropdownMenuItem onClick={() => run(member.email, () => api.demoteMember(group.id, member.email), `${name} is now a member`, 'Failed to demote admin')}>
                            <ArrowDown className="h-4 w-4 mr-2" />Demote to member
                          </DropdownMenuItem>
                        )}
                        {canManage && inactive && (
                          <DropdownMenuItem onClick={() => run(member.email, () => api.reactivateMember(group.id, member.email), `${name} has been reactivated`, 'Failed to reactivate member')}>
                            <UserCheck className="h-4 w-4 mr-2" />Reactivate
                          </DropdownMenuItem>
                        )}
                        {canManage && (
                          <>
                            <DropdownMenuSeparator />
                            {!inactive && (
                              <DropdownMenuItem onClick={() => setDeactivate({ email: member.email, name })}>
                                <UserX className="h-4 w-4 mr-2" />Deactivate (pause)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => setRemove({ email: member.email, name })}>
                              <X className="h-4 w-4 mr-2" />Remove permanently
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmationDialog
        open={!!deactivate}
        onOpenChange={(open) => !open && setDeactivate(null)}
        title="Deactivate member"
        description={`Deactivate ${deactivate?.name ?? ''}? They won’t take part in group activity, but their history is kept.`}
        confirmText="Deactivate"
        variant="warning"
        onConfirm={() => {
          if (deactivate) run(deactivate.email, () => api.deactivateMember(group.id, deactivate.email), `${deactivate.name} has been deactivated`, 'Failed to deactivate member');
          setDeactivate(null);
        }}
      />

      <ConfirmationDialog
        open={!!remove}
        onOpenChange={(open) => !open && setRemove(null)}
        title="Remove member"
        description={`Permanently remove ${remove?.name ?? ''} from the group? This deletes all their membership data and can’t be undone.`}
        confirmText="Remove"
        variant="destructive"
        onConfirm={() => {
          if (remove) run(remove.email, () => api.removeMember(group.id, remove.email), `${remove.name} has been removed from the group`, 'Failed to remove member');
          setRemove(null);
        }}
      />

      <BulkInviteDialog groupId={group.id} open={showBulkInvite} onOpenChange={setShowBulkInvite} onSuccess={refresh} />
    </section>
  );
}
