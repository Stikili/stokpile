import { useEffect, useState, useRef } from 'react';
import type { Contribution, Payout, Member } from '@/domain/types';
import type { ReportType } from '@/domain/types';
import { Button } from '@/presentation/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/presentation/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { Label } from '@/presentation/ui/label';
import { Badge } from '@/presentation/ui/badge';
import { Printer, FileBarChart, Download } from 'lucide-react';
import { api } from '@/infrastructure/api';
import { toast } from 'sonner';
import { formatCurrency, formatDate, exportToCSV } from '@/lib/export';

interface FinancialReportsViewProps {
  groupId: string;
  groupName: string;
  isAdmin: boolean;
}

export function FinancialReportsView({ groupId, groupName, isAdmin }: FinancialReportsViewProps) {
  const [reportType, setReportType] = useState<ReportType>('contributions-summary');
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contribData, payoutsData, membersData] = await Promise.all([
        api.getContributions(groupId),
        api.getPayouts(groupId),
        api.getMembers(groupId),
      ]);
      setContributions(contribData.contributions || []);
      setPayouts(payoutsData.payouts || []);
      setMembers(membersData.members || []);
      setDataLoaded(true);
    } catch {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (reportType === 'contributions-summary') {
      const rows = getContributionSummaryRows();
      exportToCSV(rows, `contributions-summary-${groupId}-${new Date().toISOString().split('T')[0]}`);
    } else if (reportType === 'payout-history') {
      const rows = payouts.map(p => ({
        Recipient: p.recipient ? `${p.recipient.fullName} ${p.recipient.surname}` : p.recipientEmail,
        Email: p.recipientEmail,
        Amount: p.amount,
        'Scheduled Date': formatDate(p.scheduledDate),
        Status: p.status,
        Reference: p.referenceNumber || '',
      }));
      exportToCSV(rows, `payout-history-${groupId}-${new Date().toISOString().split('T')[0]}`);
    } else if (reportType === 'monthly-statement') {
      const rows = getMonthlyRows();
      exportToCSV(rows, `monthly-statement-${groupId}-${new Date().toISOString().split('T')[0]}`);
    }
    toast.success('Exported to CSV');
  };

  // Build per-member contribution summary
  const getContributionSummaryRows = () => {
    const approvedMembers = members.filter(m => m.status === 'approved');
    return approvedMembers.map(member => {
      const memberContribs = contributions.filter(c => c.userEmail === member.email);
      const totalPaid = memberContribs.filter(c => c.paid).reduce((s, c) => s + c.amount, 0);
      const totalUnpaid = memberContribs.filter(c => !c.paid).reduce((s, c) => s + c.amount, 0);
      return {
        Name: `${member.fullName} ${member.surname}`,
        Email: member.email,
        'Total Contributions': memberContribs.length,
        'Amount Paid': totalPaid,
        'Amount Unpaid': totalUnpaid,
        'Total Amount': totalPaid + totalUnpaid,
      };
    });
  };

  // Build monthly breakdown rows
  const getMonthlyRows = () => {
    const byMonth: Record<string, { label: string; paid: number; unpaid: number; payouts: number }> = {};
    contributions.forEach(c => {
      const key = c.date.slice(0, 7); // YYYY-MM
      const label = new Date(c.date + 'T00:00:00').toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
      if (!byMonth[key]) byMonth[key] = { label, paid: 0, unpaid: 0, payouts: 0 };
      if (c.paid) byMonth[key].paid += c.amount;
      else byMonth[key].unpaid += c.amount;
    });
    payouts.filter(p => p.status === 'completed').forEach(p => {
      const key = p.scheduledDate.slice(0, 7);
      if (byMonth[key]) byMonth[key].payouts += p.amount;
    });
    return Object.keys(byMonth).sort().reverse().map(k => ({
      Month: byMonth[k].label,
      'Contributions Paid': byMonth[k].paid,
      'Contributions Unpaid': byMonth[k].unpaid,
      'Payouts Made': byMonth[k].payouts,
      'Net': byMonth[k].paid - byMonth[k].payouts,
    }));
  };

  const reportTypes: { value: ReportType; label: string; description: string }[] = [
    { value: 'contributions-summary', label: 'Contributions Summary', description: 'Per-member contribution totals and payment status' },
    { value: 'monthly-statement', label: 'Monthly Statement', description: 'Month-by-month income and payout breakdown' },
    { value: 'payout-history', label: 'Payout History', description: 'All payouts with status and reference numbers' },
  ];

  const totalContributed = contributions.filter(c => c.paid).reduce((s, c) => s + c.amount, 0);
  const totalPayouts = payouts.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const netBalance = totalContributed - totalPayouts;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Financial Reports
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={loading || !dataLoaded}>
              <Download className="h-4 w-4 mr-1.5" />
              CSV
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={loading || !dataLoaded}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print / PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map(rt => (
                  <SelectItem key={rt.value} value={rt.value}>
                    {rt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {reportTypes.find(r => r.value === reportType)?.description}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Print-ready report area */}
      <div ref={printRef} className="print-report">
        {/* Print header — hidden on screen, shown on print */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">{groupName}</h1>
          <h2 className="text-lg text-gray-600">{reportTypes.find(r => r.value === reportType)?.label}</h2>
          <p className="text-sm text-gray-500">Generated {new Date().toLocaleDateString('en-ZA', { dateStyle: 'long' })}</p>
          <hr className="mt-4" />
        </div>

        {loading ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Loading report data...</CardContent></Card>
        ) : !dataLoaded ? null : reportType === 'contributions-summary' ? (
          <ContributionsSummaryReport
            rows={getContributionSummaryRows()}
            totalContributed={totalContributed}
            netBalance={netBalance}
          />
        ) : reportType === 'monthly-statement' ? (
          <MonthlyStatementReport rows={getMonthlyRows()} totalContributed={totalContributed} totalPayouts={totalPayouts} netBalance={netBalance} />
        ) : (
          <PayoutHistoryReport payouts={payouts} />
        )}
      </div>
    </div>
  );
}

function ContributionsSummaryReport({ rows, totalContributed, netBalance }: {
  rows: Record<string, unknown>[];
  totalContributed: number;
  netBalance: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contributions Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Paid In</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(totalContributed)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Members</p>
            <p className="text-lg font-semibold">{rows.length}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
            <p className={`text-lg font-semibold ${(netBalance as number) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(netBalance)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Member</th>
                <th className="text-right py-2 font-medium">Contributions</th>
                <th className="text-right py-2 font-medium">Paid</th>
                <th className="text-right py-2 font-medium">Unpaid</th>
                <th className="text-right py-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2">
                    <div>{row.Name as string}</div>
                    <div className="text-xs text-muted-foreground">{row.Email as string}</div>
                  </td>
                  <td className="text-right py-2">{row['Total Contributions'] as number}</td>
                  <td className="text-right py-2 text-green-600">{formatCurrency(row['Amount Paid'] as number)}</td>
                  <td className="text-right py-2 text-orange-600">
                    {(row['Amount Unpaid'] as number) > 0 ? formatCurrency(row['Amount Unpaid'] as number) : '—'}
                  </td>
                  <td className="text-right py-2 font-medium">{formatCurrency(row['Total Amount'] as number)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyStatementReport({ rows, totalContributed, totalPayouts, netBalance }: {
  rows: Record<string, unknown>[];
  totalContributed: number;
  totalPayouts: number;
  netBalance: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Monthly Statement</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total In</p>
            <p className="text-lg font-semibold text-green-600">{formatCurrency(totalContributed)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Out</p>
            <p className="text-lg font-semibold text-red-500">{formatCurrency(totalPayouts)}</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Net Balance</p>
            <p className={`text-lg font-semibold ${(netBalance as number) >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(netBalance)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Month</th>
                <th className="text-right py-2 font-medium">Contributions Paid</th>
                <th className="text-right py-2 font-medium">Unpaid</th>
                <th className="text-right py-2 font-medium">Payouts</th>
                <th className="text-right py-2 font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-2 font-medium">{row.Month as string}</td>
                  <td className="text-right py-2 text-green-600">{formatCurrency(row['Contributions Paid'] as number)}</td>
                  <td className="text-right py-2 text-orange-600">
                    {(row['Contributions Unpaid'] as number) > 0 ? formatCurrency(row['Contributions Unpaid'] as number) : '—'}
                  </td>
                  <td className="text-right py-2 text-red-500">
                    {(row['Payouts Made'] as number) > 0 ? formatCurrency(row['Payouts Made'] as number) : '—'}
                  </td>
                  <td className={`text-right py-2 font-medium ${(row.Net as number) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatCurrency(row.Net as number)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PayoutHistoryReport({ payouts }: { payouts: Payout[] }) {
  const statusColor: Record<string, string> = {
    completed: 'text-green-600',
    scheduled: 'text-blue-600',
    cancelled: 'text-muted-foreground line-through',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payout History</CardTitle>
      </CardHeader>
      <CardContent>
        {payouts.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground text-sm">No payouts recorded</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Recipient</th>
                  <th className="text-right py-2 font-medium">Amount</th>
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Status</th>
                  <th className="text-left py-2 font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payouts.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()).map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-2">
                      <div>{p.recipient ? `${p.recipient.fullName} ${p.recipient.surname}` : p.recipientEmail}</div>
                      <div className="text-xs text-muted-foreground">{p.recipientEmail}</div>
                    </td>
                    <td className="text-right py-2 font-medium">{formatCurrency(p.amount)}</td>
                    <td className="py-2">{formatDate(p.scheduledDate)}</td>
                    <td className="py-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColor[p.status] || ''}`}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs font-mono text-muted-foreground">{p.referenceNumber || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
