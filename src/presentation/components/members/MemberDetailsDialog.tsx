import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Badge } from '@/presentation/ui/badge';
import { Separator } from '@/presentation/ui/separator';
import { UserAvatar } from '@/presentation/components/profile/UserAvatar';
import { Eye, Mail, MapPin, Calendar, Shield, UserCheck, UserX } from 'lucide-react';
import type { Member } from '@/domain/types';

interface MemberDetailsDialogProps {
  member: Member;
  groupCreatedBy?: string;
}

export function MemberDetailsDialog({ member, groupCreatedBy }: MemberDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const isCreator = member.email === groupCreatedBy;
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription>
              Complete information about this group member
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            {/* Avatar and Basic Info */}
            <div className="flex items-center gap-4">
              <UserAvatar 
                name={`${member.fullName} ${member.surname}`}
                email={member.email}
                className="h-16 w-16"
              />
              <div className="flex-1 min-w-0">
                <h3 className="truncate">
                  {member.fullName} {member.surname}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                    {member.role}
                  </Badge>
                  {member.status && (
                    <Badge variant={member.status === 'inactive' ? 'destructive' : 'default'}>
                      {member.status}
                    </Badge>
                  )}
                  {isCreator && (
                    <Badge variant="outline" className="text-xs">
                      Creator
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                Personal Information
              </h4>
              <div className="space-y-2 pl-6">
                <div>
                  <p className="text-sm text-muted-foreground">First Name</p>
                  <p className="text-sm">{member.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Surname</p>
                  <p className="text-sm">{member.surname}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Contact Information
              </h4>
              <div className="space-y-2 pl-6">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm break-all">{member.email}</p>
                </div>
                {member.country && (
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <p className="text-sm">{member.country}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Membership Information */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Membership Information
              </h4>
              <div className="space-y-2 pl-6">
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <div className="flex items-center gap-2">
                    {member.role === 'admin' ? (
                      <Shield className="h-3 w-3 text-primary" />
                    ) : (
                      <UserCheck className="h-3 w-3" />
                    )}
                    <p className="text-sm capitalize">{member.role}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Joined Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <p className="text-sm">{formatDate(member.joinedAt)}</p>
                  </div>
                </div>
                {member.status === 'inactive' && member.deactivatedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Deactivated Date</p>
                    <div className="flex items-center gap-2">
                      <UserX className="h-3 w-3 text-destructive" />
                      <p className="text-sm">{formatDate(member.deactivatedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {member.createdAt && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm">Account Created</h4>
                  <p className="text-sm text-muted-foreground pl-6">
                    {formatDate(member.createdAt)}
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
