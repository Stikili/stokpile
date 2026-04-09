import { useEffect } from 'react';
import { Button } from '@/presentation/ui/button';
import { Badge } from '@/presentation/ui/badge';
import { Logo } from '@/presentation/layout/Logo';
import {
  Check, Sparkles, Shield, Globe, Users, TrendingUp,
  HeartHandshake, ShoppingCart, RefreshCw, MessageCircle, FileText,
  ArrowRight, Star,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  { icon: Users, title: 'Member tracking', desc: 'See who has paid, who owes, and who is on a streak.', color: 'from-blue-500 to-blue-600' },
  { icon: TrendingUp, title: 'Payouts & rotation', desc: 'Schedule payouts, manage cycle order, track balances.', color: 'from-emerald-500 to-emerald-600' },
  { icon: HeartHandshake, title: 'Burial societies', desc: 'Beneficiaries, dependents, and claims management built-in.', color: 'from-rose-500 to-rose-600' },
  { icon: ShoppingCart, title: 'Grocery stokvels', desc: 'Plan year-end bulk buys with shopping list coordination.', color: 'from-orange-500 to-orange-600' },
  { icon: RefreshCw, title: 'Rotating stokvels', desc: 'Automatic payout order and cycle reminders.', color: 'from-purple-500 to-purple-600' },
  { icon: FileText, title: 'Reports & receipts', desc: 'PDF receipts, financial reports, audit logs.', color: 'from-indigo-500 to-indigo-600' },
  { icon: MessageCircle, title: 'SMS & WhatsApp', desc: 'Reach members where they actually are.', color: 'from-green-500 to-green-600' },
  { icon: Shield, title: 'POPIA compliant', desc: 'Privacy-first with full data export and deletion.', color: 'from-slate-500 to-slate-600' },
];

const COUNTRIES = [
  '🇿🇦 South Africa', '🇧🇼 Botswana', '🇳🇦 Namibia', '🇿🇼 Zimbabwe',
  '🇿🇲 Zambia', '🇲🇿 Mozambique', '🇰🇪 Kenya', '🇳🇬 Nigeria',
  '🇬🇭 Ghana', '🇺🇬 Uganda', '🇹🇿 Tanzania', '🇲🇼 Malawi',
];

const PRICING = [
  {
    name: 'Free',
    price: 'R0',
    period: 'forever',
    features: ['1 group', 'Up to 8 members', 'Contributions & payouts', 'Meetings & announcements'],
    cta: 'Start Free',
  },
  {
    name: 'Starter',
    price: 'R19',
    period: 'per month',
    features: ['2 groups', '30 members', 'Payment proofs', 'Rotation manager', 'Burial & grocery workflows', 'SMS notifications'],
    cta: 'Try Free for 90 Days',
  },
  {
    name: 'Pro',
    price: 'R39',
    period: 'per month',
    features: ['Unlimited groups', '100 members', 'Reports & analytics', 'Penalties & audit log', 'Unlimited SMS', 'Everything in Starter'],
    cta: 'Try Free for 90 Days',
    highlight: true,
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  // Disable pull-to-refresh and overscroll bounce so the page feels native.
  useEffect(() => {
    document.documentElement.classList.add('no-overscroll');
    document.body.classList.add('no-overscroll');
    return () => {
      document.documentElement.classList.remove('no-overscroll');
      document.body.classList.remove('no-overscroll');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30 no-overscroll pb-24 md:pb-0">

      {/* ─── Header (sticky, with safe area for iOS notch) ─── */}
      <header className="sticky top-0 z-50 bg-white/85 dark:bg-[#050e1c]/85 backdrop-blur-xl border-b border-border/40 pt-safe">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Logo showText />
          <Button
            onClick={onGetStarted}
            size="sm"
            className="tap-none font-semibold shadow-md shadow-primary/20"
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          MOBILE — single-viewport hero with everything in one screen
          Desktop layout follows below (hidden md:block)
          ═══════════════════════════════════════════════════════════════ */}

      {/* ─── MOBILE HERO (fits one screen, swipeable cards below) ─── */}
      <section className="md:hidden px-5 pt-4 pb-3 text-center">
        <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 px-2.5 py-0.5 text-[10px]">
          <Sparkles className="h-3 w-3 mr-1" />
          90 days free
        </Badge>

        <h1 className="text-[1.85rem] leading-[1.05] font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Run your stokvel<br />the modern way
        </h1>

        <p className="text-[13px] text-muted-foreground mt-2.5 px-2">
          Track contributions, payouts and members — all in one app.
        </p>
      </section>

      {/* ─── MOBILE feature pills row (3 chips, no scroll) ─── */}
      <div className="md:hidden flex justify-center gap-1.5 px-4 mb-3">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-card border text-[10px] text-muted-foreground">
          <Shield className="h-2.5 w-2.5 text-primary" />POPIA
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-card border text-[10px] text-muted-foreground">
          <Globe className="h-2.5 w-2.5 text-primary" />9 languages
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-card border text-[10px] text-muted-foreground">
          <Sparkles className="h-2.5 w-2.5 text-primary" />Offline
        </div>
      </div>

      {/* ─── MOBILE features carousel (replaces full features section) ─── */}
      <div className="md:hidden flex gap-3 overflow-x-auto scrollbar-none snap-x-mandatory px-5 pb-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="snap-start shrink-0 w-[68vw] max-w-[260px] rounded-2xl border bg-card p-3 tap-none"
          >
            <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${f.color} flex items-center justify-center mb-2 shadow-sm`}>
              <f.icon className="h-4 w-4 text-white" />
            </div>
            <h3 className="font-semibold text-sm mb-0.5">{f.title}</h3>
            <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ─── MOBILE pricing carousel ─── */}
      <section className="md:hidden bg-muted/20 py-5 border-y border-border/40">
        <div className="text-center mb-3 px-5">
          <h2 className="text-base font-bold tracking-tight">Pricing</h2>
          <p className="text-[11px] text-muted-foreground">All paid plans get a 90-day Pro trial.</p>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x-mandatory px-5 pb-1">
          {PRICING.map((p) => (
            <div
              key={p.name}
              className={`snap-start shrink-0 w-[72vw] max-w-[280px] rounded-2xl border bg-card p-4 ${
                p.highlight ? 'border-primary shadow-lg shadow-primary/15 ring-1 ring-primary/30' : ''
              }`}
            >
              {p.highlight && (
                <Badge className="mb-2 bg-primary text-primary-foreground text-[9px] py-0">Most Popular</Badge>
              )}
              <h3 className="font-semibold text-base">{p.name}</h3>
              <div className="mt-1 mb-3 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight">{p.price}</span>
                <span className="text-muted-foreground text-xs">/{p.period}</span>
              </div>
              <ul className="space-y-1 mb-3">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-1.5 text-[11px]">
                    <Check className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
                {p.features.length > 4 && (
                  <li className="text-[10px] text-muted-foreground pl-4">+ {p.features.length - 4} more</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── MOBILE compact footer ─── */}
      <footer className="md:hidden py-4 px-5 text-center text-[10px] text-muted-foreground">
        © {new Date().getFullYear()} Stokpile · <a href="mailto:hello@stokpile.app" className="hover:text-foreground">Contact</a> · <a href="mailto:privacy@stokpile.app" className="hover:text-foreground">Privacy</a>
      </footer>

      {/* ═══════════════════════════════════════════════════════════════
          DESKTOP — full multi-section layout
          ═══════════════════════════════════════════════════════════════ */}

      {/* ─── DESKTOP Hero ─── */}
      <section className="hidden md:block px-5 pt-16 pb-12 text-center max-w-3xl mx-auto">
        <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 px-3 py-1 text-xs">
          <Sparkles className="h-3 w-3 mr-1" />
          90 days free for new groups
        </Badge>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Run your stokvel<br />the modern way
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground mt-5 max-w-2xl mx-auto px-2">
          Track contributions, payouts, and members for your stokvel,
          burial society, or chama — built for your phone.
        </p>

        <div className="flex sm:flex-row justify-center gap-2.5 mt-7">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="h-12 text-base font-semibold tap-none shadow-lg shadow-primary/20"
          >
            Start Free
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            className="h-12 text-base tap-none"
          >
            See How It Works
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground mt-4 px-4">
          No credit card required · Works offline · POPIA compliant
        </p>
      </section>

      {/* ─── DESKTOP App preview / phone mockup ─── */}
      <section className="hidden md:block px-4 pb-10">
        <div className="max-w-md mx-auto relative">
          <div className="aspect-[9/19] rounded-[2.5rem] bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 p-1.5 shadow-2xl shadow-slate-900/20 mx-auto max-w-[280px]">
            <div className="h-full w-full rounded-[2.1rem] bg-card flex flex-col p-4 overflow-hidden">
              <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground mb-3">
                <span>9:41</span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
                  <span className="h-1.5 w-2 rounded-sm bg-foreground/60" />
                </span>
              </div>
              <div className="flex-1 space-y-2">
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-3">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Group Balance</p>
                  <p className="text-2xl font-bold text-primary tracking-tight">R 12,400</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">8 of 10 paid this month</p>
                </div>
                <div className="rounded-xl border bg-card p-2.5 space-y-1.5">
                  {[
                    { name: 'Thandi M.', paid: true, amt: 'R500' },
                    { name: 'Sipho D.', paid: true, amt: 'R500' },
                    { name: 'Precious K.', paid: true, amt: 'R500' },
                    { name: 'Kagiso T.', paid: false, amt: '—' },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <span className={`h-2 w-2 rounded-full ${m.paid ? 'bg-green-500' : 'bg-muted'}`} />
                      <span className="flex-1 truncate">{m.name}</span>
                      <span className={m.paid ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-muted-foreground'}>{m.amt}</span>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-amber-300 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/10 p-2.5">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Next payout</p>
                  <p className="text-sm font-semibold mt-0.5">Thandi M.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -top-2 -right-4 bg-card rounded-2xl border shadow-xl px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              <span className="font-semibold">90 days free</span>
            </div>
          </div>
          <div className="absolute -bottom-2 -left-4 bg-card rounded-2xl border shadow-xl px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs">
              <Shield className="h-3 w-3 text-primary" />
              <span className="font-semibold">POPIA</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DESKTOP Country strip ─── */}
      <section className="hidden md:block border-y border-border/40 bg-muted/20 py-4">
        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-wider font-semibold mb-2 px-4">
          Built for groups across Africa
        </p>
        <div className="flex gap-5 justify-center flex-wrap text-sm px-4">
          {COUNTRIES.map((c) => (
            <span key={c} className="text-muted-foreground whitespace-nowrap">{c}</span>
          ))}
        </div>
      </section>

      {/* ─── DESKTOP Features grid ─── */}
      <section id="features" className="hidden md:block py-16">
        <div className="text-center mb-10 px-5">
          <h2 className="text-3xl font-bold tracking-tight">Everything your group needs</h2>
          <p className="text-base text-muted-foreground mt-2">From rotating savings to burial societies.</p>
        </div>
        <div className="grid max-w-6xl mx-auto px-4 grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-4">
              <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 shadow-md`}>
                <f.icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DESKTOP Pricing ─── */}
      <section className="hidden md:block bg-muted/20 py-16">
        <div className="px-5 max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight">Honest African pricing</h2>
            <p className="text-base text-muted-foreground mt-2">All paid plans include a 90-day Pro trial.</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border bg-card p-5 ${
                  p.highlight
                    ? 'border-primary shadow-xl shadow-primary/15 ring-1 ring-primary/30'
                    : ''
                }`}
              >
                {p.highlight && (
                  <Badge className="mb-3 bg-primary text-primary-foreground text-[10px]">Most Popular</Badge>
                )}
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <div className="mt-2 mb-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">{p.price}</span>
                  <span className="text-muted-foreground text-sm">/{p.period}</span>
                </div>
                <ul className="space-y-2 mb-5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-11 tap-none font-semibold"
                  variant={p.highlight ? 'default' : 'outline'}
                  onClick={onGetStarted}
                >
                  {p.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DESKTOP Trust ─── */}
      <section className="hidden md:block px-5 py-16 max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold tracking-tight mb-3">Trusted by communities</h2>
        <p className="text-base text-muted-foreground mb-6 px-2">
          Stokpile is not a bank. Funds stay where you trust them — your group.
          We give you the tools to keep everything transparent.
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border">
            <Shield className="h-3.5 w-3.5" />
            POPIA compliant
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border">
            <Globe className="h-3.5 w-3.5" />
            9 languages
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border">
            <Sparkles className="h-3.5 w-3.5" />
            Lite mode
          </div>
        </div>
      </section>

      {/* ─── DESKTOP Final CTA ─── */}
      <section className="hidden md:block bg-gradient-to-br from-primary via-primary to-emerald-700 text-primary-foreground py-16">
        <div className="max-w-2xl mx-auto px-5 text-center">
          <h2 className="text-3xl font-bold mb-3">Start your group in 2 minutes</h2>
          <p className="opacity-90 mb-6 text-base">No credit card. Free forever for small groups.</p>
          <Button
            size="lg"
            onClick={onGetStarted}
            className="h-12 text-base bg-white text-primary hover:bg-white/95 font-semibold tap-none shadow-lg px-10"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </section>

      {/* ─── DESKTOP Footer ─── */}
      <footer className="hidden md:block border-t border-border/40 py-6 px-5">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo showText={false} />
            <span>© {new Date().getFullYear()} Stokpile</span>
          </div>
          <div className="flex gap-5">
            <a href="mailto:hello@stokpile.app" className="hover:text-foreground tap-none">Contact</a>
            <a href="mailto:privacy@stokpile.app" className="hover:text-foreground tap-none">Privacy</a>
            <a href="mailto:hello@stokpile.app" className="hover:text-foreground tap-none">Terms</a>
          </div>
        </div>
      </footer>

      {/* ─── Sticky bottom CTA bar (mobile only, native-app style) ─── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#050e1c]/95 backdrop-blur-xl border-t border-border/60 px-4 pt-3 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="pb-3">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="w-full h-12 text-base font-semibold tap-none shadow-lg shadow-primary/30"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-1.5">
            Free forever · No credit card · 90-day Pro trial
          </p>
        </div>
      </div>
    </div>
  );
}
