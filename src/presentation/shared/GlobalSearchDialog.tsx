import { useEffect, useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/presentation/ui/dialog';
import { Input } from '@/presentation/ui/input';
import { Search, DollarSign, TrendingUp, Calendar, Users, Loader2, Megaphone } from 'lucide-react';
import { api } from '@/infrastructure/api';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  onResultClick: (tab: string) => void;
}

interface SearchResult {
  id: string;
  type: 'contribution' | 'payout' | 'member' | 'meeting' | 'announcement';
  title: string;
  subtitle: string;
  tab: string;
}

export function GlobalSearchDialog({ open, onOpenChange, groupId, onResultClick }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    contributions: any[];
    payouts: any[];
    members: any[];
    meetings: any[];
    announcements: any[];
  }>({ contributions: [], payouts: [], members: [], meetings: [], announcements: [] });

  useEffect(() => {
    if (!open || !groupId) return;
    setLoading(true);
    Promise.allSettled([
      api.getContributions(groupId),
      api.getPayouts(groupId),
      api.getMembers(groupId),
      api.getMeetings(groupId),
      api.getAnnouncements(groupId).catch(() => ({ announcements: [] })),
    ]).then(([contribs, payouts, members, meetings, announcements]) => {
      setData({
        contributions: contribs.status === 'fulfilled' ? (contribs.value as any).contributions ?? [] : [],
        payouts:       payouts.status === 'fulfilled' ? (payouts.value as any).payouts ?? [] : [],
        members:       members.status === 'fulfilled' ? (members.value as any).members ?? [] : [],
        meetings:      meetings.status === 'fulfilled' ? (meetings.value as any).meetings ?? [] : [],
        announcements: announcements.status === 'fulfilled' ? (announcements.value as any).announcements ?? [] : [],
      });
      setLoading(false);
    });
  }, [open, groupId]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    for (const c of data.contributions) {
      const text = `${c.userEmail || ''} ${c.amount || ''} ${c.note || ''} ${c.status || ''}`.toLowerCase();
      if (text.includes(q)) {
        out.push({
          id: c.id,
          type: 'contribution',
          title: `R${c.amount} — ${c.userEmail}`,
          subtitle: `${c.status} · ${new Date(c.date || c.createdAt).toLocaleDateString()}`,
          tab: 'contributions',
        });
      }
    }

    for (const p of data.payouts) {
      const text = `${p.recipientEmail || ''} ${p.amount || ''} ${p.purpose || ''}`.toLowerCase();
      if (text.includes(q)) {
        out.push({
          id: p.id,
          type: 'payout',
          title: `R${p.amount} → ${p.recipientEmail}`,
          subtitle: p.purpose || new Date(p.date || p.createdAt).toLocaleDateString(),
          tab: 'payouts',
        });
      }
    }

    for (const m of data.members) {
      const text = `${m.email || ''} ${m.fullName || ''} ${m.surname || ''} ${m.role || ''}`.toLowerCase();
      if (text.includes(q)) {
        out.push({
          id: m.email,
          type: 'member',
          title: `${m.fullName || ''} ${m.surname || ''}`.trim() || m.email,
          subtitle: `${m.email} · ${m.role}`,
          tab: 'info',
        });
      }
    }

    for (const m of data.meetings) {
      const text = `${m.title || ''} ${m.description || ''} ${m.location || ''}`.toLowerCase();
      if (text.includes(q)) {
        out.push({
          id: m.id,
          type: 'meeting',
          title: m.title,
          subtitle: new Date(m.date).toLocaleDateString(),
          tab: 'meetings',
        });
      }
    }

    for (const a of data.announcements) {
      const text = `${a.title || ''} ${a.body || ''}`.toLowerCase();
      if (text.includes(q)) {
        out.push({
          id: a.id,
          type: 'announcement',
          title: a.title,
          subtitle: a.body?.slice(0, 60),
          tab: 'announcements',
        });
      }
    }

    return out.slice(0, 50);
  }, [query, data]);

  const ICONS: Record<SearchResult['type'], React.ElementType> = {
    contribution: DollarSign,
    payout: TrendingUp,
    member: Users,
    meeting: Calendar,
    announcement: Megaphone,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search
          </DialogTitle>
        </DialogHeader>

        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contributions, payouts, members…"
          className="text-sm"
        />

        <div className="max-h-[50vh] overflow-y-auto -mx-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !query.trim() ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Type to search across this group
            </p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No results for "{query}"
            </p>
          ) : (
            <div className="space-y-1">
              {results.map((r) => {
                const Icon = ICONS[r.type];
                return (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => {
                      onResultClick(r.tab);
                      onOpenChange(false);
                    }}
                    className="w-full flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted text-left"
                  >
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                    </div>
                    <span className="text-[10px] uppercase text-muted-foreground tracking-wide">{r.type}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
