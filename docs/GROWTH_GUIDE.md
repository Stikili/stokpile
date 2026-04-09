# Stokpile Growth & Distribution Guide

This file documents how to launch Stokpile to the public, get organic traffic,
and list it on app stores. Use it as a checklist when you're ready to go live.

---

## 1. SEO content (write 10 articles, rank in 6 months)

Create these as static pages or a simple blog (Markdown → HTML). Each one
targets a high-intent search query in SADC + Africa.

### Articles to write (in priority order)

| Title | Target keyword | Country | Length |
|---|---|---|---|
| How to start a stokvel in South Africa | "how to start a stokvel" | ZA | 1500 words |
| Stokvel rules: a complete guide for 2026 | "stokvel rules" | ZA | 1200 words |
| Burial society constitution template | "burial society constitution" | ZA | 1000 words + downloadable PDF |
| What is a chama? Kenya's savings groups explained | "what is a chama" | KE | 1500 words |
| How to run a grocery stokvel for year-end | "grocery stokvel" | ZA | 1000 words |
| VSLA vs stokvel vs SACCO: which is right for you? | "vsla vs stokvel" | ALL | 1400 words |
| 10 best stokvel apps in South Africa (2026) | "best stokvel app" | ZA | 1600 words |
| How to handle a member who stops paying | "stokvel member not paying" | ZA | 800 words |
| Tax rules for stokvel payouts in South Africa | "stokvel tax" | ZA | 1200 words |
| How to start a savings group in Kenya | "how to start chama" | KE | 1500 words |

### Where to publish

Three options, easiest first:

1. **Vercel + MDX**: drop articles in `/blog/` as `.mdx` files. Use Next.js or
   Astro. Renders fast, indexes well. ~30 min setup.
2. **Notion as CMS**: Notion supports public pages with custom domains via
   Super.so or Potion.so. Easiest writing experience.
3. **Substack**: Free, has its own discovery. Less SEO control but zero setup.

### SEO basics for each article

- Title tag: include target keyword + year ("Stokvel Rules in 2026")
- Meta description: 155 chars max, mention Stokpile naturally once
- H1 = title, then H2 sections
- Internal link: every article links to `stokpile.app` and at least one other article
- 1-2 images per article (alt text mandatory)
- Add FAQ section at the bottom — Google loves these and shows them in results

### Canonical link to Stokpile

Add this to every article footer:

> **Run your stokvel without the spreadsheets.** [Stokpile](https://stokpile.app)
> tracks contributions, payouts, meetings, and dependents — free for groups under 8
> members. Try it now.

---

## 2. App store listings

Stokpile is a PWA, so you don't need native code. You can wrap it for both stores:

### Google Play (Trusted Web Activity)

1. Sign up for a Google Play Console account ($25 one-off)
2. Use [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) to wrap the PWA:
   ```
   npm i -g @bubblewrap/cli
   bubblewrap init --manifest=https://stokpile.app/manifest.json
   bubblewrap build
   ```
3. Upload the resulting `.aab` to Play Console
4. Required assets:
   - 512×512 icon (already in `/public/icon-512.png`)
   - Feature graphic 1024×500 — design in Figma/Canva
   - 2-8 phone screenshots
   - Privacy policy URL — point to `/privacy` (already in app)
5. Category: Finance
6. Content rating: complete the questionnaire (your app has user-generated content)

### Apple App Store

Apple does NOT accept TWA wrappers. You need to use **PWABuilder** (Microsoft):

1. Go to [pwabuilder.com](https://www.pwabuilder.com/)
2. Enter `https://stokpile.app`
3. Click "Build My PWA" → iOS package
4. Download the Xcode project
5. You'll need a Mac and an Apple Developer account ($99/year)
6. Upload via Xcode or Transporter

**Reality check**: iOS App Store review is strict. Stokpile may be rejected because
Apple sometimes argues PWAs duplicate Safari functionality. Consider deferring iOS
until you have native screens for the most-used flows.

### Recommended: skip stores initially

For SADC, **most users discover apps via WhatsApp shares, not stores**. Focus on:

1. Public landing page with PWA install prompt (already shipped)
2. Referral system (already shipped)
3. SEO articles (above)
4. Direct WhatsApp outreach to community leaders (burial society chairpersons,
   church group treasurers, savings club admins)

Stores can wait until you have ~1,000 users.

---

## 3. Pre-launch checklist

- [ ] Set up real `support@stokpile.app` and `privacy@stokpile.app` email addresses
- [ ] Set up real WhatsApp Business number (replace placeholder in HelpDialog)
- [ ] Register as Information Officer with the SA Information Regulator (POPIA)
- [ ] Create Twitter / Instagram / LinkedIn accounts (for credibility, even if dormant)
- [ ] Add real testimonials to landing page (interview 3-5 beta users)
- [ ] Take 5 marketing screenshots: dashboard, contributions, rotation, members, mobile
- [ ] Set up Plausible analytics (set `VITE_PLAUSIBLE_DOMAIN` env var)
- [ ] Set up Sentry error tracking (set `VITE_SENTRY_DSN` env var, install `@sentry/browser`)
- [ ] Test on a real low-end Android phone (use Lite Mode)
- [ ] Test offline mode end-to-end
- [ ] Confirm SMS short code is configured with Africa's Talking
- [ ] Soft launch to 10 beta groups before any paid marketing

---

## 4. Marketing channels (cheapest first)

| Channel | Cost | Effort | Best for |
|---|---|---|---|
| WhatsApp groups | Free | High | Burial societies, churches |
| SEO articles | Free | High | Long-term organic |
| Facebook groups (stokvel-related) | Free | Medium | Community building |
| TikTok demo videos | Free | Medium | Younger audience |
| Radio interviews (local stations) | Free | Medium | Older audience, SA + KE |
| Paid Facebook/Instagram ads | $200/mo | Low | Targeting by country + age |
| Paid Google Search ads | $300/mo | Low | High-intent buyers |
| Influencer partnerships | $500-2000 | Medium | Trust signal |

**Rule of thumb**: spend nothing on paid until you have product-market fit.
You'll know you have it when 30%+ of your signups come from referrals.
