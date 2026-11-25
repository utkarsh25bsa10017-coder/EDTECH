# Prashnottar: plan

Last updated: 25 November 2026.

Prashnottar sells exam-practice Passes for four Hindi-belt government exams, **₹1,000 per exam**, through Meta ads on Instagram and Facebook. This file holds the plan: what we sell, how we build the questions, how we sell, the numbers, the ad campaigns, and what has to happen before launch.

## 1. The four exams

All four have buyers who can pay ₹1,000 and thin coverage from the big apps. About two-thirds of the material (general studies, reasoning, maths, Hindi, current affairs) is shared between them.

| Exam | Who takes it | Why it was picked |
| --- | --- | --- |
| BPSC TRE (Bihar teacher recruitment) | Graduates and B.Ed holders | Strongest buyers, repeat phases, thin coverage. **Launch exam.** |
| Bihar Daroga (BPSSC Sub-Inspector) | Graduates | High-status job, serious buyers |
| BPSC CCE Prelims | Graduates | Buyers already pay for coaching |
| UP SI (UP Police Sub-Inspector) | Graduates | Adds the biggest Hindi-belt state |

Left out: constable, Group D, SSC GD and Agniveer, where buyers won't pay ₹1,000; NORCET, which needs medical experts; UPPSC prelims, which is crowded. School boards (class 10/12) were dropped from the site; they may return later as a cheaper add-on sold through tuition centres.

Every subject of every exam is listed on the exam pages (`web/src/lib/syllabus.ts`) and in [`docs/existing-materials.md`](docs/existing-materials.md), section 2. Confirm the exact pattern in each official notification before building full mocks.

## 2. Product

A logged-in web app, not PDFs, so the material can't simply be forwarded on Telegram.

- **Practice mode:** questions by topic, answer and explanation straight after each attempt, weak-topic report.
- **Mock test:** works like the real computer-based exam: timer, section tabs, question palette, mark for review, auto-submit, score report by section and topic, full solutions.
- **Question paper:** laid out like an exam booklet (cover page, bilingual instructions, two columns), printable, with answer key. Branded as a Prashnottar practice paper, never as an official commission document.
- **Free tier:** one practice set per exam. It is the ad lead magnet and the search entry point.
- **Pass (₹1,000 per exam, one-time, one exam cycle):** full mock tests, topic-wise practice, solved past papers, weak-topic reports, every subject of that exam.
- **Protection (to build):** buyer's name as a watermark, one active session per account, no bulk download.

### How questions are made

1. **Past papers:** collect official papers and answer keys from the commissions; sort questions by topic to learn how often each topic appears and how hard it is.
2. **New questions:** Claude drafts original questions in the past-paper pattern, following the official syllabus and the standard books students use. Never copy or reword coaching books, apps or websites.
3. **Human review:** a subject reviewer checks every answer and the Hindi. Questions stay `status: "draft"` until reviewed.
4. **Assembly:** reviewed questions become practice sets and mock papers that match the official topic weights.

The materials aspirants already use (PYQ books, practice-set books, standard study books, online platforms) are mapped in [`docs/existing-materials.md`](docs/existing-materials.md).

## 3. Selling

Cold traffic rarely pays ₹1,000 to a new brand in one click, so we sell through a lead funnel:

1. A Meta ad on Instagram or Facebook offers a free solved practice set.
2. The person taps through to WhatsApp (click-to-WhatsApp ad) and gets the free set automatically.
3. Over 5–7 days they get a daily question, a short mock and the offer.
4. They pay through a payment link; the account unlocks straight away.

- **Price:** ₹1,000 per exam, sold separately. If buyers balk, test ₹599, or a discount on a second exam.
- **Organic:** daily question reels, "this came in the last paper" posts, a free Telegram channel leading to the app.
- **Trust:** free sample sets, a 7-day refund policy, real buyer testimonials once there are some.

## 4. Unit economics

Planning assumptions for Indian edtech ads, not measured data; the first test replaces them.

| Scenario | Cost per lead | Leads per ₹1 lakh | Lead → sale | Sales | Revenue at ₹1,000 | Return on ad spend |
| --- | --- | --- | --- | --- | --- | --- |
| Pessimistic | ₹35 | 2,850 | 1.5% | 43 | ₹43,000 | 0.4x |
| Realistic | ₹20 | 5,000 | 3% | 150 | ₹1,50,000 | 1.5x |
| Optimistic | ₹12 | 8,300 | 5% | 415 | ₹4,15,000 | 4.2x |

Take about 2% off revenue for the payment gateway, plus 18% GST once registered. Still unknown: reviewer cost per question, refund rate.

## 5. Ad campaigns

### First campaign: leads, not sales

Run lead campaigns while the paid content is built. It costs less, gives a real cost per lead before committing, and builds a WhatsApp list to sell to on launch day.

| Setting | Plan |
| --- | --- |
| Goal | Leads via click-to-WhatsApp; the free practice set is sent automatically |
| First exams | BPSC TRE and Bihar Daroga |
| Targeting | Bihar, ages 21–35, Hindi; Advantage+ audience seeded with interests like BPSC and government exam prep. UP for UP SI later |
| Budget | ₹1,000/day per exam for 10–14 days, about ₹20–30k for two exams |
| Ads per exam | 3–4: a "can you answer this?" question image, a 15-second reel of the mock test, a free-set offer, buyer stories later |
| Go/no-go | Cost per lead under ₹25 and lead → sale above 2% → scale and add Daroga, BPSC Prelims, UP SI |

### Ad creatives

Two reel formats per exam:

1. **"10-second challenge":** a real question from our free set, a countdown, then the answer and the free-set offer. Pulls comments and shares.
2. **Problem, then fix:** the aspirant who knows the material but freezes against the clock in the exam hall; our timed mock test with explanations is the fix; free first set via WhatsApp.

Tools:
- **ElevenLabs** (connected): Hindi voiceovers (ad and reel voices are available) and cinematic AI clips in 9:16 (Kling, Veo, Seedance).
- **Hindi text graphics:** rendered in the browser, because AI image models garble Devanagari.
- **Final assembly:** CapCut or ElevenLabs' own editor; this server can't merge audio and video into MP4.
- **Higgsfield:** not connected yet; add its MCP to use it.
- Check the credit cost before generating any video.

### Ad rules (Meta policy and trust)

- Never promise selection or guaranteed results.
- Never use BPSC, BPSSC or UP Police logos or imply official status.
- Don't frame ads as job vacancies: that falls under Meta's restricted Employment category, which removes age targeting.
- Grow budgets slowly on a new ad account; keep a backup account ready.

### Running and optimising the ads

Preferred route: **Meta Marketing API** with an access token for the ad account, so campaigns are created, measured and adjusted by script. More reliable than controlling a PC, and avoids security locks on automated browser activity.

Day to day: check cost per lead, click-through rate and cost per sale; pause losers, move budget to winners, launch new versions of what works. A daily 10-minute review together; Meta's algorithm does the minute-to-minute optimisation.

Safeguards:
1. A Meta account spending limit as a hard cap.
2. Changes allowed within the agreed daily budget; any budget increase needs the owner's yes.
3. The owner handles logins, two-factor codes and payment methods. Billing is never touched.
4. Every change goes in a log with its reason.

## 6. Risks and rules

| Risk | What happens | Rule |
| --- | --- | --- |
| Copyright | Takedowns, banned ad account | Only official past papers and our own new questions |
| Wrong answers | One viral complaint kills trust | Human review before anything goes live; fix reported errors within 24 hours |
| Piracy | Material spreads free on Telegram | Web app only, buyer watermark, one session per account |
| Ad account restriction | Ads stop mid-campaign | Slow budget growth, no selection promises, backup account |
| Pattern change | Mocks stop matching the real exam | Check each official notification and update within a week |
| Cheap rivals | Testbook and Adda247 undercut on price | Win on Bihar/UP focus, Hindi-first, exam-specific, built on past papers |
| Outdated law material | UP SI law questions use IPC/CrPC | Write all UP SI law content for BNS, BNSS and BSA (in force since July 2024) |

## 7. Status

Done:
- Website rebuilt around the four exams (`web/`): home, exam pages with full syllabus, practice mode, mock test, booklet-style paper, pricing at ₹1,000 per exam.
- One free 20-question practice set per exam, 80 questions, answer keys checked. Still `draft`, pending expert review.
- Materials list: [`docs/existing-materials.md`](docs/existing-materials.md).

Known issues:
- The four sets share a few questions (Kosi "Sorrow of Bihar", the MANGO code, the 2-6-12-20 series, one time-and-work problem). Replace before selling.
- Pricing terms on the site (one exam cycle, 7-day refund) need the owner's confirmation.
- `src/components/L.astro` has 5 pre-existing type errors.

## 8. Launch checklist

In order:

1. **Deploy the site** (Vercel or Netlify, free) and connect a domain.
2. **Payments:** create a payment link per exam (Razorpay, Cosmofeed or similar) and set `PUBLIC_CHECKOUT_URL_<EXAM>` (or `PUBLIC_CHECKOUT_URL` for all).
3. **Tracking:** add the Meta Pixel (and Conversions API) with Lead and Purchase events.
4. **WhatsApp:** a WhatsApp Business number with an automatic reply that sends the free set.
5. **Accounts and paywall:** login, Pass unlock, watermark, one session per account.
6. **Paid content for BPSC TRE:** full mocks and topic practice, reviewed by a subject expert.
7. **Review the free sets** and replace the shared questions.
8. **Meta setup:** Business account, ad account, payment method, linked Facebook page and Instagram account, spending limit.
9. **Lead test:** ₹1,000/day per exam for BPSC TRE and Bihar Daroga, 10–14 days.
10. **Go/no-go:** cost per lead under ₹25 and lead → sale above 2% → turn on sales, scale, add the other two exams.

Open questions for the owner: daily ad budget, WhatsApp Business number, payment provider, hosting choice and domain, Meta account status.
