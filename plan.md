# Prashnottar: plan

Last updated: 27 November 2026. Launch target: **January 2027**.

Prashnottar sells exam-practice packs for Hindi-belt government exams: question banks built from past-paper (PYQ) analysis, mock tests that work like the real exam, a most-probable question paper, and fast-track sets for the last 2–3 months before an exam. It is sold through Meta ads (Instagram and Facebook) to a **landing page**, with WhatsApp follow-up. Technical contracts live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 1. Exams

Chosen by one rule: **revenue per lead (conversion × average order) must beat cost per lead.** At a realistic ₹25–35 per lead, only exams whose buyers pay ₹499+ can run on paid ads. Cheap, huge exams only pay through free (organic) channels.

| Track | Exams | Role |
|---|---|---|
| **Core (paid ads)** | BPSC TRE 4.0, BPSC CCE Prelims, MPPSC Prelims, RAS Prelims | Profit engines |
| **Fillers** | Bihar STET, CTET (both bundled with TRE), CG TET | Fill the calendar, raise order value |
| **Organic only** | SSC CGL/CHSL, UPSC, RRB, UKPSC, UP B.Ed JEE, UPSSSC PET | Reels, Telegram, YouTube; no ad spend |
| **When notified** | UP TGT/PGT, BPSC AEDO, Bihar Daroga, UP SI, BSSC Inter, UP Police | Add only once a real exam date exists |
| **Dropped** | Bihar B.Ed CET (pool shrinking: 1.9 → 1.1 lakh), Bihar D.El.Ed (dates inconsistent) | |

Content structure: **one shared General Studies bank** (history, polity, geography, economy, science, current affairs) **plus a GK module per state** (Bihar, MP, Rajasthan, Chhattisgarh) and a **pedagogy bank** shared by TRE, STET, CTET and CG TET. Every new state reuses most of the bank. Each state needs its own subject reviewer.

### 2027 calendar (all dates tentative; confirm with official notices)

| Months | Paid ads | Notes |
|---|---|---|
| Jan–Feb | Launch; TRE 4.0 early bird; collect leads | MPPSC 24 Jan is too close to sell for; collect leads for May |
| Mar–Apr | TRE 3-month fast-track; MPPSC (2 May) 2-month fast-track; TRE + CTET and TRE + STET bundles | |
| May | MPPSC prelims (2 May); TRE 2-month fast-track | |
| Jun–Jul | TRE 4.0 final push (exam about July); Bihar STET if held | |
| Aug–Sep | CG TET (26 Sep); BPSC 73rd 3-month early bird | |
| Oct–Dec | BPSC 73rd prelims; RAS prelims; MPPSC Jan 2028 early bird; CTET December session | |

Exams are mostly pen-paper OMR, so the app offers an OMR practice mode as well as the computer-based mock test.

## 2. Products and prices

| Product | Price |
|---|---|
| Free set (20 questions per exam) | Free: the lead magnet |
| Most-probable set | ₹249 (impulse buy, sold straight from the landing page) |
| 2-month fast-track | ₹499 |
| 3-month fast-track / full Pass (all mocks, practice, PYQs, AI guidance) | ₹999 |
| TRE + CTET bundle, TRE + STET bundle | ₹799 |

"Most probable" means **chosen by topic weight from past-paper analysis**, never "these exact questions will come". Before any accuracy claim appears in an ad, backtest it: build the set from older papers, measure coverage on the latest real paper, and quote only that measured number.

## 3. How questions are made

1. **Collect** official past papers and answer keys from the commission sites (`scraper/`, with OCR for scanned Hindi papers).
2. **Tag** every question by subject, topic, type and difficulty; **analyse** topic weights and trends (`pipeline/analyze.py`).
3. **Generate** original questions in the past-paper pattern, about **400 per exam**, up to 20% as marked variants (same concept, changed numbers or framing). Never copy coaching books, apps or websites. Coaching material may guide the analysis (free exam analyses, topic lists) but never goes into the product.
4. **Filter agent:** deterministic checks (`pipeline/validate.py`: schema, duplicates, coverage) plus a Claude reviewer (`pipeline/review.py`: correct key, single best answer, ambiguity, outdated facts like IPC instead of BNS, language). It can reject or suggest fixes, but **only a human subject expert marks a question reviewed.**
5. **Assemble** (`pipeline/assemble.py`): a free set, full mocks in each exam's pattern, a sample paper, and the most-probable paper; printable PDFs (`web/scripts/pdf.mjs`).

The paid bank and papers stay **out of git** (the repo is public) and are served only by the API.

## 4. Funnel (decided)

**Landing page is the main funnel.** Ad → free questions start in one tap (no sign-up) → score → ₹249 most-probable set by UPI. The score screen also offers "full solutions and the next set on WhatsApp" (phone + consent).

- **WhatsApp is the follow-up layer, run by n8n:** a 72-hour sequence (free set link, daily question, mini-mock, offer), the ₹999 upsell to ₹249 buyers, and support with handover to a human. Opt-out with STOP. Only people who contacted us or gave consent get messages.
- **Click-to-WhatsApp ads are the challenger ad set.**
- **No Instant Forms** (auto-filled, low-quality leads).

Why the landing page leads: the product is the page (trying it is the pitch), it needs the fewest taps, Meta can optimise for real purchases through the Pixel, every visitor can be retargeted, and attribution is clean. WhatsApp wins on personal follow-up, so it handles that.

**Test design:** two ad sets, landing page vs click-to-WhatsApp, with the same 5 ads and equal budgets. Judge early on cost per completed free set and cost per number captured; call a winner only on a 2× difference or after about 10–15 sales per ad set. Small tests are mostly noise, so don't kill the challenger after one weak week. Then run angle tests (challenge, data/repeat, countdown, pain) on the winning destination.

## 5. Ads

The full creative library, scripts and WhatsApp messages are in [`adscript.md`](adscript.md).

- **Rules (CCPA 2024 coaching-ad guidelines and Meta policy):** no guarantees, "100%" or rank promises; no false urgency (real exam countdowns and real offer end dates only); no commission logos or implied official status; nothing that sounds like a leaked paper; don't frame ads as job vacancies; real, consented testimonials only.
- **Production:** ElevenLabs for Hindi voiceovers and **Higgsfield** for AI video B-roll (**API keys coming from the owner**; store them in the server `.env` as `ELEVENLABS_API_KEY` and `HIGGSFIELD_API_KEY`); Hindi text graphics rendered in the browser (AI image models garble Devanagari); final edit in CapCut; check credit cost before generating any video.
- **Scaling:** don't raise spend above ₹10k a month until cost per lead is under about ₹30. Run ads hardest in the 60–90 days before each exam.

## 6. App and tech

- **Website and app UI:** Astro (`web/`). Clean glass UI: flat neutral background, frosted panels, one solid accent, no gradients or decorative AI styling, large tap targets, thumb-reachable actions, keyboard shortcuts in tests.
- **Native app (Rust):** a Tauri 2 shell (`app/`) for **Android, iOS and Windows**, bundling the same UI. Builds run on GitHub Actions; this server has no compiler, and iOS needs a Mac runner. **Payments stay on the web:** Google Play charges 11–26% on Indian in-app sales even with alternative billing, and Apple requires its own in-app purchase.
- **API server (Rust, axum + SQLite):** auth (admin and students), leads, attempts, paid papers behind the paywall, the guidance chatbot, WhatsApp bot replies for n8n, and the admin panel. Runs on this server in Docker.
- **Automation:** n8n on this server (Docker), workflows in `automation/n8n/`.
- **Guidance chatbot:** on the site and app, answers about packs, dates and study planning from our own facts (Claude API; key coming from the owner). The teaching AI stays in the app, not on WhatsApp: Meta's WhatsApp rules allow business sales and support bots, not general-purpose AI assistants.
- **Retry rule for every external API:** on transient errors, wait 10 seconds and retry in a loop; on permanent errors (bad key, 4xx), stop and log. Details in `docs/ARCHITECTURE.md`.
- **Admin:** the username and password come from the server `.env`, never from git. Change the default password before launch.

## 7. Unit economics

Planning assumptions, not measured data. The first test replaces them.

| Item | Monthly |
|---|---|
| Claude Max (content building) | ₹10,000 (drop to Pro, about ₹2k, after the bank is built) |
| Ads | ₹10,000 + 18% GST = ₹11,800 |
| Payment gateway | about 2% of revenue |
| WhatsApp (messages beyond the free window, provider if used) | about ₹500–2,500 |
| Subject reviewer | about ₹5–10k per exam, one-time |

- Realistic cost per lead: ₹40–80 untested, ₹25–40 after tuning.
- Break-even cost per lead at 5% conversion: about ₹33 for a ₹800 average order, about ₹25 for ₹600.
- **Month 1 will lose roughly ₹15–20k.** Profit by month 2–3 needs cost per lead near ₹25, 5–6% conversion, about ₹700 average order (₹249 entry plus upsells), free organic leads, and Claude dropped to Pro.

## 8. Risks and rules

| Risk | Rule |
|---|---|
| Copyright takedowns, banned ad account | Only official past papers and our own new questions |
| Wrong answers | Human review before anything is sold; fix reported errors within 24 hours |
| Piracy | Paid content only through the API; buyer watermark and one session per account (to build); bank kept out of the public repo |
| Ad account restriction | Follow the ad rules; grow budgets slowly; keep a backup account |
| Pattern change | Check each official notification; update mocks within a week |
| Cheap rivals (Testbook, Adda247, PW) | Win on exam-specific, Hindi-first, PYQ-built content and the fast-track timing |
| Exam dates slip | Spread across exam bodies (BPSC, MPPSC, RPSC, CBSE, CG Vyapam) |

## 9. Launch checklist (January 2027)

**Owner:**
1. New SIM for WhatsApp Business; domain; Facebook Page and Instagram business account; Meta Business account and ad account with a spending limit.
2. Udyam registration; Razorpay account; business name, address and support email for the policy pages.
3. API keys: **Meta WhatsApp Cloud API**, Anthropic, Razorpay, **ElevenLabs**, **Higgsfield**, Meta Pixel and Conversions API.
4. A subject reviewer per state (Bihar first, then MP).
5. Confirm prices, the 7-day refund policy and the pass validity.

**Build:**
1. Question bank v1 (about 400 per exam), the filter agent, papers and PDFs.
2. Website and app: landing page, practice, mock test with OMR mode, score screen with number capture, checkout, login and paywall, admin, chatbot, policy pages.
3. API server and n8n follow-up workflows on this server.
4. App builds for Android, Windows and iOS through GitHub Actions.
5. Ad creatives produced from `adscript.md`; the landing page vs click-to-WhatsApp test on TRE 4.0.
6. MP module by March, for the 2 May MPPSC prelims.
