import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Button } from '@/presentation/ui/button';
import { ShareInviteDialog } from '@/presentation/components/members/ShareInviteDialog';
import { BulkInviteDialog } from '@/presentation/components/members/BulkInviteDialog';
import { ConstitutionGeneratorDialog } from '@/presentation/components/groups/ConstitutionGeneratorDialog';
import { GroupSettingsCard } from '@/presentation/components/groups/GroupSettingsCard';
import { EditGroupNameDialog } from '@/presentation/components/groups/EditGroupNameDialog';
import { EditGroupDescriptionDialog } from '@/presentation/components/groups/EditGroupDescriptionDialog';
import { EditContributionFrequencyDialog } from '@/presentation/components/groups/EditContributionFrequencyDialog';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { DeleteGroupDialog } from '@/presentation/components/groups/DeleteGroupDialog';
import { Copy, Loader2, FileText, Upload, Trash2, File, Check, ExternalLink, Archive, ArchiveRestore, ShieldAlert, UploadCloud, Wand2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { api } from '@/infrastructure/api';
import { useInvalidate } from '@/application/hooks/queries';
import { toast } from 'sonner';
import { formatDate } from '@/lib/export';
import type { Group, Constitution } from '@/domain/types';

interface GroupInfoViewProps {
  group: Group;
  onGroupUpdate?: () => void;
  userEmail?: string;
}

export function GroupInfoView({ group, onGroupUpdate, userEmail }: GroupInfoViewProps) {
  const invalidate = useInvalidate();
  const [showBulkInvite, setShowBulkInvite] = useState(false);
  const [showConstitutionGen, setShowConstitutionGen] = useState(false);
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [constitutionLoading, setConstitutionLoading] = useState(false);
  const [uploadingConstitution, setUploadingConstitution] = useState(false);
  const [deletingConstitution, setDeletingConstitution] = useState(false);
  const [showDeleteGroup, setShowDeleteGroup] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [unarchiveConfirm, setUnarchiveConfirm] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [deleteConstitutionConfirm, setDeleteConstitutionConfirm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [downloadingConstitution, setDownloadingConstitution] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only load if user is confirmed member
    if (group && group.id) {
      loadConstitution();
    }
  }, [group.id]);

  const copyToClipboard = (text: string, label: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
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
    setDownloadingConstitution(true);
    try {
      window.open(constitution.downloadUrl, '_blank');
    } finally {
      setTimeout(() => setDownloadingConstitution(false), 1000);
    }
  };

  const handleConstitutionDelete = async () => {
    setDeletingConstitution(true);
    try {
      await api.deleteConstitution(group.id);
      toast.success('Constitution deleted successfully');
      setConstitution(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete constitution');
    } finally {
      setDeletingConstitution(false);
      setDeleteConstitutionConfirm(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      await api.archiveGroup(group.id);
      toast.success('Group archived');
      if (onGroupUpdate) onGroupUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to archive group');
    } finally {
      setArchiving(false);
      setArchiveConfirm(false);
    }
  };

  const handleUnarchive = async () => {
    setArchiving(true);
    try {
      await api.unarchiveGroup(group.id);
      toast.success('Group unarchived');
      if (onGroupUpdate) onGroupUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unarchive group');
    } finally {
      setArchiving(false);
      setUnarchiveConfirm(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!transferEmail.trim()) return;
    setTransferring(true);
    try {
      await api.transferAdmin(group.id, transferEmail.trim());
      toast.success(`Ownership transferred to ${transferEmail.trim()}`);
      setTransferEmail('');
      if (onGroupUpdate) onGroupUpdate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to transfer ownership');
    } finally {
      setTransferring(false);
      setTransferConfirm(false);
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
                  onClick={() => copyToClipboard(group.id, 'Group ID', 'groupId')}
                  className={`p-2 rounded transition-colors ${copiedField === 'groupId' ? 'bg-accent dark:bg-accent text-primary' : 'hover:bg-muted'}`}
                  title="Copy Group ID"
                >
                  {copiedField === 'groupId' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
                  onClick={() => copyToClipboard(group.groupCode, 'Group Code', 'groupCode')}
                  className={`p-2 rounded transition-colors ${copiedField === 'groupCode' ? 'bg-accent dark:bg-accent text-primary' : 'hover:bg-muted'}`}
                  title="Copy Group Code"
                >
                  {copiedField === 'groupCode' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
            <div className="pt-4 border-t space-y-3">
              <h3 className="text-sm">Add Members</h3>
              <div className="flex flex-wrap gap-2">
                <ShareInviteDialog groupId={group.id} groupName={group.name} />
                <Button variant="outline" size="sm" onClick={() => setShowBulkInvite(true)}>
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Bulk Invite (CSV)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share an invite link, or paste/upload a list of emails to invite many at once.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Constitution Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Group Constitution
            </CardTitle>
            {group.userRole === 'admin' && (
              <Button variant="outline" size="sm" onClick={() => setShowConstitutionGen(true)}>
                <Wand2 className="h-4 w-4 mr-2" />Generate
              </Button>
            )}
          </div>
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
                  disabled={downloadingConstitution}
                >
                  {downloadingConstitution ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  View Constitution
                </Button>

                {group.userRole === 'admin' && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
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
                      </TooltipTrigger>
                      <TooltipContent>Replace constitution</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => setDeleteConstitutionConfirm(true)}
                          variant="outline"
                          disabled={deletingConstitution}
                        >
                          {deletingConstitution ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete constitution</TooltipContent>
                    </Tooltip>
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

      {/* Admin Actions - Archive & Transfer (Admin Only) */}
      {group.userRole === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Archive / Unarchive */}
            <div>
              <h3 className="text-sm font-medium mb-1">
                {group.archived ? 'Unarchive Group' : 'Archive Group'}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                {group.archived
                  ? 'Restore this group so members can access it again.'
                  : 'Hide this group from the active list. Members will lose access until it is unarchived.'}
              </p>
              {group.archived ? (
                <Button variant="outline" onClick={() => setUnarchiveConfirm(true)} disabled={archiving}>
                  {archiving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArchiveRestore className="h-4 w-4 mr-2" />}
                  Unarchive Group
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setArchiveConfirm(true)} disabled={archiving}>
                  {archiving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
                  Archive Group
                </Button>
              )}
            </div>

            {/* Transfer Ownership (creator only) */}
            {userEmail && userEmail === group.createdBy && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-1">Transfer Ownership</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Transfer primary admin ownership to another member. You will become a regular admin.
                </p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="transfer-email" className="text-xs mb-1 block">New owner email</Label>
                    <Input
                      id="transfer-email"
                      type="email"
                      placeholder="member@example.com"
                      value={transferEmail}
                      onChange={(e) => setTransferEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setTransferConfirm(true)}
                    disabled={!transferEmail.trim() || transferring}
                  >
                    Transfer
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Archive Confirmation */}
      <ConfirmationDialog
        open={archiveConfirm}
        onOpenChange={setArchiveConfirm}
        title="Archive Group"
        description="Archiving this group will hide it from all members until it is unarchived. Are you sure?"
        confirmText="Archive"
        variant="warning"
        onConfirm={handleArchive}
      />

      {/* Unarchive Confirmation */}
      <ConfirmationDialog
        open={unarchiveConfirm}
        onOpenChange={setUnarchiveConfirm}
        title="Unarchive Group"
        description="This will restore the group and make it visible and accessible to all members."
        confirmText="Unarchive"
        onConfirm={handleUnarchive}
      />

      {/* Transfer Ownership Confirmation */}
      <ConfirmationDialog
        open={transferConfirm}
        onOpenChange={setTransferConfirm}
        title="Transfer Ownership"
        description={`Transfer primary admin ownership to ${transferEmail}? You will remain an admin but will lose creator privileges. This cannot be undone.`}
        confirmText="Transfer"
        variant="warning"
        onConfirm={handleTransferAdmin}
      />

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

      {/* Delete Constitution Confirmation */}
      <ConfirmationDialog
        open={deleteConstitutionConfirm}
        onOpenChange={setDeleteConstitutionConfirm}
        title="Delete Constitution"
        description="Are you sure you want to delete the constitution? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleConstitutionDelete}
      />

      <BulkInviteDialog
        groupId={group.id}
        open={showBulkInvite}
        onOpenChange={setShowBulkInvite}
        onSuccess={() => invalidate.members(group.id)}
      />

      <ConstitutionGeneratorDialog
        open={showConstitutionGen}
        onOpenChange={setShowConstitutionGen}
        groupName={group.name}
        groupType={group.groupType || 'rotating'}
      />
    </div>
  );
}
