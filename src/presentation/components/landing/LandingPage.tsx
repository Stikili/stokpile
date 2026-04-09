import { Button } from '@/presentation/ui/button';
import { Card, CardContent } from '@/presentation/ui/card';
import { Badge } from '@/presentation/ui/badge';
import { Logo } from '@/presentation/layout/Logo';
import {
  Check, Sparkles, Shield, Globe, Users, TrendingUp,
  HeartHandshake, ShoppingCart, RefreshCw, MessageCircle, FileText,
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const FEATURES = [
  { icon: Users, title: 'Member tracking', desc: 'See who has paid, who owes, and who is on a streak.' },
  { icon: TrendingUp, title: 'Payouts & rotation', desc: 'Schedule payouts, track balances, manage cycle order.' },
  { icon: HeartHandshake, title: 'Burial societies', desc: 'Beneficiaries, dependents, and claims management built-in.' },
  { icon: ShoppingCart, title: 'Grocery stokvels', desc: 'Plan year-end bulk buys with shopping list coordination.' },
  { icon: RefreshCw, title: 'Rotating stokvels', desc: 'Automatic payout order, cycle counter, and reminders.' },
  { icon: FileText, title: 'Reports & receipts', desc: 'PDF receipts, financial reports, and audit logs.' },
  { icon: MessageCircle, title: 'SMS & WhatsApp', desc: 'Reach members where they actually are. No data needed.' },
  { icon: Shield, title: 'POPIA compliant', desc: 'Privacy-first, with full data export and right to deletion.' },
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
    features: ['2 groups', '30 members', 'Payment proofs', 'Rotation manager', 'Burial & grocery workflows', 'SMS notifications', '90-day free trial'],
    cta: 'Try Free for 90 Days',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 'R39',
    period: 'per month',
    features: ['Unlimited groups', '100 members', 'Everything in Starter', 'Reports & analytics', 'Penalties & audit log', 'Unlimited SMS', '90-day free trial'],
    cta: 'Try Free for 90 Days',
    highlight: true,
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/30">
      {/* Header */}
      <header className="border-b border-border/40 bg-white/70 dark:bg-[#050e1c]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo showText />
          <Button onClick={onGetStarted} size="sm">Sign In</Button>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-16 pb-12 text-center">
        <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
          <Sparkles className="h-3 w-3 mr-1" />
          90 days free for new groups
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Run your stokvel<br />the modern way
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto">
          Stokpile gives stokvels, burial societies, chamas, and savings groups across Africa
          a transparent, easy way to track contributions and payouts — built for your phone.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <Button size="lg" onClick={onGetStarted} className="text-base">
            Start Free
          </Button>
          <Button size="lg" variant="outline" onClick={onGetStarted} className="text-base">
            See How It Works
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          No credit card required · Works offline · POPIA compliant
        </p>
      </section>

      {/* Country strip */}
      <section className="bg-muted/30 border-y border-border/40 py-6">
        <div className="max-w-6xl mx-auto px-4">
          <p className="text-xs text-center text-muted-foreground uppercase tracking-wider mb-3">
            Built for groups across Africa
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            {COUNTRIES.map((c) => <span key={c} className="text-muted-foreground">{c}</span>)}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">Everything your group needs</h2>
          <p className="text-muted-foreground mt-2">From rotating savings to burial societies, all in one app.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="p-4">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-muted/20 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">Honest African pricing</h2>
            <p className="text-muted-foreground mt-2">No transaction fees on free tier. All plans include a 90-day Pro trial.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING.map((p) => (
              <Card
                key={p.name}
                className={p.highlight ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : ''}
              >
                <CardContent className="p-5">
                  {p.highlight && (
                    <Badge className="mb-3 bg-primary text-primary-foreground">Most Popular</Badge>
                  )}
                  <h3 className="font-semibold text-lg">{p.name}</h3>
                  <div className="mt-2 mb-4">
                    <span className="text-3xl font-bold">{p.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/{p.period}</span>
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
                    className="w-full"
                    variant={p.highlight ? 'default' : 'outline'}
                    onClick={onGetStarted}
                  >
                    {p.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Trusted by communities, not just users</h2>
        <p className="text-muted-foreground mb-6">
          Stokpile is not a bank. Funds stay where you trust them — your group, your treasurer.
          We give you the tools to keep everything transparent.
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            POPIA compliant
          </div>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Works in 9 languages
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Lite mode for low data
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-3">Start your group in 2 minutes</h2>
          <p className="opacity-90 mb-6">No credit card, no commitment. Free forever for small groups.</p>
          <Button
            size="lg"
            variant="secondary"
            onClick={onGetStarted}
            className="text-base bg-white text-primary hover:bg-white/90"
          >
            Get Started Free
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Logo showText={false} />
            <span>© {new Date().getFullYear()} Stokpile. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <a href="mailto:hello@stokpile.app" className="hover:text-foreground">Contact</a>
            <a href="mailto:privacy@stokpile.app" className="hover:text-foreground">Privacy</a>
            <a href="mailto:hello@stokpile.app" className="hover:text-foreground">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
