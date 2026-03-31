import { useEffect, useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/ui/table';
import { Badge } from '@/presentation/ui/badge';
import { Skeleton } from '@/presentation/ui/skeleton';
import { EmptyState } from '@/presentation/shared/EmptyState';
import { Calendar, Plus, MapPin, FileText, Edit2, Trash2, Clock, Eye, RefreshCw, AlertTriangle, Check, X, HelpCircle } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { ConfirmationDialog } from '@/presentation/shared/ConfirmationDialog';
import type { Meeting, RSVPSummary } from '@/domain/types';

interface MeetingsViewProps {
  groupId: string;
  isAdmin: boolean;
  userEmail: string;
}

export function MeetingsView({ groupId, isAdmin, userEmail }: MeetingsViewProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [_viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [rsvpSummaries, setRsvpSummaries] = useState<Record<string, RSVPSummary>>({});
  const [rsvpLoading, setRsvpLoading] = useState<string | null>(null);

  // Form fields
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [agenda, setAgenda] = useState('');

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    meetingId: string;
  }>({ open: false, meetingId: '' });

  useEffect(() => {
    loadMeetings();
  }, [groupId]);

  const loadMeetings = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api.getMeetings(groupId);
      const loaded = data.meetings || [];
      setMeetings(loaded);
      // Load RSVP summaries for upcoming meetings
      const upcoming = loaded.filter(m => new Date(`${m.date}T${m.time}`) >= new Date());
      const summaries: Record<string, RSVPSummary> = {};
      await Promise.all(upcoming.map(async m => {
        try {
          const d = await api.getMeetingRSVPs(m.id);
          summaries[m.id] = d.summary;
        } catch { /* silent */ }
      }));
      setRsvpSummaries(summaries);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (meetingId: string, response: 'yes' | 'no' | 'maybe') => {
    setRsvpLoading(meetingId);
    try {
      await api.rsvpMeeting(meetingId, response);
      toast.success(`RSVP recorded: ${response}`);
      // Update local summary optimistically
      setRsvpSummaries(prev => {
        const cur = prev[meetingId] || { yes: 0, no: 0, maybe: 0, myResponse: null };
        const next = { ...cur };
        // Remove old response count
        if (cur.myResponse) next[cur.myResponse] = Math.max(0, (next[cur.myResponse] as number) - 1);
        // Add new response count
        next[response] = (next[response] as number) + 1;
        next.myResponse = response;
        return { ...prev, [meetingId]: next as RSVPSummary };
      });
    } catch {
      toast.error('Failed to save RSVP');
    } finally {
      setRsvpLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingMeeting) {
        await api.updateMeeting(groupId, editingMeeting.id, {
          date,
          time,
          venue,
          agenda
        });
        toast.success('Meeting updated successfully');
      } else {
        await api.createMeeting(groupId, {
          date,
          time,
          venue,
          agenda
        });
        toast.success('Meeting scheduled successfully');
      }
      
      setOpen(false);
      resetForm();
      loadMeetings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setDate(meeting.date);
    setTime(meeting.time);
    setVenue(meeting.venue);
    setAgenda(meeting.agenda || '');
    setOpen(true);
  };

  const handleDelete = async (meetingId: string) => {
    try {
      await api.deleteMeeting(groupId, meetingId);
      toast.success('Meeting deleted successfully');
      loadMeetings();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete meeting');
    } finally {
      setDeleteConfirm({ open: false, meetingId: '' });
    }
  };



  const resetForm = () => {
    setDate('');
    setTime('');
    setVenue('');
    setAgenda('');
    setEditingMeeting(null);
  };

  const handleDialogChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const isPastMeeting = (dateString: string, timeString: string) => {
    const meetingDateTime = new Date(`${dateString}T${timeString}`);
    return meetingDateTime < new Date();
  };

  const getUpcomingMeetings = () => {
    return meetings.filter(m => !isPastMeeting(m.date, m.time))
      .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
  };

  const getPastMeetings = () => {
    return meetings.filter(m => isPastMeeting(m.date, m.time))
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  };

  const upcomingMeetings = getUpcomingMeetings();
  const pastMeetings = getPastMeetings();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Group Meetings Calendar</CardTitle>
            </div>
            {isAdmin && (
              <Dialog open={open} onOpenChange={handleDialogChange}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </DialogTrigger>
                {open && (
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>
                        {editingMeeting ? 'Edit Meeting' : 'Schedule New Meeting'}
                      </DialogTitle>
                      <DialogDescription>
                        {editingMeeting 
                          ? 'Update the meeting details below'
                          : 'Schedule a new meeting for the group members'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          required
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          required
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="venue">Venue</Label>
                      <Input
                        id="venue"
                        type="text"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="e.g., Community Hall, Zoom Meeting, etc."
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agenda">Meeting Agenda (Optional)</Label>
                      <Textarea
                        id="agenda"
                        value={agenda}
                        onChange={(e) => setAgenda(e.target.value)}
                        placeholder="Describe the topics to be discussed..."
                        rows={5}
                        disabled={submitting}
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDialogChange(false)}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="flex-1" disabled={submitting}>
                        {submitting ? 'Saving...' : editingMeeting ? 'Update Meeting' : 'Schedule Meeting'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
                )}
              </Dialog>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <Button variant="outline" size="sm" onClick={loadMeetings}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </div>
          ) : meetings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No meetings scheduled"
              description="Schedule your first group meeting to get started"
              action={isAdmin ? { label: 'Schedule Meeting', onClick: () => setOpen(true) } : undefined}
            />
          ) : (
            <div className="space-y-6">
              {/* Upcoming Meetings */}
              {upcomingMeetings.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg">Upcoming Meetings</h3>
                    <Badge variant="secondary">{upcomingMeetings.length}</Badge>
                  </div>
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Venue</TableHead>
                          <TableHead>Agenda</TableHead>
                          <TableHead>RSVP</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingMeetings.map((meeting) => {
                          const rsvp = rsvpSummaries[meeting.id];
                          const myResponse = rsvp?.myResponse;
                          return (
                          <TableRow key={meeting.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{formatDate(meeting.date)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {meeting.time}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span>{meeting.venue}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {meeting.agenda ? (
                                <div className="flex items-start gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                  <p className="line-clamp-2 text-sm">{meeting.agenda}</p>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No agenda</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1.5">
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleRSVP(meeting.id, 'yes')}
                                    disabled={rsvpLoading === meeting.id}
                                    title="Yes, I'll attend"
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${myResponse === 'yes' ? 'bg-green-600 text-white' : 'bg-muted hover:bg-green-100 dark:hover:bg-green-900/20 text-muted-foreground'}`}
                                  >
                                    <Check className="h-3 w-3" />Yes
                                  </button>
                                  <button
                                    onClick={() => handleRSVP(meeting.id, 'maybe')}
                                    disabled={rsvpLoading === meeting.id}
                                    title="Maybe"
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${myResponse === 'maybe' ? 'bg-amber-500 text-white' : 'bg-muted hover:bg-amber-100 dark:hover:bg-amber-900/20 text-muted-foreground'}`}
                                  >
                                    <HelpCircle className="h-3 w-3" />?
                                  </button>
                                  <button
                                    onClick={() => handleRSVP(meeting.id, 'no')}
                                    disabled={rsvpLoading === meeting.id}
                                    title="No, I can't attend"
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${myResponse === 'no' ? 'bg-red-500 text-white' : 'bg-muted hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground'}`}
                                  >
                                    <X className="h-3 w-3" />No
                                  </button>
                                </div>
                                {rsvp && (
                                  <p className="text-xs text-muted-foreground">
                                    ✓{rsvp.yes} ?{rsvp.maybe} ✗{rsvp.no}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingMeeting(meeting)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                                {isAdmin && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(meeting)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeleteConfirm({ open: true, meetingId: meeting.id })}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Past Meetings */}
              {pastMeetings.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg">Past Meetings</h3>
                    <Badge variant="outline">{pastMeetings.length}</Badge>
                  </div>
                  <div className="rounded-lg border opacity-75">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Venue</TableHead>
                          <TableHead>Agenda</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pastMeetings.map((meeting) => (
                          <TableRow key={meeting.id} className="hover:bg-muted/50">
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span>{formatDate(meeting.date)}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {meeting.time}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{meeting.venue}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {meeting.agenda ? (
                                <div className="flex items-start gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                  <p className="line-clamp-2 text-sm text-muted-foreground">{meeting.agenda}</p>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No agenda</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setViewingMeeting(meeting)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </Button>
                                {isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteConfirm({ open: true, meetingId: meeting.id })}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
        title="Delete Meeting"
        description="Are you sure you want to delete this meeting? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        onConfirm={() => handleDelete(deleteConfirm.meetingId)}
      />
    </div>
  );
}
