import { useState, useEffect } from 'react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/presentation/ui/sheet';
import { Button } from '@/presentation/ui/button';
import { Textarea } from '@/presentation/ui/textarea';
import { Label } from '@/presentation/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import { Sparkles, Loader2, Copy, Check, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/infrastructure/api';

export const SUPPORTED_LANGUAGES = [
  { code: 'en',   label: 'English' },
  { code: 'zu',   label: 'isiZulu' },
  { code: 'xh',   label: 'isiXhosa' },
  { code: 'af',   label: 'Afrikaans' },
  { code: 'st',   label: 'Sesotho' },
  { code: 'tn',   label: 'Setswana' },
  { code: 'nso',  label: 'Sepedi' },
  { code: 'ss',   label: 'siSwati' },
  { code: 've',   label: 'Tshivenda' },
  { code: 'ts',   label: 'Xitsonga' },
  { code: 'nr',   label: 'isiNdebele' },
  { code: 'sw',   label: 'Swahili' },
  { code: 'sn',   label: 'Shona' },
  { code: 'yo',   label: 'Yoruba' },
  { code: 'ig',   label: 'Igbo' },
  { code: 'ha',   label: 'Hausa' },
  { code: 'pt',   label: 'Português' },
  { code: 'fr',   label: 'Français' },
  { code: 'am',   label: 'Amharic' },
  { code: 'so',   label: 'Somali' },
];

interface AiDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  task: string;
  groupId?: string;
  // Fields shown above the submit button. Values are collected into `context`.
  fields?: Array<{
    key: string;
    label: string;
    type?: 'text' | 'textarea' | 'select';
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    required?: boolean;
    initial?: string;
  }>;
  // If set, shown above the result and copy-able as-is
  showLanguageSelector?: boolean;
  // Default prompt/question to auto-submit without a form
  autoSubmit?: boolean;
  contextStatic?: Record<string, unknown>;
}

export function AiDrawer({
  open, onOpenChange, title, description, task, groupId,
  fields = [], showLanguageSelector = true, autoSubmit = false,
  contextStatic = {},
}: AiDrawerProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState(() => localStorage.getItem('stokpile-ai-language') || 'en');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<{ callsThisMonth: number; cap: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    // Initialize field values
    const initial: Record<string, string> = {};
    for (const f of fields) initial[f.key] = f.initial || '';
    setValues(initial);
    setResult('');
    // Check opt-in status
    api.getAiOptIn().then((r) => setOptedIn(r.optedIn)).catch(() => setOptedIn(false));
  }, [open, task]);

  useEffect(() => {
    localStorage.setItem('stokpile-ai-language', language);
  }, [language]);

  useEffect(() => {
    if (autoSubmit && optedIn && open) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit, optedIn, open]);

  const handleOptIn = async () => {
    try {
      await api.setAiOptIn(true);
      setOptedIn(true);
      toast.success('AI features enabled');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not opt in');
    }
  };

  const submit = async () => {
    // Required-field check
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setLoading(true);
    setResult('');
    try {
      const res = await api.aiChat({
        task,
        groupId,
        language,
        context: { ...contextStatic, ...values },
      });
      setResult(res.text || '');
      setUsage({ callsThisMonth: res.callsThisMonth, cap: res.cap });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI call failed';
      toast.error(msg);
      setResult('');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {title}
          </SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {optedIn === false && (
            <div className="rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-foreground mb-1">Enable AI features?</p>
                  <p className="text-muted-foreground">
                    Your prompts and relevant group data will be sent to Anthropic for processing.
                    No data is used for training. You can opt out any time in Profile.
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={handleOptIn} className="w-full">Enable AI</Button>
            </div>
          )}

          {optedIn && (
            <>
              {showLanguageSelector && (
                <div className="space-y-1.5">
                  <Label htmlFor="ai-lang" className="text-xs">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="ai-lang" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={`ai-${f.key}`} className="text-xs">
                    {f.label} {f.required && <span className="text-destructive">*</span>}
                  </Label>
                  {f.type === 'textarea' ? (
                    <Textarea
                      id={`ai-${f.key}`}
                      value={values[f.key] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={4}
                    />
                  ) : f.type === 'select' ? (
                    <Select
                      value={values[f.key] || ''}
                      onValueChange={(v) => setValues((vs) => ({ ...vs, [f.key]: v }))}
                    >
                      <SelectTrigger id={`ai-${f.key}`} className="h-9">
                        <SelectValue placeholder={f.placeholder || 'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(f.options || []).map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <input
                      id={`ai-${f.key}`}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={values[f.key] || ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                    />
                  )}
                </div>
              ))}

              {!autoSubmit && (
                <Button onClick={submit} disabled={loading} className="w-full">
                  {loading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 mr-2" />Generate</>
                  )}
                </Button>
              )}

              {loading && autoSubmit && (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Thinking...
                </div>
              )}

              {result && (
                <div className="rounded-xl border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Result</p>
                    <Button size="sm" variant="ghost" onClick={handleCopy} className="h-6 px-2">
                      {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{result}</p>
                </div>
              )}

              {usage && (
                <p className="text-[10px] text-center text-muted-foreground">
                  {usage.callsThisMonth}/{usage.cap} AI calls this month
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
