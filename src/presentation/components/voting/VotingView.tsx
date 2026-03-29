import { useEffect, useState } from 'react';
import type { Vote } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/ui/dialog';
import { Plus, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Progress } from '@/presentation/ui/progress';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface VotingViewProps {
  groupId: string;
  meetingId?: string;
  isAdmin: boolean;
  userEmail: string;
}

export function VotingView({ groupId, meetingId, isAdmin, userEmail }: VotingViewProps) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVotes();
  }, [groupId, meetingId]);

  const loadVotes = async () => {
    try {
      setLoading(true);
      const data = await api.getVotes(groupId, meetingId);
      setVotes(data.votes || []);
    } catch (error) {
      console.error('Failed to load votes:', error);
      toast.error('Failed to load votes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await api.createVote({ groupId, question, meetingId });
      toast.success('Vote created successfully');
      setOpen(false);
      setQuestion('');
      loadVotes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create vote');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCastVote = async (voteId: string, answer: 'yes' | 'no') => {
    try {
      await api.castVote(voteId, answer);
      toast.success('Vote cast successfully');
      loadVotes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cast vote');
    }
  };

  const getUserVote = (vote: Vote) => {
    if (vote.yesVotes.includes(userEmail)) return 'yes';
    if (vote.noVotes.includes(userEmail)) return 'no';
    return null;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Votes & Decisions</CardTitle>
        {isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Vote
              </Button>
            </DialogTrigger>
            {open && (
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Vote</DialogTitle>
                  <DialogDescription>
                    Start a new vote for group members to participate in
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateVote} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="question">Question</Label>
                    <Input
                      id="question"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="e.g., Should we increase monthly contributions?"
                      required
                      disabled={submitting}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? 'Creating...' : 'Create Vote'}
                  </Button>
                </form>
              </DialogContent>
            )}
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading votes...</div>
        ) : votes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {isAdmin ? 'No votes yet. Create your first vote!' : 'No votes available yet.'}
          </div>
        ) : (
          votes.map((vote) => {
            const totalVotes = vote.yesVotes.length + vote.noVotes.length;
            const yesPercentage = totalVotes > 0 ? (vote.yesVotes.length / totalVotes) * 100 : 0;
            const userVote = getUserVote(vote);

            return (
              <Card key={vote.id} className="border-2">
                <CardContent className="pt-6">
                  <h3 className="mb-4">{vote.question}</h3>
                  
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Yes: {vote.yesVotes.length}</span>
                        <span>{yesPercentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={yesPercentage} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>No: {vote.noVotes.length}</span>
                        <span>{(100 - yesPercentage).toFixed(0)}%</span>
                      </div>
                      <Progress value={100 - yesPercentage} className="h-2" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCastVote(vote.id, 'yes')}
                      variant={userVote === 'yes' ? 'default' : 'outline'}
                      className="flex-1"
                    >
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Yes
                    </Button>
                    <Button
                      onClick={() => handleCastVote(vote.id, 'no')}
                      variant={userVote === 'no' ? 'default' : 'outline'}
                      className="flex-1"
                    >
                      <ThumbsDown className="h-4 w-4 mr-2" />
                      No
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    {totalVotes} member{totalVotes !== 1 ? 's' : ''} voted
                    {userVote && ' • You voted ' + userVote.toUpperCase()}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
