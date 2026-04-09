import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/presentation/ui/dialog';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { ScrollArea } from '@/presentation/ui/scroll-area';
import { FileText, Download, Copy, Check, Wand2 } from 'lucide-react';
import { generateConstitution, type ConstitutionFields } from '@/lib/constitutionTemplate';
import { toast } from 'sonner';

interface ConstitutionGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  groupType: string;
  country?: string;
}

export function ConstitutionGeneratorDialog({
  open, onOpenChange, groupName, groupType, country,
}: ConstitutionGeneratorDialogProps) {
  const [fields, setFields] = useState<ConstitutionFields>({
    groupName,
    groupType,
    country,
  });
  const [generated, setGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const update = (key: keyof ConstitutionFields, value: any) => {
    setFields((f) => ({ ...f, [key]: value }));
  };

  const handleGenerate = () => {
    setGenerated(generateConstitution(fields));
  };

  const handleCopy = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    toast.success('Constitution copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!generated) return;
    const blob = new Blob([generated], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${groupName.replace(/[^a-z0-9]/gi, '_')}_constitution.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Downloaded as Markdown');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Constitution Generator
          </DialogTitle>
          <DialogDescription>
            Fill in the basics and Stokpile will draft a stokvel constitution. You can edit, download, or copy it.
          </DialogDescription>
        </DialogHeader>

        {!generated ? (
          <ScrollArea className="max-h-[60vh] pr-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contribAmt" className="text-xs">Contribution Amount</Label>
                  <Input
                    id="contribAmt"
                    type="number"
                    placeholder="500"
                    value={fields.contributionAmount || ''}
                    onChange={(e) => update('contributionAmount', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="freq" className="text-xs">Contribution Frequency</Label>
                  <Input
                    id="freq"
                    placeholder="monthly"
                    value={fields.contributionFrequency || ''}
                    onChange={(e) => update('contributionFrequency', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="meetFreq" className="text-xs">Meeting Frequency</Label>
                  <Input
                    id="meetFreq"
                    placeholder="monthly"
                    value={fields.meetingFrequency || ''}
                    onChange={(e) => update('meetingFrequency', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="venue" className="text-xs">Meeting Venue</Label>
                  <Input
                    id="venue"
                    placeholder="Community hall, online, etc."
                    value={fields.meetingVenue || ''}
                    onChange={(e) => update('meetingVenue', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payout" className="text-xs">Payout Method</Label>
                <Input
                  id="payout"
                  placeholder="Bank transfer, cash, mobile money"
                  value={fields.payoutMethod || ''}
                  onChange={(e) => update('payoutMethod', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="memFee" className="text-xs">Joining Fee</Label>
                  <Input
                    id="memFee"
                    type="number"
                    placeholder="0"
                    value={fields.membershipFee || ''}
                    onChange={(e) => update('membershipFee', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lateFine" className="text-xs">Late Fine</Label>
                  <Input
                    id="lateFine"
                    type="number"
                    placeholder="50"
                    value={fields.finePerLatePayment || ''}
                    onChange={(e) => update('finePerLatePayment', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="missFine" className="text-xs">Missed Meeting Fine</Label>
                  <Input
                    id="missFine"
                    type="number"
                    placeholder="50"
                    value={fields.finePerMissedMeeting || ''}
                    onChange={(e) => update('finePerMissedMeeting', e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="founder" className="text-xs">Founder</Label>
                  <Input
                    id="founder"
                    placeholder="Optional"
                    value={fields.founderName || ''}
                    onChange={(e) => update('founderName', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="treas" className="text-xs">Treasurer</Label>
                  <Input
                    id="treas"
                    placeholder="Optional"
                    value={fields.treasurerName || ''}
                    onChange={(e) => update('treasurerName', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sec" className="text-xs">Secretary</Label>
                  <Input
                    id="sec"
                    placeholder="Optional"
                    value={fields.secretaryName || ''}
                    onChange={(e) => update('secretaryName', e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleGenerate} className="w-full mt-3">
                <FileText className="h-4 w-4 mr-2" />
                Generate Constitution
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download .md
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setGenerated(null)}>
                Edit fields
              </Button>
            </div>
            <ScrollArea className="max-h-[55vh] mt-2 border rounded-lg">
              <Textarea
                value={generated}
                onChange={(e) => setGenerated(e.target.value)}
                className="min-h-[400px] font-mono text-xs border-none resize-none"
              />
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
