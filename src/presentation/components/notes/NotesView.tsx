import { useEffect, useState } from 'react';
import type { Note } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Plus, FileText } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface NotesViewProps {
  groupId: string;
  meetingId?: string;
}

export function NotesView({ groupId, meetingId }: NotesViewProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadNotes();
  }, [groupId]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await api.getNotes(groupId);
      setNotes(data.notes || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.createNote({ groupId, title, content, meetingId });
      toast.success('Note created successfully');
      setOpen(false);
      setTitle('');
      setContent('');
      loadNotes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Notes</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          {open && (
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
                <DialogDescription>
                  Share an important note with all group members
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={5}
                    required
                    disabled={submitting}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Note'}
                </Button>
              </form>
            </DialogContent>
          )}
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No notes yet. Create your first note to share information with the group!
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <CardTitle className="text-base">{note.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          By {note.author && note.author.fullName !== 'Unknown'
                            ? `${note.author.fullName} ${note.author.surname}`
                            : note.createdBy || 'Unknown Author'} • {formatDate(note.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{note.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
