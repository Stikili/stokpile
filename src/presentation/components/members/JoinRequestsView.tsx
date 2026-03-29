import { useEffect, useState } from 'react';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/presentation/ui/table';
import { Check, X } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import type { JoinRequest } from '@/domain/types';

interface JoinRequestsViewProps {
  groupId: string;
}

export function JoinRequestsView({ groupId }: JoinRequestsViewProps) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) {
      loadRequests();
    }
  }, [groupId]);

  const loadRequests = async () => {
    if (!groupId) return;
    
    try {
      setLoading(true);
      const data = await api.getJoinRequests(groupId);
      setRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
      // Don't show toast on initial load
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (email: string) => {
    setProcessing(email);
    try {
      await api.approveRequest(groupId, email);
      toast.success('Member approved successfully');
      loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve member');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (email: string) => {
    setProcessing(email);
    try {
      await api.denyRequest(groupId, email);
      toast.success('Request denied');
      loadRequests();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deny request');
    } finally {
      setProcessing(null);
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
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-base">Pending Join Requests</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {loading ? (
          <div className="text-center py-6 text-sm text-muted-foreground">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No pending join requests
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.userEmail}>
                    <TableCell>
                      {request.user?.fullName} {request.user?.surname}
                    </TableCell>
                    <TableCell>{request.userEmail}</TableCell>
                    <TableCell>{request.user?.country}</TableCell>
                    <TableCell>{formatDate(request.requestedAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(request.userEmail)}
                          disabled={processing === request.userEmail}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeny(request.userEmail)}
                          disabled={processing === request.userEmail}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
