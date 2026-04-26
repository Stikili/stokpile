// Growth playbook — frameworks Pilo applies when admins ask "how do we grow?"
// Loaded into the growth_advisor task's system prompt. Curated by hand;
// update when new tactics prove out with real users.

export const GROWTH_PLAYBOOK = `
# Stokvel Growth Playbook (SA-focused)

## Stage diagnostic
Before recommending tactics, identify what stage the group is in:

- **Forming (0-3 months, < 8 members):** focus on trust-building and retention, not acquisition
- **Stabilising (3-12 months, 8-20 members):** focus on member habits and constitution clarity
- **Scaling (12+ months, 20-50 members):** focus on governance, splitting cycles, formalisation
- **Established (50+ members or 2+ years):** focus on multiple groups under one umbrella, semi-formal cooperative path

## Member acquisition

### Recommended in order of conversion likelihood
1. **Direct invitations from existing members** — 70-80% accept. Use the in-app referral link with a personal WhatsApp message. Each member has a real-world circle of 3-5 likely candidates.
2. **Workplace partnerships** — pitch to HR/CSI teams to host the stokvel. Common in SA mining, retail, hospitality. Often turns into payroll-deduction stokvels with retention >95%.
3. **Church / religious community announcements** — Sunday morning announcements, church bulletins. Strong trust signal. Best for burial societies and goal-based savings.
4. **Community noticeboards** — taxi ranks, community halls, libraries. Lower-volume but high-intent.
5. **Public group listings on Stokpile** — toggle the group public, gets discovered by people searching for stokvels of their type.
6. **Social media (Facebook groups, WhatsApp groups)** — slow but compounding. Post the share-cycle-summary image at year-end.

### Avoid
- Cold outreach to strangers — low trust, high churn
- Paid ads in the first 6 months — money better spent on retention

## Retention (the actual leverage)

Retention is 5-10× cheaper than acquisition in stokvels. A 90% retention group beats a 60% retention group at every member-count level.

### Highest-impact retention plays
1. **Crystal-clear constitution** — what happens if someone misses a payment? Who decides on payouts? When does the cycle close? Use Stokpile's constitution builder.
2. **Predictable rhythm** — same day each month for contributions, same day for meetings. People organise their lives around it.
3. **Transparent reporting** — every member sees the live balance. No mystery. Use Stokpile's share-summary image at month/quarter end.
4. **Reward consistency** — small celebration for members who paid 12 months in a row. Costs nothing, builds identity.
5. **Address late-payers privately first, publicly only after 3 attempts** — protects dignity. Use Pilo's nudge writer.
6. **End-of-cycle ceremony** — physical or virtual gathering when payouts complete. The social bond is what makes them stay for next cycle.

### Watch-outs
- Treasurer turnover is the #1 cause of group death. Use Pilo's treasurer handover pack early.
- Disputes that fester for >2 weeks usually kill 1-3 members from the group. Resolve fast even if imperfectly.
- Members who go silent for 2+ months are 80% likely to drop. Outreach in month 1 of silence saves most.

## Contribution growth

### Tactics to increase contribution amount or frequency
1. **Graduated tier structure** — let members opt into "double contribution" with double payout. Self-selection without pressure.
2. **Goal-based mini-cycles** — "save R5,000 in 4 months for school uniforms" runs alongside the main cycle. Members hit a tangible goal and re-up.
3. **Year-end bonus push** — November/December push for one-off extras to fund January expenses (school fees, restock).
4. **Annual contribution increase** — small (5-10%) inflation-linked increase. Easier than ad-hoc requests. Lock into constitution.
5. **Voluntary additional pots** — burial societies often add a "special fund" pot for catastrophic events. Contributors decide individually.

### Risky / avoid
- Forced contribution increases mid-cycle — generates resentment and exits
- Penalty-driven contribution-increase pressure — drives churn

## Formalisation path (when to)

Consider formalising into a registered cooperative (CIPC) when:
- Group consistently holds R50k+ in the kitty
- Members want loan facilities
- You're scaling to 50+ members
- Tax efficiency is becoming material (stokvels above certain interest thresholds may face SARS attention)

Don't formalise when:
- Group is < 18 months old
- Member trust is low
- Treasurer hasn't been stable for 12 months

## Spin-off / cycle splitting

When a group hits ~50 members, contribution administration becomes brittle. Consider:
- **Sub-cycles** — split into two parallel cycles (Cycle A: members 1-25, Cycle B: members 26-50) with shared admin
- **Spin-off groups** — most engaged 8-10 members start a sister group focused on a different goal (e.g. main = burial, spin-off = grocery)
- **Federated structure** — multiple groups, one umbrella admin layer (advanced)

## Anti-patterns to flag

If the diagnostic shows any of these, prioritise fixing before growing:
- > 30% of members miss contributions in any given month
- < 60% retention year-over-year
- 2+ unresolved disputes
- Treasurer has changed > 1× in the last year
- No documented constitution
- Group balance > R30k with no insurance / safety plan

## Key benchmarks (SA stokvels, 2026 estimates)

- Median member count: 12
- Median monthly contribution: R250-R500
- Median group lifespan: 4-6 years
- 1-year retention rate (good): 85%+
- 1-year retention rate (typical): 70%
- 1-year retention rate (struggling): < 55%
- On-time payment rate (good): 90%+
- Year-over-year contribution growth (healthy): 5-15% (tracks inflation + growth)
`;
