import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/ui/table';
import { Badge } from '@/presentation/ui/badge';
import { Button } from '@/presentation/ui/button';
import { Skeleton } from '@/presentation/ui/skeleton';
import { InviteMembersDialog } from '@/presentation/components/members/InviteMembersDialog';
import { ShareInviteDialog } from '@/presentation/components/members/ShareInviteDialog';
import { GroupSettingsCard } from '@/presentation/components/groups/GroupSettingsCard';
import { EditGroupNameDialog } from '@/presentation/components/groups/EditGroupNameDialog';
import { EditGroupDescriptionDialog } from '@/presentation/components/groups/EditGroupDescriptionDialog';
import { EditContributionFrequencyDialog } from '@/presentation/components/groups/EditContributionFrequencyDialog';
import { UserAvatar } from '@/presentation/components/profile/UserAvatar';
import { MemberStatsDialog } from '@/presentation/components/members/MemberStatsDialog';
import { MemberDetailsDialog } from '@/presentation/components/members/MemberDetailsDialog';
import { EmptyState } from '@/presentation/shared/EmptyState';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { DeleteGroupDialog } from '@/presentation/components/groups/DeleteGroupDialog';
import { Copy, ArrowUp, ArrowDown, Loader2, Users, FileText, Upload, Download, Trash2, File, UserX, UserCheck, X } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import type { Group, Member, Constitution } from '@/domain/types';

interface GroupInfoViewProps {
  group: Group;
  onGroupUpdate?: () => void;
}

export function GroupInfoView({ group, onGroupUpdate }: GroupInfoViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [promotingEmail, setPromotingEmail] = useState<string | null>(null);
  const [demotingEmail, setDemotingEmail] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [deactivatingEmail, setDeactivatingEmail] = useState<string | null>(null);
  const [reactivatingEmail, setReactivatingEmail] = useState<string | null>(null);
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [constitutionLoading, setConstitutionLoading] = useState(false);
  const [uploadingConstitution, setUploadingConstitution] = useState(false);
  const [deletingConstitution, setDeletingConstitution] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ open: boolean; email: string | null; name: string }>({ open: false, email: null, name: '' });
  const [removeConfirm, setRemoveConfirm] = useState<{ open: boolean; email: string | null; name: string }>({ open: false, email: null, name: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only load if user is confirmed member
    if (group && group.id) {
      loadMembers();
      loadConstitution();
    }
  }, [group.id]);

  const loadMembers = async () => {
    // Don't attempt to load if no valid group
    if (!group || !group.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await api.getMembers(group.id);
      setMembers(data.members || []);
    } catch (error) {
      console.error('Failed to load members:', error);
      // Don't show toast for expected permission errors
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (memberEmail: string) => {
    setPromotingEmail(memberEmail);
    try {
      await api.promoteMember(group.id, memberEmail);
      toast.success('Member promoted to admin successfully');
      loadMembers();
      if (onGroupUpdate) onGroupUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to promote member');
    } finally {
      setPromotingEmail(null);
    }
  };

  const handleDemote = async (memberEmail: string) => {
    setDemotingEmail(memberEmail);
    try {
      await api.demoteMember(group.id, memberEmail);
      toast.success('Admin demoted to member successfully');
      loadMembers();
      if (onGroupUpdate) onGroupUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to demote admin');
    } finally {
      setDemotingEmail(null);
    }
  };

  const handleRemove = async (memberEmail: string, memberName: string) => {
    setRemovingEmail(memberEmail);
    try {
      await api.removeMember(group.id, memberEmail);
      toast.success(`${memberName} has been removed from the group`);
      loadMembers();
      if (onGroupUpdate) onGroupUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleDeactivate = async (memberEmail: string, memberName: string) => {
    setDeactivatingEmail(memberEmail);
    try {
      await api.deactivateMember(group.id, memberEmail);
      toast.success(`${memberName} has been deactivated`);
      loadMembers();
      if (onGroupUpdate) onGroupUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate member');
    } finally {
      setDeactivatingEmail(null);
    }
  };

  const handleReactivate = async (memberEmail: string, memberName: string) => {
    setReactivatingEmail(memberEmail);
    try {
      await api.reactivateMember(group.id, memberEmail);
      toast.success(`${memberName} has been reactivated`);
      loadMembers();
      if (onGroupUpdate) onGroupUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate member');
    } finally {
      setReactivatingEmail(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const loadConstitution = async () => {
    // Don't attempt to load if no valid group
    if (!group || !group.id) {
      setConstitutionLoading(false);
      return;
    }
    
    try {
      setConstitutionLoading(true);
      const data = await api.getConstitution(group.id);
      setConstitution(data.constitution);
    } catch (error) {
      console.error('Failed to load constitution:', error);
      // Don't show toast for expected permission errors
      setConstitution(null);
    } finally {
      setConstitutionLoading(false);
    }
  };

  const handleConstitutionUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF and Word documents are allowed');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingConstitution(true);
    try {
      await api.uploadConstitution(group.id, file);
      toast.success('Constitution uploaded successfully');
      loadConstitution();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload constitution');
    } finally {
      setUploadingConstitution(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConstitutionDownload = async () => {
    if (!constitution?.downloadUrl) return;
    
    // Open in new tab
    window.open(constitution.downloadUrl, '_blank');
  };

  const handleConstitutionDelete = async () => {
    if (!confirm('Are you sure you want to delete the constitution? This action cannot be undone.')) {
      return;
    }

    setDeletingConstitution(true);
    try {
      await api.deleteConstitution(group.id);
      toast.success('Constitution deleted successfully');
      setConstitution(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete constitution');
    } finally {
      setDeletingConstitution(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {group.userRole === 'admin' && (
        <GroupSettingsCard 
          group={group} 
          onUpdate={() => {
            if (onGroupUpdate) onGroupUpdate();
          }} 
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm">Name</h3>
              {group.userRole === 'admin' && (
                <EditGroupNameDialog 
                  groupId={group.id} 
                  currentName={group.name}
                  onSuccess={() => {
                    if (onGroupUpdate) onGroupUpdate();
                  }}
                />
              )}
            </div>
            <p className="text-2xl">{group.name}</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm">Description</h3>
              {group.userRole === 'admin' && (
                <EditGroupDescriptionDialog 
                  groupId={group.id} 
                  currentDescription={group.description ?? ''}
                  onSuccess={() => {
                    if (onGroupUpdate) onGroupUpdate();
                  }}
                />
              )}
            </div>
            <p className="text-muted-foreground">{group.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm mb-2">Group ID</h3>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded text-xs flex-1 truncate">
                  {group.id}
                </code>
                <button
                  onClick={() => copyToClipboard(group.id, 'Group ID')}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm mb-2">Group Code</h3>
              <div className="flex items-center gap-2">
                <code className="bg-muted px-2 py-1 rounded flex-1">
                  {group.groupCode}
                </code>
                <button
                  onClick={() => copyToClipboard(group.groupCode, 'Group Code')}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <h3 className="text-sm mb-1">Visibility</h3>
              <Badge>{group.isPublic ? 'Public' : 'Private'}</Badge>
            </div>
            <div>
              <h3 className="text-sm mb-1">Payouts</h3>
              <Badge variant={group.payoutsAllowed ? 'default' : 'secondary'}>
                {group.payoutsAllowed ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm">Contribution Frequency</h3>
              {group.userRole === 'admin' && (
                <EditContributionFrequencyDialog
                  groupId={group.id}
                  currentFrequency={group.contributionFrequency || 'monthly'}
                  onSuccess={() => {
                    if (onGroupUpdate) onGroupUpdate();
                  }}
                />
              )}
            </div>
            <Badge variant="outline">
              {(group.contributionFrequency || 'monthly').charAt(0).toUpperCase() + (group.contributionFrequency || 'monthly').slice(1).replace(/-/g, ' ')}
            </Badge>
          </div>

          {group.userRole === 'admin' && (
            <div className="pt-4 border-t">
              <h3 className="text-sm mb-3">Share Group</h3>
              <div className="flex gap-2">
                <ShareInviteDialog groupId={group.id} groupName={group.name} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Share an invite link via WhatsApp, SMS, or other platforms
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Constitution Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Group Constitution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {constitutionLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : constitution ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <File className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="mb-1 truncate">{constitution.fileName}</h4>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>{formatFileSize(constitution.fileSize)}</span>
                    <span>•</span>
                    <span>Uploaded {formatDate(constitution.uploadedAt)}</span>
                  </div>
                  {constitution.uploadedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      by {constitution.uploadedBy}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleConstitutionDownload}
                  className="flex-1"
                  variant="default"
                >
                  <Download className="h-4 w-4 mr-2" />
                  View Constitution
                </Button>
                
                {group.userRole === 'admin' && (
                  <>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      disabled={uploadingConstitution}
                    >
                      {uploadingConstitution ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      onClick={handleConstitutionDelete}
                      variant="outline"
                      disabled={deletingConstitution}
                    >
                      {deletingConstitution ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="mb-2">No Constitution</h4>
              <p className="text-sm text-muted-foreground mb-4">
                {group.userRole === 'admin' 
                  ? 'Upload your group constitution document for all members to access'
                  : 'No constitution has been uploaded yet'}
              </p>
              
              {group.userRole === 'admin' && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingConstitution}
                >
                  {uploadingConstitution ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Constitution
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleConstitutionUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Members ({members.length})</CardTitle>
            {members.length > 0 && (
              <div className="flex gap-2 mt-2">
                <Badge variant="default">
                  {members.filter(m => m.status !== 'inactive').length} Active
                </Badge>
                <Badge variant="secondary">
                  {members.filter(m => m.role === 'admin' && m.status !== 'inactive').length}/3 Admins
                </Badge>
                {members.filter(m => m.status === 'inactive').length > 0 && (
                  <Badge variant="destructive">
                    {members.filter(m => m.status === 'inactive').length} Inactive
                  </Badge>
                )}
              </div>
            )}
          </div>
          {group.userRole === 'admin' && (
            <InviteMembersDialog groupId={group.id} />
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Invite members to join your group and start collaborating"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const isCreator = member.email === group.createdBy && group.admin1 === member.email;
                    const adminCount = members.filter(m => m.role === 'admin' && m.status !== 'inactive').length;
                    const canPromote = group.userRole === 'admin' && member.role === 'member' && member.status !== 'inactive' && adminCount < 3;
                    const canDemote = group.userRole === 'admin' && member.role === 'admin' && !isCreator;
                    const canRemove = group.userRole === 'admin' && !isCreator;
                    const canDeactivate = group.userRole === 'admin' && !isCreator && member.status !== 'inactive';
                    const canReactivate = group.userRole === 'admin' && !isCreator && member.status === 'inactive';
                    const memberName = member.fullName !== 'Unknown'
                      ? `${member.fullName} ${member.surname}`
                      : member.email;

                    return (
                      <TableRow key={member.email} className={member.status === 'inactive' ? 'opacity-60' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <UserAvatar 
                              name={memberName}
                              email={member.email}
                              profilePictureUrl={member.profilePictureUrl}
                            />
                            <div>
                              <div>
                                {member.fullName !== 'Unknown'
                                  ? `${member.fullName} ${member.surname}`
                                  : member.email}
                              </div>
                              {member.fullName === 'Unknown' && (
                                <span className="text-xs text-muted-foreground">Profile not found</span>
                              )}
                              {isCreator && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Creator
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{member.email}</TableCell>
                        <TableCell>
                          <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.status === 'inactive' ? 'destructive' : 'default'}>
                            {member.status === 'inactive' ? 'Inactive' : 'Active'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(member.joinedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <MemberDetailsDialog 
                              member={member}
                              groupCreatedBy={group.createdBy}
                            />
                            <MemberStatsDialog 
                              groupId={group.id}
                              memberEmail={member.email}
                              memberName={memberName}
                            />
                            {canPromote && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePromote(member.email)}
                                disabled={promotingEmail === member.email}
                                title="Promote to Admin"
                              >
                                {promotingEmail === member.email ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowUp className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {canDemote && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDemote(member.email)}
                                disabled={demotingEmail === member.email}
                                title="Demote to Member"
                              >
                                {demotingEmail === member.email ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ArrowDown className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {canReactivate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReactivate(member.email, memberName)}
                                disabled={reactivatingEmail === member.email}
                                title="Reactivate Member"
                              >
                                {reactivatingEmail === member.email ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserCheck className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                            )}
                            {canDeactivate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deactivatingEmail === member.email}
                                title="Deactivate Member"
                                onClick={() => setDeactivateConfirm({ open: true, email: member.email, name: memberName })}
                              >
                                {deactivatingEmail === member.email ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserX className="h-4 w-4 text-orange-600" />
                                )}
                              </Button>
                            )}
                            {canRemove && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={removingEmail === member.email}
                                title="Remove Member"
                                onClick={() => setRemoveConfirm({ open: true, email: member.email, name: memberName })}
                              >
                                {removingEmail === member.email ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - Delete Group (Admin Only) */}
      {group.userRole === 'admin' && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm mb-1">Delete This Group</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete this group and all associated data. This action cannot be undone.
                </p>
                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteGroup(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Group Dialog */}
      <DeleteGroupDialog
        open={showDeleteGroup}
        onOpenChange={setShowDeleteGroup}
        groupId={group.id}
        groupName={group.name}
        onSuccess={() => {
          if (onGroupUpdate) onGroupUpdate();
        }}
      />

      {/* Deactivate Member Confirmation */}
      <ConfirmationDialog
        open={deactivateConfirm.open}
        onOpenChange={(open) => setDeactivateConfirm({ ...deactivateConfirm, open })}
        title="Deactivate Member"
        description={`Are you sure you want to deactivate ${deactivateConfirm.name}? They will no longer be able to participate in group activities, but their history will be preserved.`}
        onConfirm={() => {
          if (deactivateConfirm.email) {
            handleDeactivate(deactivateConfirm.email, deactivateConfirm.name);
            setDeactivateConfirm({ open: false, email: null, name: '' });
          }
        }}
        confirmText="Deactivate"
        variant="warning"
      />

      {/* Remove Member Confirmation */}
      <ConfirmationDialog
        open={removeConfirm.open}
        onOpenChange={(open) => setRemoveConfirm({ ...removeConfirm, open })}
        title="Remove Member"
        description={`Are you sure you want to permanently remove ${removeConfirm.name} from the group? This action cannot be undone and will delete all their membership data.`}
        onConfirm={() => {
          if (removeConfirm.email) {
            handleRemove(removeConfirm.email, removeConfirm.name);
            setRemoveConfirm({ open: false, email: null, name: '' });
          }
        }}
        confirmText="Remove"
        variant="destructive"
      />
    </div>
  );
}
