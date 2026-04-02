import { useEffect, useState } from 'react';
import type { Announcement } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Switch } from '@/presentation/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { Plus, Megaphone, Pin, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/export';

interface AnnouncementsViewProps {
  groupId: string;
  isAdmin: boolean;
}

export function AnnouncementsView({ groupId, isAdmin }: AnnouncementsViewProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Announcement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [groupId]);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.getAnnouncements(groupId);
      setAnnouncements(data.announcements || []);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setUrgent(false);
    setPinned(false);
  };

  const openEdit = (ann: Announcement) => {
    setEditTarget(ann);
    setTitle(ann.title);
    setContent(ann.content);
    setUrgent(ann.urgent);
    setPinned(ann.pinned);
  };

  const closeEdit = () => {
    setEditTarget(null);
    resetForm();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createAnnouncement(groupId, { title, content, urgent, pinned });
      toast.success('Announcement created');
      setCreateOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.updateAnnouncement(groupId, editTarget.id, { title, content, urgent, pinned });
      toast.success('Announcement updated');
      closeEdit();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await api.deleteAnnouncement(groupId, deleteConfirm.id);
      toast.success('Announcement deleted');
      setDeleteConfirm({ open: false, id: null });
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete announcement');
    }
  };

  const AnnouncementForm = ({ onSubmit, submitLabel }: { onSubmit: (e: React.FormEvent) => void; submitLabel: string }) => (
    <form onSubmit={onSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="ann-title">Title</Label>
        <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={submitting} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ann-content">Message</Label>
        <Textarea id="ann-content" value={content} onChange={(e) => setContent(e.target.value)} rows={4} required disabled={submitting} />
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch id="ann-urgent" checked={urgent} onCheckedChange={setUrgent} disabled={submitting} />
          <Label htmlFor="ann-urgent" className="flex items-center gap-1 cursor-pointer">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            Urgent
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="ann-pinned" checked={pinned} onCheckedChange={setPinned} disabled={submitting} />
          <Label htmlFor="ann-pinned" className="flex items-center gap-1 cursor-pointer">
            <Pin className="h-3.5 w-3.5 text-blue-500" />
            Pin to top
          </Label>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? 'Saving...' : submitLabel}
      </Button>
    </form>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          Announcements
        </CardTitle>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </DialogTrigger>
            {createOpen && (
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Announcement</DialogTitle>
                  <DialogDescription>Broadcast a message to all group members</DialogDescription>
                </DialogHeader>
                <AnnouncementForm onSubmit={handleCreate} submitLabel="Post Announcement" />
              </DialogContent>
            )}
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No announcements yet.{isAdmin ? ' Post one to notify all members.' : ''}
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className={`rounded-lg border p-4 ${ann.urgent ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30' : ann.pinned ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20' : 'border-border bg-card'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ann.pinned && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                      {ann.urgent && (
                        <Badge variant="destructive" className="text-xs gap-1 bg-orange-500">
                          <AlertTriangle className="h-3 w-3" />
                          Urgent
                        </Badge>
                      )}
                      <h3 className="font-semibold text-sm">{ann.title}</h3>
                    </div>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground mb-2">{ann.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {ann.author ? `${ann.author.fullName} ${ann.author.surname}` : ann.createdBy} · {formatDateTime(ann.createdAt)}
                      {ann.updatedAt && ann.updatedAt !== ann.createdAt && ' · edited'}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ann)} aria-label="Edit announcement">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm({ open: true, id: ann.id })} aria-label="Delete announcement">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => { if (!v) closeEdit(); }}>
        {editTarget && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
              <DialogDescription>Update this announcement for all members</DialogDescription>
            </DialogHeader>
            <AnnouncementForm onSubmit={handleUpdate} submitLabel="Save Changes" />
          </DialogContent>
        )}
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(v) => setDeleteConfirm({ open: v, id: deleteConfirm.id })}
        title="Delete Announcement"
        description="This announcement will be permanently removed. Members will no longer see it."
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="destructive"
      />
    </Card>
  );
}
