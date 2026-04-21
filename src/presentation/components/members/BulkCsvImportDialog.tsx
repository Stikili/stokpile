// CSV importer for bootstrapping a stokvel from an existing spreadsheet.
// Expected shape: first row is headers, first column is member name,
// remaining columns can be 'phone', 'email', or date-like headers
// (YYYY-MM or month names) whose cells are contribution amounts.

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Upload, FileText, Loader2, AlertTriangle, Check } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';

interface BulkCsvImportDialogProps {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ParsedMember = { name: string; phone?: string; email?: string };
type ParsedContribution = { memberName: string; amount: number; date: string };

// Tiny CSV parser — handles quoted fields with embedded commas.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (field !== '' || row.length > 0) { row.push(field); rows.push(row); row = []; field = ''; }
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

// Convert a header like '2025-03', 'Mar 2025', 'March', '2025/03' → YYYY-MM-01 ISO date.
function headerToDate(h: string): string | null {
  const s = h.trim().toLowerCase();
  // YYYY-MM or YYYY/MM
  const iso = s.match(/^(\d{4})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-01`;
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const shortMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const m1 = s.match(/^(\w+)[\s-/](\d{4})$/);
  if (m1) {
    const idx = months.indexOf(m1[1]) !== -1 ? months.indexOf(m1[1]) : shortMonths.indexOf(m1[1].slice(0, 3));
    if (idx !== -1) return `${m1[2]}-${String(idx + 1).padStart(2, '0')}-01`;
  }
  const m2 = s.match(/^(\d{4})[\s-/](\w+)$/);
  if (m2) {
    const idx = months.indexOf(m2[2]) !== -1 ? months.indexOf(m2[2]) : shortMonths.indexOf(m2[2].slice(0, 3));
    if (idx !== -1) return `${m2[1]}-${String(idx + 1).padStart(2, '0')}-01`;
  }
  // Bare month (this year)
  const bareIdx = months.indexOf(s) !== -1 ? months.indexOf(s) : shortMonths.indexOf(s.slice(0, 3));
  if (bareIdx !== -1) return `${new Date().getFullYear()}-${String(bareIdx + 1).padStart(2, '0')}-01`;
  return null;
}

function parseSheet(rows: string[][]): { members: ParsedMember[]; contributions: ParsedContribution[]; warnings: string[] } {
  const warnings: string[] = [];
  if (rows.length < 2) return { members: [], contributions: [], warnings: ['File has no data rows'] };

  const headers = rows[0].map((h) => h.trim());
  const lower = headers.map((h) => h.toLowerCase());

  // Find columns: first column = name, others = phone/email/date-amount
  const nameIdx = 0;
  const phoneIdx = lower.findIndex((h) => /phone|tel|mobile|cell/.test(h));
  const emailIdx = lower.findIndex((h) => /email/.test(h));

  const dateCols: Array<{ idx: number; date: string }> = [];
  for (let i = 1; i < headers.length; i++) {
    if (i === phoneIdx || i === emailIdx) continue;
    const d = headerToDate(headers[i]);
    if (d) dateCols.push({ idx: i, date: d });
  }

  const members: ParsedMember[] = [];
  const contributions: ParsedContribution[] = [];
  const seenNames = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = (row[nameIdx] || '').trim();
    if (!name) continue;
    if (seenNames.has(name.toLowerCase())) { warnings.push(`Duplicate name skipped: ${name}`); continue; }
    seenNames.add(name.toLowerCase());

    members.push({
      name,
      phone: phoneIdx >= 0 ? (row[phoneIdx] || '').trim() || undefined : undefined,
      email: emailIdx >= 0 ? (row[emailIdx] || '').trim() || undefined : undefined,
    });

    for (const { idx, date } of dateCols) {
      const raw = (row[idx] || '').replace(/[R\s,]/gi, '').trim();
      if (!raw || raw === '0') continue;
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      contributions.push({ memberName: name, amount, date });
    }
  }

  if (members.length === 0) warnings.push('No valid members detected. First column should hold names.');
  return { members, contributions, warnings };
}

export function BulkCsvImportDialog({ groupId, open, onOpenChange, onSuccess }: BulkCsvImportDialogProps) {
  const [raw, setRaw] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => (raw ? parseSheet(parseCsv(raw)) : null), [raw]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    setRaw(text);
  };

  const handleSubmit = async () => {
    if (!parsed || parsed.members.length === 0) return;
    setSubmitting(true);
    try {
      const res = await api.bulkImportMembers(groupId, {
        members: parsed.members,
        contributions: parsed.contributions,
      });
      toast.success(`Imported ${res.membersCreated} members, ${res.contributionsCreated} contributions`);
      if (res.errors.length) console.warn('Import warnings:', res.errors);
      onSuccess?.();
      onOpenChange(false);
      setRaw('');
      setFileName('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import from CSV
          </DialogTitle>
          <DialogDescription>
            First column must be member names. Optional columns: <b>phone</b>, <b>email</b>.
            Any column with a month-like header (e.g. <code>Jan 2026</code> or <code>2026-01</code>)
            becomes contribution dates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-muted/40 transition-colors">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            <p className="text-sm font-medium">
              {fileName || 'Choose a CSV file'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Save your Excel as <b>File → Save As → CSV</b>
            </p>
          </label>

          {parsed && (
            <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  {parsed.members.length} member{parsed.members.length === 1 ? '' : 's'}
                </span>
                <span className="text-muted-foreground">
                  {parsed.contributions.length} contribution{parsed.contributions.length === 1 ? '' : 's'} detected
                </span>
              </div>
              {parsed.members.length > 0 && (
                <div className="text-[11px] text-muted-foreground truncate">
                  {parsed.members.slice(0, 5).map((m) => m.name).join(', ')}
                  {parsed.members.length > 5 && ` · +${parsed.members.length - 5} more`}
                </div>
              )}
              {parsed.warnings.length > 0 && (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <div>{parsed.warnings.slice(0, 3).join('; ')}</div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !parsed || parsed.members.length === 0}>
            {submitting ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Importing...</> : 'Import'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
