// Pilo — Stokpile's AI assistant.
// World-class chat interface: FAB + slide-in panel, voice input, rich blocks,
// conversation history, multilingual, proactive suggestions.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sheet, SheetContent } from '@/presentation/ui/sheet';
import { Button } from '@/presentation/ui/button';
import { Badge } from '@/presentation/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/presentation/ui/select';
import {
  Sparkles, Send, Mic, MicOff, Loader2, Languages, Copy, Check, ImagePlus,
  MessageCircle, Bell, CalendarDays, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/infrastructure/api';
import { SUPPORTED_LANGUAGES } from './AiDrawer';
import { AiDrawer } from './AiDrawer';

type Role = 'user' | 'assistant';
type SuggestedAction = { label: string; task: string; context?: Record<string, unknown> };
type Message = {
  id: string;
  role: Role;
  content: string;
  suggestedActions?: SuggestedAction[];
  ts: number;
};

interface PiloContext {
  groupId?: string;
  groupName?: string;
  isAdmin?: boolean;
  tier?: string;
  lifetimePoints?: number;
  commissionRate?: number;
}

interface PiloPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: PiloContext;
}

const HISTORY_KEY = 'stokpile-pilo-history';
const MAX_HISTORY = 40;

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: Message[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch { /* ignore */ }
}

function getStarterPrompts(ctx: PiloContext): string[] {
  if (ctx.isAdmin && ctx.groupId) {
    return [
      "Who hasn't paid this month, and what should I do?",
      'Project our balance if we keep this pace for 12 months',
      'Should we consider a TFSA for idle cash? Compare vs leaving it in the stokvel account',
      'What risks does our constitution leave exposed?',
    ];
  }
  if (ctx.groupId) {
    return [
      "When's my next payout and how much will I have saved by then?",
      'Am I on track vs the group target?',
      'How much am I actually earning vs inflation?',
      'Should I save extra in a TFSA alongside this stokvel?',
    ];
  }
  return [
    "What's the difference between a chama, susu, and rotating stokvel?",
    'How much would R500/month grow to in 10 years vs keeping it in savings?',
    "Can my stokvel's interest earnings be taxed by SARS?",
    'Help me choose the right stokvel type for a year-end goal',
  ];
}

// ─── Voice input via Web Speech API ────────────────────────────────────
type SpeechWindow = typeof window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

function useSpeechRecognition(language: string) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const supported = typeof window !== 'undefined' && !!(
    (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition
  );

  const start = useCallback(() => {
    if (!supported) { toast.error('Voice input not supported in this browser'); return; }
    const Ctor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    const r = new Ctor();
    r.continuous = false;
    r.interimResults = true;
    // Map our 2-letter codes to BCP 47-ish where possible
    const langMap: Record<string, string> = {
      en: 'en-ZA', zu: 'zu-ZA', xh: 'xh-ZA', af: 'af-ZA', st: 'st-ZA', tn: 'tn-ZA',
      nso: 'nso-ZA', ss: 'ss-ZA', ve: 've-ZA', ts: 'ts-ZA', nr: 'nr-ZA',
      sw: 'sw-KE', sn: 'sn-ZW', yo: 'yo-NG', ig: 'ig-NG', ha: 'ha-NG',
      pt: 'pt-MZ', fr: 'fr-FR', am: 'am-ET', so: 'so-SO',
    };
    r.lang = langMap[language] || 'en-ZA';
    r.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      setTranscript(last[0].transcript);
      if (last.isFinal) setListening(false);
    };
    r.onend = () => setListening(false);
    r.onerror = (e: any) => { setListening(false); toast.error(`Voice: ${e.error || 'failed'}`); };
    recognitionRef.current = r;
    setTranscript('');
    setListening(true);
    r.start();
  }, [language, supported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop, setTranscript };
}

// ─── Markdown-light renderer (bold + newlines + bullets) ───────────────
function renderFormatted(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const trimmed = line.trim();
    const isBullet = /^[-•*]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed);
    const withBold = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1 py-0.5 text-[0.9em]">$1</code>');
    return (
      <div
        key={i}
        className={isBullet ? 'pl-2' : ''}
        dangerouslySetInnerHTML={{ __html: withBold || '&nbsp;' }}
      />
    );
  });
}

// ─── Tiny task icons for suggested action pills ────────────────────────
const TASK_META: Record<string, { icon: any; color: string }> = {
  nudge_writer:           { icon: Bell,          color: 'text-rose-500' },
  announcement_drafter:   { icon: MessageCircle, color: 'text-blue-500' },
  agenda_generator:       { icon: CalendarDays,  color: 'text-emerald-500' },
  penalty_advisor:        { icon: Wand2,         color: 'text-purple-500' },
};

// ─── Main panel ─────────────────────────────────────────────────────────
export function PiloPanel({ open, onOpenChange, context }: PiloPanelProps) {
  const [language, setLanguage] = useState(() => localStorage.getItem('stokpile-ai-language') || 'en');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => loadHistory());
  const [loading, setLoading] = useState(false);
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<{ callsThisMonth: number; cap: number } | null>(null);
  const [activeTask, setActiveTask] = useState<{ task: string; context?: any; label: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { supported: voiceSupported, listening, transcript, start: startVoice, stop: stopVoice, setTranscript } = useSpeechRecognition(language);

  // Persist language + history
  useEffect(() => { localStorage.setItem('stokpile-ai-language', language); }, [language]);
  useEffect(() => { saveHistory(messages); }, [messages]);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Live transcript → input
  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);

  // Check opt-in on open
  useEffect(() => {
    if (!open) return;
    api.getAiOptIn().then((r) => setOptedIn(r.optedIn)).catch(() => setOptedIn(false));
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleOptIn = async () => {
    try {
      await api.setAiOptIn(true);
      setOptedIn(true);
      toast.success('Pilo is ready to help');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not enable');
    }
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setTranscript('');
    setLoading(true);

    try {
      const res = await api.piloChat({
        messages: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
        groupId: context.groupId,
        groupName: context.groupName,
        isAdmin: context.isAdmin,
        language,
        tier: context.tier,
        lifetimePoints: context.lifetimePoints,
        commissionRate: context.commissionRate,
      });
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: res.text || "I didn't catch that. Try rephrasing?",
        suggestedActions: res.suggestedActions,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setUsage({ callsThisMonth: res.callsThisMonth, cap: res.cap });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Pilo is offline';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (!confirm('Clear this conversation?')) return;
    setMessages([]);
    localStorage.removeItem(HISTORY_KEY);
    toast.success('Conversation cleared');
  };

  const handleCopy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied');
    setTimeout(() => setCopiedId(null), 1500);
  };

  const starters = getStarterPrompts(context);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col gap-0 h-[100dvh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur-xl">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary via-primary to-emerald-500 flex items-center justify-center shadow-md shadow-primary/30">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Pilo</p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {context.groupName ? `${context.groupName} · ${context.isAdmin ? 'admin' : 'member'}` : 'Your savings assistant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 pr-7">
            {/* Note: SheetContent renders its own close (X) button at top-right */}
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-7 w-auto border-0 bg-transparent px-2 text-[11px] gap-1 hover:bg-muted">
                <Languages className="h-3 w-3" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="max-h-72">
                {SUPPORTED_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-xs">{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Consent gate */}
        {optedIn === false && (
          <div className="p-5 flex-1 flex items-center">
            <div className="rounded-2xl border bg-amber-50/50 dark:bg-amber-950/20 p-5 space-y-3">
              <p className="text-sm font-semibold">Enable Pilo?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Pilo sends your prompts and the group data needed to answer them to Anthropic for processing.
                Nothing is used for model training. You can turn it off any time in your profile.
              </p>
              <Button onClick={handleOptIn} className="w-full">Enable Pilo</Button>
            </div>
          </div>
        )}

        {/* Conversation */}
        {optedIn && (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 && !loading && (
                <div className="space-y-4 pt-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Sawubona 👋</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      I help you run your stokvel — ask anything about your group, or I can draft messages, agendas, or reports for you.
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Try asking</p>
                    <div className="flex flex-col gap-1.5">
                      {starters.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="text-left text-xs text-muted-foreground hover:text-foreground rounded-lg border border-dashed px-3 py-2 transition-colors hover:bg-muted/50 hover:border-solid"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onAction={(action) => setActiveTask({ task: action.task, context: action.context, label: action.label })}
                  onCopy={() => handleCopy(m.id, m.content)}
                  copied={copiedId === m.id}
                />
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white animate-pulse" />
                  </div>
                  <TypingDots />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t bg-card/80 backdrop-blur-xl p-3 pb-safe">
              <div className="relative rounded-2xl border bg-background shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition-shadow">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  placeholder={listening ? 'Listening...' : 'Ask Pilo anything...'}
                  rows={1}
                  className="w-full resize-none bg-transparent px-3 pt-2.5 pb-1 pr-20 text-sm outline-none placeholder:text-muted-foreground"
                  style={{ maxHeight: '120px' }}
                />
                <div className="flex items-center justify-between px-2 pb-1.5">
                  <div className="flex items-center gap-1">
                    {voiceSupported && (
                      <Button
                        size="icon"
                        variant={listening ? 'default' : 'ghost'}
                        className="h-7 w-7"
                        onClick={listening ? stopVoice : startVoice}
                        disabled={loading}
                        aria-label={listening ? 'Stop listening' : 'Voice input'}
                      >
                        {listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <label className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted cursor-pointer" aria-label="Upload an image to analyse">
                      <ImagePlus className="h-3.5 w-3.5" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { toast.error('Image too large (max 5MB)'); return; }
                          const reader = new FileReader();
                          reader.onload = async () => {
                            const dataUrl = reader.result as string;
                            const base64 = dataUrl.split(',')[1];
                            const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: `📎 Uploaded ${file.name}`, ts: Date.now() };
                            setMessages((prev) => [...prev, userMsg]);
                            setLoading(true);
                            try {
                              const res = await api.aiDocument({
                                imageBase64: base64,
                                mimeType: file.type,
                                question: input.trim() || 'Analyse this document for a stokvel admin.',
                                groupId: context.groupId,
                                language,
                              });
                              setMessages((prev) => [...prev, {
                                id: crypto.randomUUID(),
                                role: 'assistant',
                                content: res.text || 'I couldn\'t read that document. Try a clearer photo?',
                                ts: Date.now(),
                              }]);
                            } catch (err) {
                              toast.error(err instanceof Error ? err.message : 'Document analysis failed');
                            } finally {
                              setLoading(false);
                              setInput('');
                            }
                          };
                          reader.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {messages.length > 0 && (
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground px-2" onClick={clearHistory}>
                        Clear
                      </Button>
                    )}
                  </div>
                  <Button
                    size="icon"
                    className="h-7 w-7 rounded-full"
                    disabled={loading || !input.trim()}
                    onClick={() => send(input)}
                    aria-label="Send"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {usage && (
                <p className="text-[9px] text-center text-muted-foreground mt-1.5">
                  {usage.callsThisMonth}/{usage.cap} this month
                </p>
              )}
            </div>
          </>
        )}

        {/* Task modal launched from suggested action pill */}
        {activeTask && (
          <AiDrawer
            open={!!activeTask}
            onOpenChange={(o) => { if (!o) setActiveTask(null); }}
            title={activeTask.label}
            task={activeTask.task}
            groupId={context.groupId}
            contextStatic={activeTask.context}
            fields={TASK_FIELDS[activeTask.task] || []}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Message bubble ─────────────────────────────────────────────────────
function MessageBubble({
  message, onAction, onCopy, copied,
}: {
  message: Message;
  onAction: (a: SuggestedAction) => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const isAssistant = message.role === 'assistant';

  if (!isAssistant) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-primary/10 text-foreground px-3 py-2 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="h-3 w-3 text-white" />
      </div>
      <div className="flex-1 min-w-0 group">
        <div className="text-sm leading-relaxed space-y-1 [&_strong]:font-semibold">
          {renderFormatted(message.content)}
        </div>
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.suggestedActions.map((a, i) => {
              const meta = TASK_META[a.task];
              const Icon = meta?.icon || Wand2;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onAction(a)}
                  className="inline-flex items-center gap-1.5 text-xs rounded-full border px-2.5 py-1 bg-card hover:bg-muted transition-colors"
                >
                  <Icon className={`h-3 w-3 ${meta?.color || 'text-muted-foreground'}`} />
                  {a.label}
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={onCopy}
          className="mt-1.5 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1"
        >
          {copied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ─── Typing indicator ───────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// ─── Fields per suggested-task (kept minimal here; AiActions has the full set) ─
const TASK_FIELDS: Record<string, Array<{ key: string; label: string; type?: 'textarea' | 'text' | 'select'; placeholder?: string; required?: boolean; options?: Array<{ value: string; label: string }>; initial?: string }>> = {
  nudge_writer: [
    { key: 'memberEmail', label: 'Member email', required: true, placeholder: 'name@example.com' },
    { key: 'amount', label: 'Amount overdue', required: true, placeholder: 'R500' },
    { key: 'period', label: 'Period', required: true, placeholder: 'This month' },
  ],
  announcement_drafter: [
    { key: 'topic', label: 'Topic', type: 'textarea', required: true, placeholder: 'Payouts delayed because of the holiday' },
    { key: 'tone', label: 'Tone', type: 'select', initial: 'warm and respectful', options: [
      { value: 'warm and respectful', label: 'Warm' },
      { value: 'formal',               label: 'Formal' },
      { value: 'urgent',               label: 'Urgent' },
    ]},
  ],
  agenda_generator: [
    { key: 'meetingDate', label: 'Meeting date', required: true, placeholder: 'YYYY-MM-DD' },
  ],
};
