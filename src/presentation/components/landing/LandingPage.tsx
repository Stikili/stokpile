import { useState, type ReactNode } from 'react';
import './landing.css';
import { Moon, Sun } from 'lucide-react';
import { Logo } from '@/presentation/layout/Logo';
import { CycleRail } from '@/presentation/brand/CycleRail';
import { StatusChip } from '@/presentation/shared/StatusChip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/presentation/ui/accordion';
import { useTheme } from '@/presentation/shared/ThemeProvider';
import { PrivacyPolicy } from '@/presentation/components/legal/PrivacyPolicy';
import { TermsOfService } from '@/presentation/components/legal/TermsOfService';
import { RefundPolicy } from '@/presentation/components/legal/RefundPolicy';
import { CancellationPolicy } from '@/presentation/components/legal/CancellationPolicy';
import { money } from '@/lib/money';

/**
 * Marketing page (design kit v2).
 *  · no scroll-reveal gating — everything is in the DOM and visible at rest
 *  · no mobile sticky CTA — it ate ~12% of a small phone's viewport
 *  · the hero shows a round in progress, not a static balance
 *  · one tagline, used here and in the app
 *  · rewards sit below pricing
 * Copy only claims what the product does today.
 */

type LegalKey = 'privacy' | 'terms' | 'refund' | 'cancel' | null;
type Mode = 'signin' | 'signup';

interface LandingPageProps {
  /** Open sign-in ('signin') or account creation ('signup'). */
  onGetStarted: (mode: Mode) => void;
}

// Real member quotes only. The section stays hidden while this is empty.
// Shape: { quote: '…', name: 'Thandi M.', role: 'Treasurer, Soweto burial society' }
const TESTIMONIALS: { quote: string; name: string; role: string }[] = [];

// Keep in sync with the country list in AuthForm.
const COUNTRIES = [
  'South Africa', 'Botswana', 'Namibia', 'Lesotho', 'Eswatini', 'Zimbabwe',
  'Zambia', 'Mozambique', 'Malawi', 'Angola', 'DRC', 'Kenya',
  'Tanzania', 'Uganda', 'Rwanda', 'Ethiopia', 'Nigeria', 'Ghana',
];
const SHOWN_COUNTRIES = ['South Africa', 'Botswana', 'Namibia', 'Zimbabwe', 'Zambia', 'Kenya', 'Nigeria', 'Ghana'];

const TREASURER_JOBS: { title: string; body: string }[] = [
  { title: 'Chasing from memory', body: 'See who owes what this round, and send a WhatsApp reminder with the amount already written.' },
  { title: 'Rewriting the book', body: 'Receipts, the ledger and an audit trail are produced as you record, not at month end.' },
  { title: 'Arguing about turns', body: 'The payout order is set once and visible to everyone. Only admins can change it, and every change is logged.' },
  { title: 'Typing up minutes', body: 'Agenda, attendance, votes and notes live together in one meeting record.' },
  { title: 'Being the bad guy', body: 'Penalties follow the rules your group set, not the treasurer’s mood.' },
  { title: 'Losing the proof', body: 'Photos of EFT slips attach to the payment itself, not to a WhatsApp thread.' },
];

const PLANS = [
  {
    name: 'Free', price: 'R0', period: 'forever', cta: 'Start free',
    features: ['1 group · up to 8 members', 'Contributions, payouts, meetings', 'Rotation manager and receipts', 'Pilo AI · 5 questions a month'],
  },
  {
    name: 'Starter', price: 'R19', period: 'per group / month', cta: 'Try free for 90 days',
    features: ['2 groups · 30 members each', 'Payment proofs · 50 SMS a month', 'Burial and grocery tools', 'Mobile money payments', 'Pilo AI · 30 questions a month'],
  },
  {
    name: 'Pro', price: 'R39', period: 'per group / month', cta: 'Try free for 90 days', featured: true,
    features: ['Unlimited groups · 100 members each', 'Reports, analytics and audit log', 'Penalty rules', 'Unlimited SMS', 'Pilo AI · 200 questions and deeper analysis'],
  },
];

const FAQS = [
  { q: 'Does Stokpile hold our group’s money?', a: 'No. Stokpile is not a bank and never holds contributions or payouts. Your money stays where your group already keeps it. Stokpile keeps the record so everyone can see where it is.' },
  { q: 'Who pays: the admin or every member?', a: 'Plans are per group, not per person. One plan covers the whole group and members join for free.' },
  { q: 'What happens after the 90-day trial?', a: 'Choose a plan or drop back to Free. Nothing is deleted: contributions, payouts and history stay intact either way.' },
  { q: 'Can we cancel any time?', a: 'Yes, from the app. Billing stops and your group keeps access until the end of the month you’ve paid for.' },
  { q: 'Is Pilo free?', a: 'Every plan includes Pilo questions each month: 5 on Free, 30 on Starter and 200 on Pro.' },
  { q: 'Does it work for burial societies and grocery stokvels?', a: 'Yes. Burial societies track beneficiaries, dependents and claims. Grocery stokvels plan bulk buys with a shared list. Rotating stokvels and chamas get a fixed payout order.' },
  { q: 'Is our members’ information safe?', a: 'Stokpile is built to comply with POPIA. Every change is recorded in an audit log, and members can export or delete their personal data.' },
  { q: 'Which countries is Stokpile available in?', a: `Groups in ${COUNTRIES.length} African countries use Stokpile, and each group keeps its own currency.` },
];

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const [legal, setLegal] = useState<LegalKey>(null);
  const dark = theme === 'navy';

  return (
    <div className="mk">
      <nav className="mk-nav" aria-label="Main">
        <Logo size={26} />
        <span className="mk-navlinks">
          <button type="button" onClick={() => scrollTo('how')}>How it works</button>
          <button type="button" onClick={() => scrollTo('pilo')}>Pilo</button>
          <button type="button" onClick={() => scrollTo('pricing')}>Pricing</button>
          <button type="button" onClick={() => scrollTo('faq')}>FAQ</button>
        </span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="text-[var(--s-muted)] hover:text-[var(--s-ink)] p-1"
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button type="button" className="mk-signin" onClick={() => onGetStarted('signin')}>Sign in</button>
          <button type="button" className="mk-btn mk-btn--primary mk-btn--sm" onClick={() => onGetStarted('signup')}>Start free</button>
        </span>
      </nav>

      <div className="mk-in">
        <header className="mk-hero">
          <div>
            <span className="mk-kicker">Stokvels · Burial societies · Chamas</span>
            <h1 className="t-display mk-title">Nobody’s turn gets forgotten.</h1>
            <p className="mk-sub">
              Your group already trusts each other. Stokpile keeps the record that protects it:
              who paid, whose turn it is, and where every rand went. Free for groups of eight.
            </p>
            <div className="mk-cta">
              <button type="button" className="mk-btn mk-btn--primary" onClick={() => onGetStarted('signup')}>Start your group</button>
              <button type="button" className="mk-btn mk-btn--ghost" onClick={() => scrollTo('how')}>See how it works</button>
            </div>
            <p className="mk-fine">No credit card · POPIA compliant · We never hold your money</p>
          </div>

          {/* The product doing its job: a round in progress. */}
          <aside className="card mk-shot" aria-label="Example group">
            <div className="mk-between">
              <span className="t-label">Round 7 of 10 · September</span>
              <StatusChip tone="late" label="1 late" />
            </div>
            <CycleRail members={10} round={7} label="Round 7 of 10" />
            <div className="mt-4">
              <span className="t-label">Collected this round</span>
              <div className="mk-bal">
                {money(9600, { currency: 'ZAR' })}
                <span className="mk-bal__of"> / {money(12000, { currency: 'ZAR' })}</span>
              </div>
            </div>
            <div className="meter" aria-hidden="true">
              <i className="meter__fill" style={{ width: '80%' }} />
              <i className="meter__fill meter__fill--late" style={{ width: '10%' }} />
            </div>
            <div className="ledger mt-3">
              <LedgerRow who="Precious K." meta="EFT · 11 Sep" value={`+${money(1200, { currency: 'ZAR' })}`} />
              <LedgerRow who="Kagiso T." meta="7 days late" value={`${money(1200, { currency: 'ZAR' })} due`} late />
            </div>
          </aside>
        </header>
      </div>

      <div className="mk-band speckle">
        <div className="strip">
          {SHOWN_COUNTRIES.map((c) => <span key={c}>{c}</span>)}
          <span>+ {COUNTRIES.length - SHOWN_COUNTRIES.length} more</span>
        </div>
      </div>

      <div className="mk-in">
        <section className="mk-sec" id="how">
          <h2 className="mk-h2">How a cycle works</h2>
          <p className="mk-lead">Three steps, in this order, every round.</p>
          <div className="mk-steps">
            <Step n="01" title="Fix the order">
              Set the payout order once, when the group starts. Everyone can see it, so nobody’s turn is a matter of memory.
            </Step>
            <Step n="02" title="Collect and record">
              Log cash at the meeting or an EFT when it lands. Every payment gets a numbered receipt the member can keep or forward.
            </Step>
            <Step n="03" title="Pay out and prove it">
              One payout per round, with proof of payment attached and the member confirming they received it.
            </Step>
          </div>
        </section>

        <section className="mk-sec">
          <h2 className="mk-h2">What the treasurer stops doing</h2>
          <p className="mk-lead">The job is unpaid and thankless. Stokpile takes six things off it.</p>
          <div className="mk-feat">
            {TREASURER_JOBS.map((j) => (
              <div key={j.title}>
                <Tick />
                <span><b>{j.title}</b><span>{j.body}</span></span>
              </div>
            ))}
          </div>
        </section>

        <section className="mk-sec" id="pilo">
          <div className="mk-two">
            <div>
              <h2 className="mk-h2">Meet Pilo, who knows your group’s book</h2>
              <p className="mk-lead">
                Ask in plain language: who hasn’t paid, whose turn is next, what the constitution says about
                late payments. Pilo can also run a growth check on your group and compare bank accounts that suit it.
              </p>
              <p className="mk-fine">Included on every plan: 5 questions a month on Free, 30 on Starter, 200 on Pro.</p>
            </div>
            <div className="card mk-chat" aria-label="Example Pilo conversation">
              <p className="mk-chat__me">Who hasn’t paid for September?</p>
              <p className="mk-chat__bot">2 of 10 are outstanding: Kagiso T. and Lerato N., R1 200 each. Want me to draft a friendly reminder?</p>
              <p className="mk-chat__me">Yes, keep it kind.</p>
              <p className="mk-chat__bot">“Hi Kagiso, a gentle reminder that your R1 200 for September is still open. Thanks for keeping the group strong.”</p>
            </div>
          </div>
        </section>

        {TESTIMONIALS.length > 0 && (
          <section className="mk-sec">
            {TESTIMONIALS.map((t) => (
              <blockquote key={t.name} className="card card--quiet mk-quote">
                <p className="mk-quote__text">“{t.quote}”</p>
                <footer className="t-label">{t.name} · {t.role}</footer>
              </blockquote>
            ))}
          </section>
        )}

        <section className="mk-sec" id="pricing">
          <h2 className="mk-h2">Priced per group, not per person</h2>
          <p className="mk-lead">A ten-member group on Pro pays R3.90 per member a month. Paid plans start with 90 days free.</p>
          <div className="mk-plans">
            {PLANS.map((p) => (
              <div key={p.name} className={`card mk-plan${p.featured ? ' mk-plan--featured' : ''}`}>
                <div className="flex items-center justify-between">
                  <h3 className="t-heading">{p.name}</h3>
                  {p.featured && <StatusChip tone="payout" label="Most popular" />}
                </div>
                <div className="mk-plan__price">{p.price} <small>{p.period}</small></div>
                <ul>
                  {p.features.map((f) => <li key={f}><Tick />{f}</li>)}
                </ul>
                <button
                  type="button"
                  className={`mk-btn mk-btn--block ${p.featured ? 'mk-btn--primary' : 'mk-btn--ghost'}`}
                  onClick={() => onGetStarted('signup')}
                >
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="mk-sec">
          <div className="card card--quiet">
            <h2 className="mk-h2">Stokpile pays you back</h2>
            <p className="mk-lead">
              Earn points every month you subscribe and redeem them for subscription credit (100 points = R1).
              Refer another group and earn a share of their subscription for 24 months.
            </p>
          </div>
        </section>

        <section className="mk-sec" id="faq">
          <h2 className="mk-h2">Questions groups ask</h2>
          <Accordion type="single" collapsible className="card mk-faq mt-4 !py-0">
            {FAQS.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-[length:var(--t-size-md)] font-semibold hover:no-underline">{f.q}</AccordionTrigger>
                <AccordionContent className="text-[length:var(--t-size-md)] text-[var(--s-ink-2)] leading-relaxed">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <section className="mk-sec mk-sec--last">
          <div className="card card--quiet">
            <h2 className="mk-h2">Stokpile is not a bank</h2>
            <p className="mk-lead">
              Your money stays where your group already keeps it: the account, the tin, the treasurer’s hands.
              Stokpile keeps the record, and the record is what the group argues about.
            </p>
            <div className="mk-cta">
              <button type="button" className="mk-btn mk-btn--primary" onClick={() => onGetStarted('signup')}>Start your group</button>
            </div>
          </div>
        </section>

        <footer className="mk-foot">
          <span className="flex items-center gap-2">
            <Logo showText={false} size={16} /> © {new Date().getFullYear()} Stokpile
          </span>
          <nav aria-label="Legal">
            <button type="button" onClick={() => setLegal('terms')}>Terms</button>
            <button type="button" onClick={() => setLegal('privacy')}>Privacy</button>
            <button type="button" onClick={() => setLegal('refund')}>Refunds</button>
            <button type="button" onClick={() => setLegal('cancel')}>Cancellation</button>
          </nav>
        </footer>
      </div>

      <TermsOfService     open={legal === 'terms'}   onOpenChange={(o) => !o && setLegal(null)} />
      <PrivacyPolicy      open={legal === 'privacy'} onOpenChange={(o) => !o && setLegal(null)} />
      <RefundPolicy       open={legal === 'refund'}  onOpenChange={(o) => !o && setLegal(null)} />
      <CancellationPolicy open={legal === 'cancel'}  onOpenChange={(o) => !o && setLegal(null)} />
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div className="card mk-step">
      <span className="t-label">Step {n}</span>
      <h3 className="t-heading mt-2 mb-1.5">{title}</h3>
      <p>{children}</p>
    </div>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8.4l3 3 7-7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LedgerRow({ who, meta, value, late = false }: { who: string; meta: string; value: string; late?: boolean }) {
  return (
    <div className="ledger-row">
      <div>
        <div className="ledger-row__who">{who}</div>
        <div className={`ledger-row__meta${late ? ' ledger-row__meta--late' : ''}`}>{meta}</div>
      </div>
      <div className="ledger-row__leader" />
      <div className={`ledger-row__value${late ? ' ledger-row__value--late' : ''}`}>{value}</div>
    </div>
  );
}
