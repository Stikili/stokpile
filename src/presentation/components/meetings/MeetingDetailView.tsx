import { useState, useEffect } from 'react';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/ui/tabs';
import { Badge } from '@/presentation/ui/badge';
import { Separator } from '@/presentation/ui/separator';
import { ScrollArea } from '@/presentation/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { Progress } from '@/presentation/ui/progress';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Users,
  CheckCircle2,
  XCircle,
  Vote as VoteIcon,
  MessageSquare,
  StickyNote,
  ThumbsUp,
  ThumbsDown,
  ClipboardList,
  UserCheck
} from 'lucide-react';
import { UserAvatar } from '@/presentation/components/profile/UserAvatar';
import { VotingView } from '@/presentation/components/voting/VotingView';
import { NotesView } from '@/presentation/components/notes/NotesView';
import { ChatView } from '@/presentation/components/chat/ChatView';
import { AttendanceRegister } from '@/presentation/components/meetings/AttendanceRegister';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import type { Meeting, Member, Vote, Note, ChatMessage } from '@/domain/types';

interface MeetingDetailViewProps {
  meeting: Meeting;
  groupId: string;
  isAdmin: boolean;
  userEmail: string;
  onBack: () => void;
}

export function MeetingDetailView({ meeting, groupId, isAdmin, userEmail, onBack }: MeetingDetailViewProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [localMeeting, setLocalMeeting] = useState(meeting);
  const [activeTab, setActiveTab] = useState('details');
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);

  useEffect(() => {
    loadMembers();
  }, [groupId]);

  const loadMembers = async () => {
    try {
      const data = await api.getMembers(groupId);
      // Filter to only show active members in attendance register
      const activeMembers = (data.members || []).filter((m: Member) => m.status !== 'inactive');
      setMembers(activeMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleAttendanceToggle = async (memberEmail: string, isPresent: boolean) => {
    try {
      await api.updateAttendance(groupId, meeting.id, memberEmail, isPresent);
      // Update local state
      setLocalMeeting((prev: Meeting) => ({
        ...prev,
        attendance: {
          ...(prev.attendance || {}),
          [memberEmail]: isPresent
        }
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update attendance');
    }
  };

  const getAttendanceStats = () => {
    if (!localMeeting.attendance) return { present: 0, absent: 0, total: members.length };
    const attendance = localMeeting.attendance;
    const present = Object.values(attendance).filter(v => v === true).length;
    const total = members.length;
    const absent = total - present;
    return { present, absent, total };
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

  const stats = getAttendanceStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Meetings
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl">{formatDate(localMeeting.date)}</h2>
                </div>
                
                <div className="flex flex-wrap gap-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{localMeeting.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{localMeeting.venue}</span>
                  </div>
                </div>

                {localMeeting.agenda && (
                  <div className="flex items-start gap-2 pt-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{localMeeting.agenda}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 p-4 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-2">
                <UserCheck className="h-5 w-5" />
                <span>Attendance</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl">{stats.present}</span>
                <span className="text-muted-foreground">/ {stats.total} present</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setAttendanceDialogOpen(true)}
              >
                Manage Attendance
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Content Tabs */}
      <Tabs value={activeTab} onValueChange={(tab) => {
        if (tab === 'details' && activeTab !== 'details') {
          setDetailsRefreshKey(k => k + 1);
        }
        setActiveTab(tab);
      }} className="w-full">
        <TabsList className="bg-white dark:bg-card w-full justify-start overflow-x-auto">
          <TabsTrigger value="details" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="attendance" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Attendance
          </TabsTrigger>
          <TabsTrigger value="voting" className="gap-2">
            <VoteIcon className="h-4 w-4" />
            Voting
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Discussion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <MeetingDetailsTab
            key={detailsRefreshKey}
            meeting={localMeeting}
            groupId={groupId}
            members={members}
            userEmail={userEmail}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceRegister
            groupId={groupId}
            meetingId={localMeeting.id}
            meetingDate={localMeeting.date}
            meetingTime={localMeeting.time}
            isAdmin={isAdmin}
            userEmail={userEmail}
          />
        </TabsContent>

        <TabsContent value="voting" className="mt-6">
          <VotingView
            groupId={groupId}
            meetingId={localMeeting.id}
            isAdmin={isAdmin}
            userEmail={userEmail}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <NotesView 
            groupId={groupId}
            meetingId={localMeeting.id}
          />
        </TabsContent>

        <TabsContent value="chat" className="mt-6">
          <ChatView
            groupId={groupId}
            meetingId={localMeeting.id}
            userEmail={userEmail}
          />
        </TabsContent>
      </Tabs>

      {/* Attendance Register Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        {attendanceDialogOpen && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Attendance Register
              </DialogTitle>
              <DialogDescription>
                {formatDate(localMeeting.date)} at {localMeeting.time}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {/* Attendance Stats */}
              <div className="flex gap-4">
                <div className="flex-1 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Present</span>
                  </div>
                  <p className="text-2xl mt-1">{stats.present}</p>
                </div>
                <div className="flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    <span className="text-sm">Absent</span>
                  </div>
                  <p className="text-2xl mt-1">{stats.absent}</p>
                </div>
              </div>

              <Separator />

              {/* Member List */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {members.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No active members in this group</p>
                    </div>
                  ) : (
                    members.map((member) => {
                    const isPresent = localMeeting.attendance?.[member.email] === true;
                    const isMarked = localMeeting.attendance?.[member.email] !== undefined;
                    
                    return (
                      <div
                        key={member.email}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <UserAvatar
                            name={`${member.fullName} ${member.surname}`}
                            email={member.email}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="truncate">
                              {member.fullName} {member.surname}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {member.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={isPresent ? "default" : "outline"}
                            className={isPresent ? "bg-green-600 hover:bg-green-700" : ""}
                            onClick={() => handleAttendanceToggle(member.email, true)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={isMarked && !isPresent ? "destructive" : "outline"}
                            onClick={() => handleAttendanceToggle(member.email, false)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                  )}
                </div>
              </ScrollArea>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

// Meeting Details Summary Tab Component
interface MeetingDetailsTabProps {
  meeting: Meeting;
  groupId: string;
  members: Member[];
  userEmail: string;
}

function MeetingDetailsTab({ meeting, groupId, members, userEmail }: MeetingDetailsTabProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [groupId, meeting.id]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [votesData, notesData, messagesData] = await Promise.all([
        api.getVotes(groupId, meeting.id),
        api.getNotes(groupId, meeting.id),
        api.getMessages(groupId, meeting.id)
      ]);
      setVotes(votesData.votes || []);
      setNotes(notesData.notes || []);
      setMessages(messagesData.messages || []);
    } catch (error) {
      console.error('Failed to load meeting data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceList = () => {
    const present = members.filter(m => meeting.attendance?.[m.email] === true);
    const absent = members.filter(m => {
      const status = meeting.attendance?.[m.email];
      return status === false || status === undefined;
    });
    return { present, absent };
  };

  const { present, absent } = getAttendanceList();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meeting details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Meeting Information */}
      <Card>
        <CardHeader>
          <CardTitle>Meeting Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Date & Time</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span>{new Date(meeting.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 ml-6">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{meeting.time}</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Venue</div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{meeting.venue}</span>
              </div>
            </div>
          </div>
          {meeting.agenda && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">Agenda</div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="whitespace-pre-wrap">{meeting.agenda}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                <CheckCircle2 className="h-5 w-5" />
                <span>Present</span>
              </div>
              <p className="text-3xl mb-2">{present.length}</p>
              <div className="text-sm text-green-600 dark:text-green-500">
                {members.length > 0 ? Math.round((present.length / members.length) * 100) : 0}% attendance
              </div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                <XCircle className="h-5 w-5" />
                <span>Absent</span>
              </div>
              <p className="text-3xl mb-2">{absent.length}</p>
              <div className="text-sm text-red-600 dark:text-red-500">
                {members.length - present.length} members
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            {present.length > 0 && (
              <div>
                <h4 className="text-sm mb-2 text-green-700 dark:text-green-400">Present Members</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {present.map((member) => (
                    <div key={member.email} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/10 rounded">
                      <UserAvatar
                        name={`${member.fullName} ${member.surname}`}
                        email={member.email}
                        size="sm"
                      />
                      <span className="text-sm truncate">{member.fullName} {member.surname}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {absent.length > 0 && (
              <div>
                <h4 className="text-sm mb-2 text-red-700 dark:text-red-400">Absent Members</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {absent.map((member) => (
                    <div key={member.email} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/10 rounded opacity-60">
                      <UserAvatar
                        name={`${member.fullName} ${member.surname}`}
                        email={member.email}
                        size="sm"
                      />
                      <span className="text-sm truncate">{member.fullName} {member.surname}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Votes Summary */}
      {votes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <VoteIcon className="h-5 w-5" />
              Voting Results ({votes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {votes.map((vote) => {
                const totalVotes = vote.yesVotes.length + vote.noVotes.length;
                const yesPercentage = totalVotes > 0 ? (vote.yesVotes.length / totalVotes) * 100 : 0;
                const noPercentage = totalVotes > 0 ? (vote.noVotes.length / totalVotes) * 100 : 0;
                const userVoted = vote.yesVotes.includes(userEmail) || vote.noVotes.includes(userEmail);
                const userVote = vote.yesVotes.includes(userEmail) ? 'yes' : vote.noVotes.includes(userEmail) ? 'no' : null;

                return (
                  <div key={vote.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="mb-1">{vote.question}</h4>
                        <p className="text-sm text-muted-foreground">
                          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast
                        </p>
                      </div>
                      {userVoted && (
                        <Badge variant={userVote === 'yes' ? 'default' : 'destructive'}>
                          You voted {userVote}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm">Yes</span>
                          </div>
                          <span className="text-sm">{vote.yesVotes.length} ({Math.round(yesPercentage)}%)</span>
                        </div>
                        <Progress value={yesPercentage} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <ThumbsDown className="h-4 w-4 text-red-600" />
                            <span className="text-sm">No</span>
                          </div>
                          <span className="text-sm">{vote.noVotes.length} ({Math.round(noPercentage)}%)</span>
                        </div>
                        <Progress value={noPercentage} className="h-2" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes Summary */}
      {notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StickyNote className="h-5 w-5" />
              Meeting Notes ({notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h4>{note.title}</h4>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                  {note.author && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                      <UserAvatar
                        name={`${note.author.fullName} ${note.author.surname}`}
                        email={note.createdBy}
                        size="sm"
                      />
                      <span className="text-xs text-muted-foreground">
                        {note.author.fullName} {note.author.surname}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discussion Preview */}
      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discussion Highlights ({messages.length} messages)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {messages.slice(-10).map((msg) => (
                  <div key={msg.id} className="flex gap-3">
                    <UserAvatar
                      name={msg.sender && msg.sender.fullName !== 'Unknown'
                        ? `${msg.sender.fullName} ${msg.sender.surname}`
                        : msg.senderEmail ?? ''}
                      email={msg.senderEmail ?? ''}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm truncate">
                          {msg.sender && msg.sender.fullName !== 'Unknown'
                            ? `${msg.sender.fullName} ${msg.sender.surname}`
                            : msg.senderEmail ?? ''}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{msg.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            {messages.length > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                Showing last 10 messages. View Discussion tab for all messages.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {votes.length === 0 && notes.length === 0 && messages.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg mb-2">No Activity Yet</h3>
            <p className="text-muted-foreground mb-4">
              No votes, notes, or discussions have been added to this meeting.
            </p>
            <p className="text-sm text-muted-foreground">
              Use the tabs above to add voting topics, notes, or start a discussion.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
