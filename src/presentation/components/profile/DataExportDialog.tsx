import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Download, Loader2, FileJson, FileText } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface DataExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataExportDialog({ open, onOpenChange }: DataExportDialogProps) {
  const [loading, setLoading] = useState<'json' | 'csv' | null>(null);

  const downloadJson = async () => {
    setLoading('json');
    try {
      const data = await api.exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stokpile-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setLoading(null);
    }
  };

  const downloadCsv = async () => {
    setLoading('csv');
    try {
      const data = await api.exportMyData();
      // Build a simple CSV of contributions
      const rows = ['Date,Group,Amount,Status,Reference'];
      const groupLookup: Record<string, string> = {};
      for (const g of data.groups) groupLookup[g.id] = g.name;
      for (const c of data.contributions) {
        rows.push(
          `${c.date},${(groupLookup[c.groupId] || c.groupId).replace(/,/g, ';')},${c.amount},${c.paid ? 'Paid' : 'Unpaid'},${c.id.slice(0, 8)}`
        );
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stokpile-contributions-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Contributions exported');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export My Data
          </DialogTitle>
          <DialogDescription>
            Download a copy of all your data — your profile, groups, contributions, payouts, and meetings. This is your right under POPIA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={downloadJson}
            disabled={!!loading}
          >
            {loading === 'json' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileJson className="h-4 w-4 mr-2" />}
            Download everything (.json)
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={downloadCsv}
            disabled={!!loading}
          >
            {loading === 'csv' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Download contributions only (.csv)
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Both files are generated locally and downloaded directly to your device. Stokpile does not retain a copy of the export.
        </p>
      </DialogContent>
    </Dialog>
  );
}
