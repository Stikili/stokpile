import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/presentation/ui/card';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/ui/dialog';
import { Badge } from '@/presentation/ui/badge';
import { Plus, Users, Trash2, Loader2 } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface DependentsViewProps {
  groupId: string;
  isAdmin: boolean;
}

interface Dependent {
  id: string;
  memberEmail: string;
  fullName: string;
  relationship: string;
  dateOfBirth?: string | null;
  idNumber?: string | null;
  createdAt: string;
}

const RELATIONSHIPS = [
  'Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Grandchild', 'Other family',
];

export function DependentsView({ groupId, isAdmin }: DependentsViewProps) {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ fullName: '', relationship: '', dateOfBirth: '', idNumber: '' });

  const load = async () => {
    setLoading(true);
    try {
      const { dependents } = await api.getDependents(groupId);
      setDependents(dependents);
    } catch {
      toast.error('Failed to load dependents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [groupId]);

  const handleAdd = async () => {
    if (!form.fullName || !form.relationship) {
      toast.error('Name and relationship are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.addDependent(groupId, {
        fullName: form.fullName,
        relationship: form.relationship,
        dateOfBirth: form.dateOfBirth || undefined,
        idNumber: form.idNumber || undefined,
      });
      toast.success('Dependent added');
      setShowAdd(false);
      setForm({ fullName: '', relationship: '', dateOfBirth: '', idNumber: '' });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this dependent?')) return;
    try {
      await api.deleteDependent(groupId, id);
      toast.success('Removed');
      load();
    } catch {
      toast.error('Failed to remove');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Dependents
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'All dependents covered by this burial society' : 'Family members covered under your burial benefit'}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Dependent
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : dependents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No dependents yet. Add family members to ensure they're covered.
          </p>
        ) : (
          <div className="space-y-2">
            {dependents.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{d.fullName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Badge variant="outline" className="text-[10px] h-5">{d.relationship}</Badge>
                    {d.dateOfBirth && <span>DOB: {new Date(d.dateOfBirth).toLocaleDateString()}</span>}
                    {isAdmin && <span className="truncate">· {d.memberEmail}</span>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(d.id)} aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Dependent</DialogTitle>
            <DialogDescription>
              Add a family member who should be covered under your burial benefit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="depName">Full Name *</Label>
              <Input id="depName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Sipho Dlamini" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="depRel">Relationship *</Label>
              <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
                <SelectTrigger id="depRel"><SelectValue placeholder="Select relationship" /></SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="depDob">Date of Birth</Label>
              <Input id="depDob" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="depId">ID Number (optional)</Label>
              <Input id="depId" value={form.idNumber} onChange={(e) => setForm({ ...form, idNumber: e.target.value })} placeholder="For claim verification" />
            </div>
            <Button onClick={handleAdd} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Dependent
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
