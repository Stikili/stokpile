import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/presentation/ui/button';
import { Input } from '@/presentation/ui/input';
import { Label } from '@/presentation/ui/label';
import { Textarea } from '@/presentation/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { GROUP_TYPES, groupTypeInfo, parseMemberNames } from '@/domain/groupTypes';
import { hasRotation, type GroupType } from '@/domain/types';
import { useGroupSetup } from '@/application/hooks/useGroupSetup';
import { COUNTRY_LOCALES } from '@/lib/locale';
import { activeCurrencyCode, currencySymbol } from '@/lib/export';

const FREQUENCIES = [
  { value: 'weekly', label: 'Every week' },
  { value: 'bi-weekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Every month' },
  { value: 'quarterly', label: 'Every three months' },
  { value: 'annually', label: 'Once a year' },
];

const CURRENCIES = [...new Set(Object.values(COUNTRY_LOCALES).map((l) => l.currency))];

type Step = 1 | 2 | 3;

/**
 * Create a group in three short steps: what kind, the basics, who's in it.
 * Type comes first because it decides everything else the group sees.
 */
export function CreateGroupWizard({ onCreated }: { onCreated: () => void }) {
  const { setup, busy, step: progress } = useGroupSetup();
  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<GroupType | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [currency, setCurrency] = useState(() => activeCurrencyCode());
  const [memberNames, setMemberNames] = useState('');

  const info = groupTypeInfo(type);
  const nameCount = parseMemberNames(memberNames).length;
  const primary = GROUP_TYPES.filter((t) => t.primary);
  const more = GROUP_TYPES.filter((t) => !t.primary);

  const create = async (withMembers: boolean) => {
    if (!type) return;
    try {
      const result = await setup({
        type,
        name,
        contribution: amount ? Number(amount) : null,
        frequency,
        currency,
        memberNames: withMembers ? memberNames : '',
      });
      if (result.failed.length > 0) {
        toast.warning(`Group created. Couldn’t add: ${result.failed.join(', ')}. You can add them from Members.`);
      } else {
        toast.success(result.added > 0 ? `${name} is ready with ${result.added} member${result.added === 1 ? '' : 's'}` : `${name} is ready`);
      }
      onCreated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Couldn’t create the group. Please try again.');
    }
  };

  return (
    <section className="card space-y-5" aria-label="Create your group">
      <div className="flex items-center justify-between gap-3">
        <span className="t-label">Step {step} of 3</span>
        {step > 1 && !busy && (
          <Button variant="ghost" size="sm" className="h-8 -mr-2" onClick={() => setStep((s) => (s - 1) as Step)}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        )}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="t-heading text-lg">What kind of group is it?</h2>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Group type">
            {[...primary, ...(showMore ? more : [])].map((t) => (
              <button
                key={t.type}
                type="button"
                role="radio"
                aria-checked={type === t.type}
                onClick={() => { setType(t.type); setStep(2); }}
                className={`text-left rounded-[var(--s-radius-sm)] border p-3.5 transition-colors
                  ${type === t.type ? 'border-primary bg-accent' : 'border-border bg-card hover:border-primary/50'}`}
              >
                <div className="font-semibold text-sm">{t.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.description}</div>
              </button>
            ))}
          </div>
          {!showMore && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowMore(true)}>
              More types
            </Button>
          )}
        </div>
      )}

      {step === 2 && info && (
        <form
          className="space-y-4"
          onSubmit={(e) => { e.preventDefault(); if (name.trim()) setStep(3); }}
        >
          <div>
            <h2 className="t-heading text-lg">Name your {info.label.toLowerCase()}</h2>
            <p className="text-sm text-muted-foreground mt-1">You can change any of this later in group settings.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-name">Group name</Label>
            <Input id="wiz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Masakhane Umgalelo" required autoFocus />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="wiz-amount">Each member pays ({currencySymbol()})</Label>
              <Input id="wiz-amount" type="number" inputMode="decimal" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-frequency">How often</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="wiz-frequency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="wiz-currency" className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full h-11" disabled={!name.trim()}>Next: add members</Button>
        </form>
      )}

      {step === 3 && info && (
        <div className="space-y-4">
          <div>
            <h2 className="t-heading text-lg">Who’s in the group?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              One name per line. Phones and invites can come later: members don’t need the app for you to keep their record.
              {hasRotation(info.type) && ' The payout order follows this list, and you can change it any time.'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-members">Members</Label>
            <Textarea
              id="wiz-members"
              rows={6}
              value={memberNames}
              onChange={(e) => setMemberNames(e.target.value)}
              placeholder={'Thandi Mokoena\nSipho Dlamini\nPrecious Khumalo'}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              You’re added as the admin. {nameCount > 0 ? `${nameCount} other member${nameCount === 1 ? '' : 's'} listed.` : ''}
            </p>
          </div>
          <Button className="w-full h-11" onClick={() => create(true)} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{progress ?? 'Creating'}…</> : 'Create group'}
          </Button>
          {!busy && (
            <Button variant="ghost" className="w-full" onClick={() => create(false)}>Skip: I’ll add members later</Button>
          )}
        </div>
      )}
    </section>
  );
}
