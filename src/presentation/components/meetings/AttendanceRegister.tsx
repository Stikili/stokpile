import { useState, useEffect } from 'react';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Input } from '@/presentation/ui/input';
import { Separator } from '@/presentation/ui/separator';
import { ScrollArea } from '@/presentation/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/ui/tooltip';
import { EmptyState } from '@/presentation/shared/EmptyState';
import { UserAvatar } from '@/presentation/components/profile/UserAvatar';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  UserCheck,
  Search,
  Download,
  CheckCheck,
  Clock,
  Calendar,
  Percent
} from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { exportToCSV, formatDate } from '@/lib/export';
import type { Member } from '@/domain/types';

interface AttendanceRegisterProps {
  groupId: string;
  meetingId: string;
  meetingDate: string;
  meetingTime: string;
  isAdmin: boolean;
  userEmail: string;
}


export function AttendanceRegister({
  groupId,
  meetingId,
  meetingDate,
  meetingTime,
  isAdmin,
  userEmail
}: AttendanceRegisterProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'unmarked'>('all');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [groupId, meetingId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load members and meeting data in parallel
      const [membersData, meetingData] = await Promise.all([
        api.getMembers(groupId),
        api.getMeeting(groupId, meetingId)
      ]);

      // Filter to only show active members
      const activeMembers = (membersData.members || []).filter((m: Member) => m.status !== 'inactive');
      setMembers(activeMembers);
      setAttendance(meetingData.meeting?.attendance || {});
    } catch (error) {
      console.error('Failed to load attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceToggle = async (memberEmail: string, isPresent: boolean) => {
    // Allow users to mark their own attendance, or admins to mark anyone's
    const isOwnAttendance = memberEmail === userEmail;
    
    if (!isAdmin && !isOwnAttendance) {
      toast.error('You can only mark your own attendance');
      return;
    }

    try {
      setUpdating(memberEmail);
      await api.updateAttendance(groupId, meetingId, memberEmail, isPresent);
      
      setAttendance(prev => ({
        ...prev,
        [memberEmail]: isPresent
      }));
      
      const memberName = members.find(m => m.email === memberEmail)?.fullName || 'Member';
      
      if (isOwnAttendance) {
        toast.success(
          isPresent 
            ? 'You marked yourself as present'
            : 'You marked yourself as absent'
        );
      } else {
        toast.success(
          isPresent 
            ? `Marked ${memberName} as present`
            : `Marked ${memberName} as absent`
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update attendance');
    } finally {
      setUpdating(null);
    }
  };

  const handleMarkAllPresent = async () => {
    if (!isAdmin) {
      toast.error('Only admins can mark attendance');
      return;
    }

    try {
      setLoading(true);
      
      // Mark all members as present
      for (const member of members) {
        await api.updateAttendance(groupId, meetingId, member.email, true);
      }
      
      const newAttendance: Record<string, boolean> = {};
      members.forEach(member => {
        newAttendance[member.email] = true;
      });
      setAttendance(newAttendance);
      
      toast.success('All members marked as present');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark all present');
    } finally {
      setLoading(false);
    }
  };

  const handleExportAttendance = () => {
    const exportData = filteredMembers.map(member => ({
      'Full Name': `${member.fullName} ${member.surname}`,
      'Email': member.email,
      'Role': member.role,
      'Status': getAttendanceStatus(member.email),
      'Meeting Date': formatDate(meetingDate),
      'Meeting Time': meetingTime
    }));
    
    exportToCSV(
      exportData, 
      `attendance_${meetingDate.split('T')[0]}_${new Date().toISOString().split('T')[0]}`
    );
    toast.success('Attendance register exported successfully!');
  };

  const getAttendanceStatus = (memberEmail: string): string => {
    if (attendance[memberEmail] === undefined) return 'Unmarked';
    return attendance[memberEmail] ? 'Present' : 'Absent';
  };

  const getStats = () => {
    const present = Object.values(attendance).filter(v => v === true).length;
    const absent = Object.values(attendance).filter(v => v === false).length;
    const unmarked = members.length - present - absent;
    const total = members.length;
    const attendanceRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';

    return { present, absent, unmarked, total, attendanceRate };
  };

  // Filter members based on search and status
  // Non-admins only see their own row (to protect member privacy)
  const filteredMembers = members.filter(member => {
    if (!isAdmin) return member.email === userEmail;

    // Search filter
    const matchesSearch =
      member.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.surname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Status filter
    if (filterStatus === 'present') return attendance[member.email] === true;
    if (filterStatus === 'absent') return attendance[member.email] === false;
    if (filterStatus === 'unmarked') return attendance[member.email] === undefined;
    return true;
  });

  const stats = getStats();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Attendance Register
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
                <div className="h-8 w-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Attendance Register
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(meetingDate)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {meetingTime}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && members.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleMarkAllPresent}
                    disabled={loading}
                  >
                    <CheckCheck className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Mark All Present</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark all members as present</TooltipContent>
              </Tooltip>
            )}
            {members.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleExportAttendance}
                  >
                    <Download className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Export</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export attendance register</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Statistics Cards — admin only */}
        {isAdmin && <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Present</span>
              </div>
              <p className="text-2xl">{stats.present}</p>
            </CardContent>
          </Card>

          <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                <XCircle className="h-4 w-4" />
                <span className="text-sm">Absent</span>
              </div>
              <p className="text-2xl">{stats.absent}</p>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm">Unmarked</span>
              </div>
              <p className="text-2xl">{stats.unmarked}</p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                <Percent className="h-4 w-4" />
                <span className="text-sm">Rate</span>
              </div>
              <p className="text-2xl">{stats.attendanceRate}%</p>
            </CardContent>
          </Card>
        </div>}

        {/* Quick Self-Attendance Card for non-admins */}
        {!isAdmin && members.find(m => m.email === userEmail) && (
          <>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={`${members.find(m => m.email === userEmail)?.fullName} ${members.find(m => m.email === userEmail)?.surname}`}
                      email={userEmail}
                      profilePictureUrl={members.find(m => m.email === userEmail)?.profilePictureUrl}
                      size="md"
                    />
                    <div>
                      <p className="font-medium">Mark Your Attendance</p>
                      <p className="text-sm text-muted-foreground">
                        {attendance[userEmail] === true 
                          ? "You're marked as present ✓" 
                          : attendance[userEmail] === false 
                          ? "You're marked as absent"
                          : "You haven't marked your attendance yet"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={attendance[userEmail] === true ? "default" : "outline"}
                      className={attendance[userEmail] === true ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => handleAttendanceToggle(userEmail, true)}
                      disabled={updating === userEmail}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Present
                    </Button>
                    <Button
                      size="sm"
                      variant={attendance[userEmail] === false ? "destructive" : "outline"}
                      onClick={() => handleAttendanceToggle(userEmail, false)}
                      disabled={updating === userEmail}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Absent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <Separator />

        {/* Search and Filters — admin only */}
        {isAdmin && members.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All ({members.length})
              </Button>
              <Button
                variant={filterStatus === 'present' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('present')}
                className={filterStatus === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Present ({stats.present})
              </Button>
              <Button
                variant={filterStatus === 'absent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('absent')}
                className={filterStatus === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Absent ({stats.absent})
              </Button>
              <Button
                variant={filterStatus === 'unmarked' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('unmarked')}
              >
                Unmarked ({stats.unmarked})
              </Button>
            </div>
          </div>
        )}

        {/* Members List */}
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members found"
            description="There are no active members in this group"
          />
        ) : filteredMembers.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching members"
            description="Try adjusting your search or filters"
          />
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-4">
              {filteredMembers.map((member) => {
                const isPresent = attendance[member.email] === true;
                const isMarked = attendance[member.email] !== undefined;
                const isUpdating = updating === member.email;
                const isCurrentUser = member.email === userEmail;
                const statusColor = isMarked 
                  ? (isPresent ? 'border-green-500 dark:border-green-700' : 'border-red-500 dark:border-red-700')
                  : 'border-border';

                return (
                  <div
                    key={member.email}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${statusColor} ${
                      isUpdating ? 'opacity-50' : ''
                    } ${isCurrentUser ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <UserAvatar
                        name={`${member.fullName} ${member.surname}`}
                        email={member.email}
                        profilePictureUrl={member.profilePictureUrl}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate">
                            {member.fullName} {member.surname}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="default" className="text-xs bg-primary">You</Badge>
                          )}
                          {member.role === 'admin' && (
                            <Badge variant="secondary" className="text-xs">Admin</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      {isMarked && (
                        <Badge 
                          variant={isPresent ? 'default' : 'destructive'}
                          className={isPresent ? 'bg-green-600' : ''}
                        >
                          {isPresent ? 'Present' : 'Absent'}
                        </Badge>
                      )}

                      {/* Action Buttons - Show for admins or for user's own attendance */}
                      {(isAdmin || member.email === userEmail) && (
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant={isPresent ? "default" : "outline"}
                                className={isPresent ? "bg-green-600 hover:bg-green-700" : ""}
                                onClick={() => handleAttendanceToggle(member.email, true)}
                                disabled={isUpdating}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {member.email === userEmail ? 'Mark yourself as present' : 'Mark as present'}
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant={isMarked && !isPresent ? "destructive" : "outline"}
                                onClick={() => handleAttendanceToggle(member.email, false)}
                                disabled={isUpdating}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {member.email === userEmail ? 'Mark yourself as absent' : 'Mark as absent'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      {/* View Only for Non-Admins viewing other members */}
                      {!isAdmin && member.email !== userEmail && !isMarked && (
                        <Badge variant="outline">Not Marked</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* User Info Note */}
        {!isAdmin && (
          <div className="text-sm text-muted-foreground text-center p-4 bg-muted/50 rounded-lg">
            <p className="mb-1">✓ You can mark your own attendance as present or absent</p>
            <p>Admins can mark attendance for all members</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
