# Prashnottar: ad creative library

Last updated: 27 November 2026. Owner of this file: whoever runs Meta ads. Product, exams and funnel come from [`plan.md`](plan.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); prices and exam dates below supersede the older ₹1,000 figures in `plan.md` and on the current pricing page.

**How to use this file:** read the compliance checklist, then the guide (hooks, naming, test plan). Each exam section has a reference table (dates, price, WhatsApp keyword, disclaimers) followed by the ads. Every ad ships in two copies, one per destination (`_lp` and `_wa`). Anything in `[square brackets]` is a placeholder: fill it with real data or don't run the ad.

---

## 0. Compliance checklist (run this on every ad before upload)

Sources: CCPA *Guidelines for Prevention of Misleading Advertisement in Coaching Sector, 2024* and Meta Advertising Standards. If an ad fails one line, it doesn't go live.

| # | Rule | Banned (examples) | Use instead |
|---|---|---|---|
| 1 | **No result promises.** No guaranteed selection, rank, marks or "pass". | "guaranteed", "100%", "selection pakka", "पक्का सिलेक्शन", "टॉप रैंक दिलाएंगे", "पास होने की गारंटी" | "अभ्यास करें", "अपनी कमज़ोरी पहचानें", "टाइम के साथ प्रैक्टिस" |
| 2 | **No false urgency or fake scarcity.** Only real exam-date countdowns and real offer end dates. Tentative dates are labelled "संभावित" and never counted down in days. | "सिर्फ़ आज", "आख़िरी 10 सीटें", "ऑफ़र ख़त्म होने वाला है" (with no real end date), fake timers | "परीक्षा: 24 जनवरी 2027 (संभावित)", "ऑफ़र [real end date] तक" |
| 3 | **No official look.** No commission logos, seals, colours that copy official notices, "official", "सरकारी", or wording that implies we are BPSC / MPPSC / RPSC / BSEB / CBSE / CG Vyapam. Exam names are fine as plain text. | Logos, "BPSC द्वारा मान्य", "ऑफ़िशियल मॉक" | Every primary text ends with the exam's non-affiliation line `{D-AFF}` |
| 4 | **Nothing that sounds leaked.** | "इस बार यही आएगा", "पेपर आउट", "लीक", "exact सवाल", "पेपर से पहले पेपर" | "पिछले पेपरों के विश्लेषण पर आधारित", "संभावित टॉपिक" |
| 5 | **"Most probable" always carries its basis.** Any mention of the ₹249 most-probable set shows `{D-PROB}` on screen (≥3 seconds, readable size, same language as the claim) and in the primary text. | "most probable" with no basis | `{D-PROB}`: "पिछले वर्षों के प्रश्नपत्रों के विश्लेषण पर आधारित। असली पेपर के सवाल अलग हो सकते हैं।" |
| 6 | **Coverage and frequency numbers stay `[X]`** until the past-paper analysis exists and is saved with the ad. No invented percentages. | "90% सवाल हमारे सेट से" | "यह टॉपिक पिछले [N] पेपरों में [X] बार पूछा गया" (filled from the analysis sheet) |
| 7 | **Not a job ad.** Meta puts vacancy-style ads in the Employment category (no age targeting). Talk about the exam and practice, never posts, seats or salary. | "भर्ती", "वैकेंसी", "[N] पद", "सरकारी नौकरी पाएं", "सैलरी", "apply now" | "BPSC TRE 4.0 परीक्षा की तैयारी", "मॉक टेस्ट" |
| 8 | **No fake testimonials.** Testimonial and buyer-story formats are marked *use only with real, consented buyers*: real name, real score, written consent saved, no paid actors, no AI faces. CCPA also bars using a successful candidate's name or photo without written consent given after the result. | AI-generated "students", stock photos captioned as toppers | Product screens, text graphics, the real buyer on camera with consent on file |
| 9 | **No personal-attribute call-outs** (Meta). Don't assert or imply the viewer's situation. | "क्या आप बेरोज़गार हैं?", "तुम फेल हो गए थे ना?", "घरवाले ताने मारते हैं?" | Describe the situation in third person or in general: "पढ़ा सब है, पर पेपर में टाइम कम पड़ता है, ऐसा बहुत से aspirants के साथ होता है" |
| 10 | **Post-exam proof only after a real exam, with real numbers**, and a public page showing the comparison. These ads are marked *only after a real exam, with real numbers*. | Proof ads before the exam, rounded-up numbers | "[exam] [date] के पेपर में [X] सवाल हमारे प्रैक्टिस सेट के टॉपिक से मिले: पूरी लिस्ट [link] पर" |
| 11 | **Free means free.** The free test needs no payment. If a phone number is asked, say so. | "फ्री" when a payment step is required | "फ्री टेस्ट, स्कोर तुरंत" |
| 12 | **Show only what exists.** Every screen in an ad is the real product. If a feature (OMR sheet, Hindi/English switch, weak-topic report) isn't live yet, the ad that shows it waits. | Mock-ups of unbuilt screens | Screen recordings of the live app |
| 13 | **Price claims are exact.** ₹249 / ₹499 / ₹799 / ₹999 as listed; a comparison price (coaching) needs a real, publicly listed source saved with the ad; no "₹X की बचत" unless the saving is real. | "कोचिंग ₹20,000 की" with no source | "कोचिंग टेस्ट-सीरीज़ ₹[Y]*" with the footnote and source kept on file |
| 14 | **Questions in ads are reviewed.** A question shown in an ad comes from a free set with `status: "reviewed"` and its answer double-checked. (The TRE and CCE questions below are from the current free sets, still `draft`: get them reviewed first.) | Unreviewed questions | Reviewed free-set questions |
| 15 | **AI disclosure.** AI-generated B-roll is fine; turn on Meta's AI label where Meta asks for it, and never present an AI person as a real student. | AI "student" saying "मेरा सिलेक्शन हुआ" | AI B-roll of a desk, clock, empty corridor |

### Disclaimers (paste in place of the tokens)

| Token | Text |
|---|---|
| `{D-PROB}` | पिछले वर्षों के प्रश्नपत्रों के विश्लेषण पर आधारित। असली पेपर के सवाल अलग हो सकते हैं। *(Based on analysis of past papers. Actual exam questions may differ.)* |
| `{D-AFF}` BPSC TRE / CCE | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, BPSC से इसका कोई संबंध नहीं। |
| `{D-AFF}` MPPSC | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, MPPSC से इसका कोई संबंध नहीं। |
| `{D-AFF}` RAS | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, RPSC से इसका कोई संबंध नहीं। |
| `{D-AFF}` Bihar STET | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, BSEB से इसका कोई संबंध नहीं। |
| `{D-AFF}` CTET | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, CBSE से इसका कोई संबंध नहीं। |
| `{D-AFF}` CG TET | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, CG व्यापम से इसका कोई संबंध नहीं। |
| `{D-DATE}` | तारीख़ संभावित है; आधिकारिक सूचना देखें। *(Date is tentative; check the official notice.)* |

---

## 1. Guide

### 1.1 Funnel and the two CTAs

```
Meta ad ──► Landing page (main)  ──► free questions in one tap ──► score ──► ₹249 most-probable set (UPI)
        │                                         └── leaves number ──► WhatsApp follow-up (72 h)
        └─► Click-to-WhatsApp (challenger) ──► bot sends free set link ──► same landing/test ──► ₹249
```

No Instant Forms. Every ad has two CTA variants; the creative is the same, only the end card, the last voiceover line and the button change.

| Destination | Spoken + end-card CTA | Meta button | Link / prefill | Ad name suffix |
|---|---|---|---|---|
| Landing page | **"अभी फ्री टेस्ट दें"** *(Take the free test now)* | Learn more | `https://[domain]/[exam-slug]?utm_source=meta&utm_medium=paid&utm_campaign=[campaign]&utm_content=[ad name]` | `_lp` |
| Click-to-WhatsApp | **"WhatsApp पर '[KEY]' लिखें"** *(Write '[KEY]' on WhatsApp)*, e.g. 'TRE' | Send WhatsApp message | Prefilled message = the keyword, so one tap sends it; lead saved with `source: "ctwa"` | `_wa` |

Keywords: `TRE`, `CCE`, `MPPSC`, `RAS`, `STET`, `CTET`, `CGTET`, bundles `TRE CTET` and `TRE STET`. The WhatsApp bot routes on the keyword.

In the ad tables below, **CTA** shows both lines. The voiceover's last line uses the landing-page wording; for the `_wa` copy, swap in the WhatsApp line (same timing).

### 1.2 Hook principles for this audience

Hindi-belt aspirants, 21–35, on phones, scrolling Reels and Facebook between study sessions. They've seen every coaching ad; they stop for a real question, a real number, or their own problem said out loud.

1. **Win the first 2 seconds.** Open on the question, the number or the problem, never the logo. The first frame must work as a still with the sound off. No intro, no "नमस्कार दोस्तों".
2. **Hindi captions burned in.** Most people watch muted. Every spoken word appears on screen in Devanagari, large (the line must be readable at arm's length), high contrast, max ~6 words per line. Don't rely on auto-captions.
3. **9:16, full screen.** Reels and Stories at 1080×1920. Keep text out of the top ~14% and bottom ~35% (Reels UI covers them). Static images: 1080×1350 (4:5) for feed plus a 1080×1920 version. Carousel cards: 1080×1350.
4. **Look native, not like an ad.** Phone screen recordings, a hand holding a phone, plain text on a dark or paper-white background, a pen on an answer sheet. No glossy studio look, no stock "happy students".
5. **Show the real mock-test screen.** Timer running, question palette, the score report, the explanation after an answer. This is the proof that the product exists and the best visual we have.
6. **One ad, one message, one CTA.** One question, or one number, or one problem. One button.
7. **Talk like them.** "PYQ", "mock", "score", "topic", "revision", "negative marking" are normal words for this audience; use them in Devanagari or Roman as people actually type them. Bihar ads can lean on Bihar references (Patna, Champaran, Vikramshila), MP ads on MP, Rajasthan ads on Rajasthan.
8. **Numbers in the voiceover are written as words** so the voice reads them right: ₹249 = "दो सौ उनचास रुपये", ₹499 = "चार सौ निन्यानवे", ₹799 = "सात सौ निन्यानवे", ₹999 = "नौ सौ निन्यानवे".
9. **Respectful, never shaming.** Talk about the problem, not the person (checklist rule 9).

### 1.3 Angles and formats

| Angle code | Angle | What it does |
|---|---|---|
| `quiz` | Question challenge: "10 सेकंड में जवाब दें" | A real free-set question, countdown, answer + one-line explanation. Pulls comments and shares. |
| `repeat` | Data / repeat: "यह टॉपिक [X] बार पूछा गया" | Past-paper frequency from our analysis. `[X]` until the analysis exists. |
| `count` | Real countdown / fast-track | Real exam date; days counted only once the date is officially notified. Sells ₹499 (2-month) or ₹999 (3-month) fast-track. |
| `pain` | Pain → solution | "Knows the material, runs out of time"; "studies all day, has no idea where they stand". Fix: timed mock + score + weak topics. |
| `skip` | Skip-list: "इन टॉपिक पर कम समय दें" | Topics rarely asked in past papers, from our analysis. Says "less time", never "skip entirely". |
| `price` | Price contrast vs coaching | ₹249 vs a sourced coaching price, or vs everyday spending. No brand names. |
| `omr` | OMR / time-pressure practice | Full-length timed paper, the exam-hall clock, bubble-filling time. |
| `bi` | Bilingual reach | Questions in Hindi and English, one tap to switch. For Hindi-medium and English-medium aspirants alike. |
| `proof` | Post-exam proof | *Only after a real exam, with real numbers.* |

| Format code | Format | Notes |
|---|---|---|
| `r15` | 15-second reel | Hook 0–2 s, payload, CTA last 3 s |
| `r30` | 30-second reel | Hook 0–3 s, problem, product demo, CTA last 4 s |
| `img` | Static image | One headline, one visual, disclaimer strip at the bottom |
| `car` | Carousel | 3–5 cards; card 1 is the hook, last card is the CTA |

### 1.4 Naming convention

`exam_angle_format_hookNN_dest`, all lower case, underscores between parts, hyphens inside a part.

| Part | Values |
|---|---|
| `exam` | `tre`, `cce`, `mppsc`, `ras`, `stet`, `ctet`, `cgtet`, `tre-ctet`, `tre-stet` |
| `angle` | `quiz`, `repeat`, `count`, `pain`, `skip`, `price`, `omr`, `bi`, `proof` |
| `format` | `r15`, `r30`, `img`, `car` |
| `hookNN` | Two-digit hook number, unique within the exam (`hook01` … `hook15`). A new hook on the same body gets a new number. |
| `dest` | `lp` (landing page) or `wa` (click-to-WhatsApp) |

Example: `tre_quiz_r15_hook01_lp` and `tre_quiz_r15_hook01_wa` are the same creative sent to the two destinations. The full ad name also goes in `utm_content`, so a sale on the landing page traces back to the ad. Campaigns: `[exam]_[objective]_[yyyymm]`, e.g. `tre_sales_202612`; ad sets: `[exam]_[dest]_[test]`, e.g. `tre_lp_desttest`.

### 1.5 Test plan

All decisions use **cost per ₹249 sale**, counting sales within 7 days of the click on either path (landing purchase via Pixel + Conversions API; WhatsApp-assisted purchase via the lead's `source` field and the payment record). Cost per lead and click-through rate are early warnings, not the verdict.

**Step 1: destination test.** `plan.md` and earlier notes call this the 3-destination test. With Instant Forms ruled out it runs with two live arms; if the owner wants a third, the candidate is "landing page optimised for Lead (number left) instead of Purchase", same 5 ads, same budget. *(Owner to confirm.)*

| Setting | Arm A: landing page | Arm B: click-to-WhatsApp |
|---|---|---|
| Ads | The same 5: `quiz_r15_hook01`, `quiz_img_hook02`, `repeat_r30_hook04`, `pain_r30_hook08`, `price_img_hook11` | Same 5, `_wa` versions |
| Objective | Sales, optimised for Purchase | Engagement → messages (or Sales with WhatsApp as the destination, if available on the account) |
| Budget | Equal, e.g. ₹1,000/day per arm (plan.md's ₹1,000/day per exam) | Equal |
| Audience | Same: target state(s), 21–35, Hindi, Advantage+ audience seeded with exam-prep interests | Same |
| Exam | Launch exam: BPSC TRE per plan.md. MPPSC has the nearest real date (24 Jan 2027), so the owner may prefer to run it there. | Same |
| Length | 10–14 days, or until each arm has [30] sales, whichever comes first | Same |
| Winner | Lower cost per sale. If within 15% of each other, keep the landing page (main path, simpler to measure) and keep WhatsApp at ~20% of budget as the challenger. | |

**Step 2: angle tests on the winning destination.** One ad set per angle (equal budgets, so Meta can't starve an angle in week one), 3 ads per angle, in this order: `quiz` vs `pain` vs `repeat`; then `count` vs `price` vs `skip`; then `omr` vs `bi`. The winning angle gets new hooks (new `hookNN`), not a new angle. `proof` joins only after the exam.

**Kill and scale rules.** From plan.md: check cost per lead, click-through rate and cost per sale daily; pause losers, move budget to winners, launch new versions of what works; grow budgets slowly on a new ad account; any budget increase needs the owner's yes; the Meta account spending limit is the hard cap; log every change with its reason. plan.md's go/no-go (cost per lead under ₹25 and lead → sale above 2%) was set for a ₹1,000 product; for the ₹249 entry product it is translated to cost per sale:

| Rule | Threshold (starting values, owner to confirm) |
|---|---|
| Break-even cost per sale, front end | ≈ ₹205 (₹249 less 18% GST if the price includes it, less ~2% gateway). Raise the target once the ₹249 → ₹999 upsell rate is measured: allowable cost = ₹205 + (upsell rate × net upsell revenue). |
| Early warning (per ad, after ~₹500 spend) | Link click-through under 0.8% or 3-second hook rate under 25% → replace the hook, keep the body |
| Kill an ad | Spent 2× target cost per sale with no sale, or cost per sale above 1.5× target after 3 days |
| Kill a destination | Loses step 1 by more than 15% on cost per sale |
| Scale | Cost per sale under target for 3 days in a row → ask the owner, then raise budget by up to 20% at a time, no more than every 3 days |
| Refresh | Frequency above 3 or cost per sale up 30% week on week → new hooks from the same angle |
| plan.md lead check | Cost per lead under ₹25 and lead → sale above 2% still apply to the WhatsApp list and the WhatsApp arm |

### 1.6 Testimonial template (gated)

*Use only with real, consented buyers.* Written consent on file (name, photo/video, score, usage in ads, date), the buyer's own words, no script beyond prompts, no AI faces, no paid actors. Talk about practice, not selection.

| Field | Copy |
|---|---|
| Hook | "[Name], [district]: '[their words about the mock test or timing]'" |
| On-screen text | "[Name] का मॉक स्कोर: [real first score] → [real later score]" (only real attempt data from their account) |
| Visual | The buyer on their own phone camera, then their real score report (with permission) |
| Primary text | "[Name] ने [N] मॉक दिए। उनके अपने शब्दों में: '[quote]'. नतीजे हर किसी के अलग होते हैं। {D-AFF}" |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर '[KEY]' लिखें" |

---

## 2. Core exams (paid ads)

Questions shown in TRE and CCE ads come from the current free sets (`web/src/data/papers/<exam>/set-01.json`); they need review before use (checklist rule 14). MPPSC, RAS and the filler exams have no free set yet: their ad questions are drafted here with answers, and must go into that exam's reviewed free set before the ad runs, so the landing page shows the same question.

### 2.1 BPSC TRE 4.0

| Item | Value |
|---|---|
| Exam date | About July 2027 (tentative) → always "संभावित जुलाई 2027" + `{D-DATE}`; day countdown only after the official notice |
| Landing slug | `/bpsc-tre` |
| WhatsApp keyword | `TRE` |
| Offers | Free test → ₹249 most-probable set → ₹499 2-month / ₹999 3-month fast-track or full Pass. Bundles with CTET / STET at ₹799 (section 3) |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, BPSC से इसका कोई संबंध नहीं। |
| Say / don't say | Say "BPSC TRE 4.0 परीक्षा", "शिक्षक परीक्षा की तैयारी". Don't say "शिक्षक भर्ती", "वैकेंसी", "पद" (checklist rule 7) |

#### TRE-01 · Question challenge · 15 s reel
`tre_quiz_r15_hook01_lp` · `tre_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"TRE वालों, 10 सेकंड में बताओ: 'सदैव' का संधि-विच्छेद?"**<br>*TRE aspirants, 10 seconds: what's the sandhi split of 'sadaiv'?* |
| On-screen text | "'सदैव' का सही संधि-विच्छेद?" · A) सद् + ऐव B) सदा + एव C) सदै + व D) सदा + इव · timer 10 → 0 · "जवाब: B) सदा + एव (आ + ए = ऐ, वृद्धि संधि)" · end card: "ऐसे सवाल, टाइमर के साथ: फ्री" |
| Voiceover | **0–2 s** "BPSC TRE की तैयारी? दस सेकंड, एक सवाल।"<br>**2–10 s** (silence, clock ticking) "सदैव... संधि-विच्छेद?"<br>**10–12 s** "जवाब: B, सदा प्लस एव। आ और ए मिलकर ऐ, वृद्धि संधि।"<br>**12–15 s** "ऐसे ही सवाल टाइमर के साथ। अभी फ्री टेस्ट दें।" |
| Visual | Screen recording of the real question screen in practice mode; a big 10-second countdown ring rendered as a text graphic on top; at 10 s tap option B, the app's green tick and explanation appear. End card: phone showing the test start screen. |
| Primary text | 10 सेकंड में जवाब आया? कमेंट में अपना ऑप्शन लिखो। ऐसे ही सवाल, असली पेपर जैसे टाइमर के साथ, फ्री टेस्ट में: एक टैप में शुरू, स्कोर तुरंत। {D-AFF} |
| Headline | TRE 4.0 का फ्री टेस्ट दें |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-02 · Question challenge · Static image
`tre_quiz_img_hook02_lp` · `tre_quiz_img_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"RTE 2009: प्राइवेट स्कूल में कमज़ोर वर्ग के बच्चों के लिए कितनी सीटें?"**<br>*RTE 2009: how many seats in private schools for children from weaker sections?* |
| On-screen text | Question · A) 10% B) 15% C) 20% D) 25% · "जवाब कमेंट में पिन है" · bottom strip: "TRE 4.0 · फ्री टेस्ट" |
| Voiceover | — |
| Visual | A hand holding a phone showing this question on the real app screen, plain desk background. Question text re-set large as a browser-rendered Hindi graphic above the phone so it reads in the feed. |
| Primary text | बाल विकास और शिक्षाशास्त्र का बार-बार दिखने वाला सवाल-टाइप। आपका जवाब? कमेंट करो, फिर फ्री टेस्ट में ऐसे और सवाल हल करो, हर जवाब के साथ explanation। {D-AFF}<br>*Pinned comment:* "जवाब: D) 25%। RTE अधिनियम 2009, धारा 12(1)(c)।" |
| Headline | आपका जवाब A, B, C या D? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-03 · Question challenge · Carousel
`tre_quiz_car_hook03_lp` · `tre_quiz_car_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"चंपारण का ये सवाल बहुतों को उलझा देता है"**<br>*This Champaran question trips up a lot of people* |
| On-screen text | **Card 1:** "गांधी जी को चंपारण आने के लिए किसने मनाया था?" **Card 2:** A) डॉ. राजेंद्र प्रसाद B) ब्रजकिशोर प्रसाद C) मज़हरुल हक़ D) राजकुमार शुक्ल · "जवाब अगले कार्ड पर →" **Card 3:** "जवाब: D) राजकुमार शुक्ल। नील किसानों की बात लेकर 1916 के लखनऊ कांग्रेस अधिवेशन में गांधी जी से मिले; सत्याग्रह 1917 में।" **Card 4:** "बिहार GK + बाल विकास + हिंदी: पूरा फ्री टेस्ट, स्कोर तुरंत" + CTA |
| Voiceover | — |
| Visual | Cards 1–3: paper-white background, dark text, one small line-art of an indigo plant (browser-rendered, no photos of real people). Card 4: real screenshot of the score report. |
| Primary text | बिहार GK में चंपारण हर बार किसी न किसी रूप में दिखता है। स्वाइप करके जवाब चेक करो, फिर पूरा फ्री टेस्ट दो। {D-AFF} |
| Headline | स्वाइप करो, जवाब देखो |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-04 · Data / repeat · 30 s reel
`tre_repeat_r30_hook04_lp` · `tre_repeat_r30_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"TRE के पिछले पेपर छाँटे: ये टॉपिक [X] बार पूछा गया"**<br>*We sorted past TRE papers: this topic was asked [X] times* |
| On-screen text | "TRE 1.0 · 2.0 · 3.0: हर सवाल टॉपिक-वाइज़" · "[टॉपिक]: [X] सवाल" · bar chart by paper · "इसी विश्लेषण पर बना: most-probable सेट ₹249" · `{D-PROB}` (≥3 s) |
| Voiceover | **0–3 s** "TRE के पिछले पेपर, एक-एक सवाल करके छाँटे।"<br>**3–10 s** "एक टॉपिक बार-बार लौटता है: [टॉपिक]। पिछले पेपरों में [X] सवाल।"<br>**10–18 s** "ऐसे ही हर विषय का हिसाब: कौन-सा टॉपिक कितनी बार आया, कितना कठिन था।"<br>**18–25 s** "इसी विश्लेषण से बना है हमारा most-probable सेट, दो सौ उनचास रुपये में। पर पहले फ्री टेस्ट देकर देखो।"<br>**25–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Browser-rendered bar chart of topic counts (real numbers only), animated one bar at a time; cut to screen recording of a question from that topic in the app; end on the test start screen. `{D-PROB}` as a readable strip for the last 7 s. |
| Primary text | अंदाज़े से नहीं, पिछले पेपरों से। TRE के हर सवाल को टॉपिक-वाइज़ गिना, [टॉपिक] [X] बार आया। पहले फ्री टेस्ट, फिर चाहो तो ₹249 का most-probable सेट। {D-PROB} {D-AFF} |
| Headline | [टॉपिक]: [X] बार पूछा गया |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-05 · Data / repeat · Static image
`tre_repeat_img_hook05_lp` · `tre_repeat_img_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"बाल विकास को हल्के में मत लेना: हर TRE पेपर में [X] सवाल"**<br>*Don't take child development lightly: [X] questions in every TRE paper* |
| On-screen text | Three numbers in a row: "TRE 1.0: [X] · TRE 2.0: [X] · TRE 3.0: [X]" · "बाल विकास एवं शिक्षाशास्त्र" · bottom: "स्रोत: पिछले प्रश्नपत्रों का हमारा विश्लेषण" |
| Voiceover | — |
| Visual | Big numbers on dark background, Devanagari labels, one accent colour (not any commission's colours). |
| Primary text | पियाजे, वाइगोत्स्की, कोहलबर्ग, RTE: TRE में ये हर बार आते हैं। पिछले पेपरों में कितने सवाल आए, पूरा हिसाब हमने निकाला। अपनी तैयारी फ्री टेस्ट में चेक करो। {D-AFF} |
| Headline | हर पेपर में [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-06 · Real countdown · 15 s reel
`tre_count_r15_hook06_lp` · `tre_count_r15_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"TRE 4.0 जुलाई 2027 में संभावित है। प्लान कब बनाओगे?"**<br>*TRE 4.0 is expected in July 2027. When will you make your plan?* |
| On-screen text | "TRE 4.0: संभावित जुलाई 2027" · `{D-DATE}` · "स्टेप 1: आज पता करो आप कहाँ खड़े हो" · "फ्री टेस्ट: स्कोर + कमज़ोर टॉपिक" |
| Voiceover | **0–2 s** "TRE 4.0, संभावित जुलाई 2027।"<br>**2–8 s** "पहला कदम: आज पता करो कि आप कहाँ खड़े हो। फ्री टेस्ट दो, स्कोर और कमज़ोर टॉपिक तुरंत।"<br>**8–12 s** "फिर उन्हीं टॉपिक पर काम, महीने-दर-महीने।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Calendar graphic Dec 2026 → Jul 2027 (browser-rendered), month boxes, July marked "संभावित". Cut to the real score report with the weak-topic list. No ticking timer (date is tentative). |
| Primary text | परीक्षा की तारीख़ अभी संभावित है, पर तैयारी का पहला कदम आज लिया जा सकता है: एक फ्री टेस्ट, ताकि पता चले कहाँ मेहनत चाहिए। {D-DATE} {D-AFF} |
| Headline | पहले स्कोर, फिर प्लान |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-07 · Real countdown / fast-track ₹999 · 30 s reel
`tre_count_r30_hook07_lp` · `tre_count_r30_hook07_wa`

**Run only after the official date is notified, from about 3 months before the exam.**

| Field | Copy |
|---|---|
| Hook | **"TRE 4.0 की तारीख़ आ गई: [official date]। [N] दिन बचे।"**<br>*The TRE 4.0 date is out: [official date]. [N] days left.* |
| On-screen text | "[official date] · [N] दिन" (computed on the upload day) · "3 महीने का फ़ास्ट-ट्रैक: ₹999" · "[fast-track contents: confirm, e.g. रोज़ का टॉपिक प्लान + हर हफ़्ते फुल मॉक]" |
| Voiceover | **0–3 s** "TRE 4.0 की तारीख़ आ गई। [N] दिन बचे हैं।"<br>**3–10 s** "इतने दिनों में सब कुछ दोबारा नहीं पढ़ा जा सकता। इसलिए प्लान चाहिए: कौन-सा टॉपिक कब।"<br>**10–20 s** "तीन महीने का फ़ास्ट-ट्रैक: [contents]। हर मॉक के बाद टॉपिक-वाइज़ रिपोर्ट।"<br>**20–26 s** "नौ सौ निन्यानवे रुपये। पहले फ्री टेस्ट देकर देखो, फिर फ़ैसला करो।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Day counter as a text graphic (static number, not a ticking fake timer); screen recording of the mock test (timer, section tabs, palette) and the topic-wise report. |
| Primary text | TRE 4.0: [official date], आज से [N] दिन। 3 महीने का फ़ास्ट-ट्रैक ₹999 में: [contents]। पहले फ्री टेस्ट दो, पसंद आए तभी लो। {D-AFF} |
| Headline | [N] दिन का प्लान, ₹999 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-08 · Pain → solution · 30 s reel
`tre_pain_r30_hook08_lp` · `tre_pain_r30_hook08_wa`

| Field | Copy |
|---|---|
| Hook | **"सब पढ़ा था... फिर घड़ी देखी, 20 सवाल बाकी।"**<br>*Studied everything... then looked at the clock: 20 questions left.* |
| On-screen text | "सब पढ़ा था… घड़ी देखी: 20 सवाल बाकी" · "कमी पढ़ाई की नहीं, टाइम की प्रैक्टिस की" · "टाइमर · सेक्शन · मार्क फ़ॉर रिव्यू · टॉपिक-वाइज़ स्कोर" |
| Voiceover | **0–3 s** "सब पढ़ा था। फिर घड़ी देखी, बीस सवाल बाकी।"<br>**3–10 s** "बहुत से aspirants के साथ यही होता है। कमी पढ़ाई की नहीं, टाइम के साथ प्रैक्टिस की है।"<br>**10–20 s** "Prashnottar का मॉक टेस्ट असली पेपर की तरह चलता है: टाइमर, सेक्शन, मार्क फ़ॉर रिव्यू, और आख़िर में टॉपिक-वाइज़ स्कोर।"<br>**20–26 s** "घर पर घड़ी के साथ जितनी बार बैठोगे, हॉल में उतना कम अजीब लगेगा।"<br>**26–30 s** "पहला टेस्ट फ्री है। अभी फ्री टेस्ट दें।" |
| Visual | 0–3 s: AI B-roll (Higgsfield) of a wall clock and a pen over an answer sheet, no faces, no logos. 3 s on: phone screen recording of the real mock: timer counting, tapping the palette, "mark for review", submit, score report by section. |
| Primary text | पढ़ाई पूरी, फिर भी पेपर अधूरा? टाइम मैनेजमेंट प्रैक्टिस से आता है। TRE 4.0 पैटर्न पर टाइमर वाला मॉक, हर सवाल का explanation। पहला टेस्ट फ्री। {D-AFF} |
| Headline | पेपर टाइम में पूरा करने की प्रैक्टिस |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-09 · Pain → solution · 15 s reel
`tre_pain_r15_hook09_lp` · `tre_pain_r15_hook09_wa`

| Field | Copy |
|---|---|
| Hook | **"रोज़ 8 घंटे पढ़ाई, पर तैयारी कहाँ तक पहुँची, पता नहीं?"**<br>*8 hours of study a day, but no idea how far your prep has got?* |
| On-screen text | "8 घंटे पढ़ाई… पर स्कोर कितना?" · "एक टेस्ट = स्कोर + सही/गलत + कमज़ोर टॉपिक" · "अब पता है कल क्या पढ़ना है" |
| Voiceover | **0–2 s** "रोज़ आठ घंटे पढ़ाई, पर तैयारी कहाँ तक पहुँची?"<br>**2–9 s** "एक फ्री टेस्ट दो: स्कोर, सही-गलत, और कौन-से टॉपिक कमज़ोर हैं, सब एक स्क्रीन पर।"<br>**9–12 s** "अब पता है कल क्या पढ़ना है।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Stack of books and a notebook (real footage or AI B-roll, no faces) 0–2 s; then the real score report scrolling to the weak-topic section. *(Weak-topic report must be live: rule 12.)* |
| Primary text | मेहनत आप कर रहे हो, अब उसका हिसाब भी देखो। TRE 4.0 का फ्री टेस्ट: स्कोर और कमज़ोर टॉपिक तुरंत। {D-AFF} |
| Headline | अपनी तैयारी का स्कोर देखें |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-10 · Skip-list · Carousel
`tre_skip_car_hook10_lp` · `tre_skip_car_hook10_wa`

| Field | Copy |
|---|---|
| Hook | **"TRE में इन टॉपिक पर कम समय दें"**<br>*Spend less time on these TRE topics* |
| On-screen text | **Card 1:** "TRE में इन टॉपिक पर कम समय दें (पिछले पेपरों के हिसाब से)" **Card 2:** "[टॉपिक A]: पिछले [N] पेपरों में सिर्फ़ [X] सवाल" **Card 3:** "[टॉपिक B]: [X] सवाल" **Card 4:** "वो समय यहाँ लगाओ: [टॉपिक C]: [X] सवाल" **Card 5:** "पूरी टॉपिक-वाइज़ लिस्ट + फ्री टेस्ट" + "कम पूछे गए टॉपिक भी आ सकते हैं, पूरी तरह न छोड़ें।" |
| Voiceover | — |
| Visual | Each card: topic name large, count as a big number, a thin bar showing share of the paper. Card 5: real app screenshot. Topics and counts filled only from the analysis sheet. |
| Primary text | सिलेबस बड़ा है, समय कम। पिछले TRE पेपरों में कौन-से टॉपिक कम आए और कौन-से ज़्यादा, स्वाइप करके देखो। (कम पूछे गए टॉपिक भी आ सकते हैं, बस कम समय दो।) {D-AFF} |
| Headline | कहाँ कम, कहाँ ज़्यादा समय दें |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-11 · Price contrast · Static image
`tre_price_img_hook11_lp` · `tre_price_img_hook11_wa`

| Field | Copy |
|---|---|
| Hook | **"कोचिंग टेस्ट-सीरीज़ ₹[Y]*। यहाँ पहला टेस्ट फ्री, most-probable सेट ₹249।"**<br>*Coaching test series ₹[Y]*. Here the first test is free, the most-probable set ₹249.* |
| On-screen text | Two columns: "कोचिंग टेस्ट-सीरीज़: ₹[Y]*" vs "Prashnottar: फ्री टेस्ट → ₹249" · bottom: `{D-PROB}` · "*[source: publicly listed price, date]" |
| Voiceover | — |
| Visual | Clean split layout, no competitor names or logos; right column shows a phone with the real ₹249 checkout screen (UPI). |
| Primary text | पहले फ्री टेस्ट दो, स्कोर देखो। सही लगे तो TRE 4.0 का most-probable सेट ₹249 में, UPI से, एक बार। {D-PROB} {D-AFF} |
| Headline | फ्री टेस्ट, फिर ₹249 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

*`[Y]` must be a real, publicly listed price of a TRE test series, saved with its source and date. If none is on file, use TRE-12 instead.*

#### TRE-12 · Price contrast · 15 s reel
`tre_price_r15_hook12_lp` · `tre_price_r15_hook12_wa`

| Field | Copy |
|---|---|
| Hook | **"कोचिंग की फीस हज़ारों में। प्रैक्टिस सेट ₹249 में।"**<br>*Coaching fees run into thousands. A practice set for ₹249.* |
| On-screen text | "कोचिंग: हज़ारों में + आने-जाने का किराया" · "Prashnottar: फोन पर, घर पर" · "पहला टेस्ट फ्री · most-probable सेट ₹249" · `{D-PROB}` |
| Voiceover | **0–2 s** "कोचिंग की फीस हज़ारों में।"<br>**2–7 s** "ऊपर से रोज़ आना-जाना। पर टाइमर के साथ प्रैक्टिस तो फोन पर भी हो सकती है।"<br>**7–12 s** "पहला टेस्ट फ्री। फिर चाहो तो most-probable सेट, दो सौ उनचास रुपये में।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | 0–2 s: AI B-roll of a busy Patna-style street with coaching banners blurred (no readable brand names); 2 s on: phone screen recording of the test and the ₹249 UPI page. |
| Primary text | कोचिंग का अपना फ़ायदा है, पर रोज़ की टाइम्ड प्रैक्टिस घर पर भी हो सकती है। TRE 4.0: पहला टेस्ट फ्री, most-probable सेट ₹249। {D-PROB} {D-AFF} |
| Headline | घर पर प्रैक्टिस, ₹249 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-13 · OMR / time pressure · 30 s reel
`tre_omr_r30_hook13_lp` · `tre_omr_r30_hook13_wa`

| Field | Copy |
|---|---|
| Hook | **"आख़िरी 10 मिनट, 30 गोले भरने बाकी। हॉल में ये हाल न हो।"**<br>*Last 10 minutes, 30 bubbles still to fill. Don't let this happen in the hall.* |
| On-screen text | "आख़िरी 10 मिनट · 30 गोले बाकी" · "घर पर पूरा पेपर, पूरे टाइम में" · "प्रिंट करो · घड़ी लगाओ · [OMR शीट: confirm live]" · "नतीजा: टॉपिक-वाइज़ स्कोर" |
| Voiceover | **0–3 s** "आख़िरी दस मिनट, और तीस गोले भरने बाकी।"<br>**3–10 s** "OMR भरने का टाइम भी पेपर का टाइम है। ये प्रैक्टिस घर पर होनी चाहिए।"<br>**10–20 s** "Prashnottar पर पूरा पेपर असली टाइम के साथ: ऑनलाइन मॉक दो, या प्रश्न-पुस्तिका प्रिंट करके घड़ी लगाओ।"<br>**20–26 s** "हर बार नोट करो, गोले भरने में कितना टाइम गया।"<br>**26–30 s** "पहला टेस्ट फ्री है। अभी फ्री टेस्ट दें।" |
| Visual | Close-up of a pencil filling bubbles on a plain practice OMR sheet (unbranded, real footage), a wall clock; then the printable booklet-style paper on screen and the online mock timer. *(Confirm TRE 4.0 mode, OMR or computer-based, from the notification; if computer-based, swap "गोले" for "आख़िरी 30 सवाल" and drop the OMR footage.)* |
| Primary text | पेपर में आधा टाइम सोचने में, बाकी गोले भरने में चला जाता है। घर पर पूरा पेपर, पूरे टाइम में हल करने की प्रैक्टिस करो। TRE 4.0 पैटर्न, पहला टेस्ट फ्री। {D-AFF} |
| Headline | पूरा पेपर, पूरे टाइम में |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-14 · Bilingual reach · 15 s reel
`tre_bi_r15_hook14_lp` · `tre_bi_r15_hook14_wa`

| Field | Copy |
|---|---|
| Hook | **"हिंदी मीडियम हो या English, सवाल दोनों में। एक टैप में बदलो।"**<br>*Hindi medium or English, questions in both. Switch with one tap.* |
| On-screen text | "हिंदी ⇄ English" · same question shown in both · "Explanation भी दोनों भाषा में" |
| Voiceover | **0–2 s** "हिंदी में पढ़ते हो या English में?"<br>**2–8 s** "हर सवाल दोनों भाषाओं में। एक टैप, और भाषा बदल गई। Explanation भी।"<br>**8–12 s** "जिस भाषा में पेपर दोगे, उसी में प्रैक्टिस।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Screen recording: tapping the language switch on the Vikramshila question (विक्रमशिला महाविहार की स्थापना किसने की? ⇄ Who founded Vikramashila?) and its explanation. *(Switch must be live: rule 12.)* |
| Primary text | TRE 4.0 की प्रैक्टिस अपनी भाषा में। हर सवाल और explanation हिंदी और English दोनों में, एक टैप में बदलो। पहला टेस्ट फ्री। {D-AFF} |
| Headline | हिंदी और English, दोनों में |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

#### TRE-15 · Post-exam proof · 15 s reel
`tre_proof_r15_hook15_lp` · `tre_proof_r15_hook15_wa`

**Only after a real exam, with real numbers.** Publish the question-by-question comparison page first.

| Field | Copy |
|---|---|
| Hook | **"TRE 4.0 का पेपर आया। हमारे प्रैक्टिस सेट के टॉपिक से [X] सवाल मिले।"**<br>*The TRE 4.0 paper is out. [X] questions matched topics in our practice sets.* |
| On-screen text | "TRE 4.0 ([exam date]): [X] सवाल हमारे सेट के टॉपिक से मिले" · "पूरी लिस्ट: [link]" · "अगले चरण / अगली परीक्षा की तैयारी: फ्री टेस्ट" |
| Voiceover | **0–3 s** "TRE 4.0 का पेपर हमने अपने सेट से मिलाकर देखा।"<br>**3–9 s** "[X] सवाल हमारे प्रैक्टिस सेट के टॉपिक से मिले। पूरी लिस्ट लिंक पर है, खुद चेक करो।"<br>**9–12 s** "अगली परीक्षा की तैयारी भी यहीं से।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Side-by-side text graphic: question from the real paper (official paper, public) next to the matching practice-set topic; screen recording of the comparison page. |
| Primary text | TRE 4.0 के पेपर के [X] सवाल हमारे प्रैक्टिस सेट के टॉपिक से मिले। हर सवाल की तुलना [link] पर है। पिछले नतीजे आगे की गारंटी नहीं। {D-AFF} |
| Headline | पेपर से मिलान: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE' लिखें" |

### 2.2 BPSC CCE 73rd Prelims

| Item | Value |
|---|---|
| Exam date | Late 2027 (tentative) → "संभावित: 2027 के आख़िर में" + `{D-DATE}`; day countdown only after the official notice |
| Landing slug | `/bpsc-cce` |
| WhatsApp keyword | `CCE` |
| Offers | Free test → ₹249 most-probable set → ₹499 / ₹999 fast-track or full Pass |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, BPSC से इसका कोई संबंध नहीं। |
| Pattern facts used in ads | `[confirm from the 73rd notification]`: number of questions, time, negative marking, 5th option. Ads that quote them are marked. |

#### CCE-01 · Question challenge · 15 s reel
`cce_quiz_r15_hook01_lp` · `cce_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"BPSC वालों, 10 सेकंड: प्रयाग प्रशस्ति किसने लिखी?"**<br>*BPSC aspirants, 10 seconds: who composed the Prayag Prashasti?* |
| On-screen text | "समुद्रगुप्त की विजयों वाली प्रयाग प्रशस्ति किसने लिखी?" · A) कालिदास B) हरिषेण C) बाणभट्ट D) रविकीर्ति · timer 10 → 0 · "जवाब: B) हरिषेण, समुद्रगुप्त के दरबारी कवि" |
| Voiceover | **0–2 s** "BPSC प्रीलिम्स की तैयारी? दस सेकंड।"<br>**2–10 s** (ticking) "प्रयाग प्रशस्ति, किसकी रचना?"<br>**10–12 s** "जवाब: हरिषेण, समुद्रगुप्त के दरबारी कवि। रविकीर्ति ने ऐहोल अभिलेख लिखा था, वहीं लोग फँसते हैं।"<br>**12–15 s** "ऐसे ही सवाल, टाइमर के साथ। अभी फ्री टेस्ट दें।" |
| Visual | Real practice-mode screen with the question; 10-second ring graphic; tap B, explanation slides up. |
| Primary text | हरिषेण या रविकीर्ति? इसी तरह के करीबी ऑप्शन BPSC प्रीलिम्स में नंबर कटवाते हैं। फ्री टेस्ट में ऐसे सवाल, हर जवाब के साथ explanation। {D-AFF} |
| Headline | BPSC CCE का फ्री टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-02 · Question challenge · Static image
`cce_quiz_img_hook02_lp` · `cce_quiz_img_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"पेन मत उठाना। मन में बताओ:"**<br>*Don't pick up a pen. Answer in your head:* |
| On-screen text | "कोई राशि साधारण ब्याज पर 8 साल में दोगुनी होती है। ब्याज दर?" · A) 10% B) 12% C) 12.5% D) 15% · "जवाब कमेंट में पिन है" |
| Voiceover | — |
| Visual | Notebook-page texture, question in large handwritten-style Devanagari font (browser-rendered), a pen lying unused beside it. |
| Primary text | 5 सेकंड से ज़्यादा लगे? तो फ़ॉर्मूला नहीं, शॉर्टकट की प्रैक्टिस चाहिए। BPSC प्रीलिम्स का फ्री टेस्ट, हर सवाल का हल साथ में। {D-AFF}<br>*Pinned comment:* "जवाब: C) 12.5%। दोगुना = 100% ब्याज, 100 ÷ 8 = 12.5% सालाना।" |
| Headline | मन में हल हुआ? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-03 · Question challenge · Carousel
`cce_quiz_car_hook03_lp` · `cce_quiz_car_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"बिहार स्पेशल: 2 सवाल, 2 स्वाइप"**<br>*Bihar special: 2 questions, 2 swipes* |
| On-screen text | **Card 1:** "'बिदेसिया' लोकनाट्य का संबंध किससे है? A) विद्यापति B) भिखारी ठाकुर C) दिनकर D) रेणु" **Card 2:** "जवाब: B) भिखारी ठाकुर, 'भोजपुरी के शेक्सपियर'" **Card 3:** "चंपारण सत्याग्रह (1917) किस व्यवस्था के ख़िलाफ़ था? A) तिनकठिया B) महालवाड़ी C) रैयतवाड़ी D) स्थायी बंदोबस्त" **Card 4:** "जवाब: A) तिनकठिया: ज़मीन के 3/20 हिस्से पर नील की खेती की मजबूरी" **Card 5:** "दोनों सही? पूरा फ्री टेस्ट दो" + CTA |
| Voiceover | — |
| Visual | Paper-white cards, simple line-art (a stage curtain, an indigo leaf), no photos of real people. Card 5: real score-report screenshot. |
| Primary text | बिहार की कला-संस्कृति और आंदोलन, BPSC का पसंदीदा एरिया। स्वाइप करो, दोनों जवाब चेक करो, फिर पूरा फ्री टेस्ट। {D-AFF} |
| Headline | दोनों सही हुए? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-04 · Data / repeat · 30 s reel
`cce_repeat_r30_hook04_lp` · `cce_repeat_r30_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"पिछले [N] BPSC प्रीलिम्स: बिहार स्पेशल से [X] सवाल"**<br>*Last [N] BPSC prelims: [X] questions from Bihar-specific topics* |
| On-screen text | "पिछले [N] प्रीलिम्स, हर सवाल टॉपिक-वाइज़" · "बिहार स्पेशल: [X]" · "आधुनिक भारत: [X]" · "करंट अफ़ेयर्स: [X]" · "इसी पर बना most-probable सेट: ₹249" · `{D-PROB}` |
| Voiceover | **0–3 s** "पिछले [N] BPSC प्रीलिम्स, हमने हर सवाल गिना।"<br>**3–12 s** "बिहार स्पेशल से [X] सवाल, आधुनिक भारत से [X], करंट अफ़ेयर्स से [X]।"<br>**12–19 s** "मतलब हर घंटे की पढ़ाई का हिसाब इसी से तय होना चाहिए।"<br>**19–26 s** "इसी विश्लेषण से बना है most-probable सेट, दो सौ उनचास रुपये। पहले फ्री टेस्ट देकर देखो।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Browser-rendered horizontal bar chart (real counts), bars grow in sequence; cut to a Bihar-special question in the app; `{D-PROB}` strip for the last 8 s. |
| Primary text | BPSC प्रीलिम्स में कहाँ से कितने सवाल आते हैं? पिछले [N] पेपरों का टॉपिक-वाइज़ हिसाब: बिहार स्पेशल [X], आधुनिक भारत [X]। पहले फ्री टेस्ट, फिर चाहो तो ₹249 का most-probable सेट। {D-PROB} {D-AFF} |
| Headline | बिहार स्पेशल: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-05 · Data / repeat · Static image
`cce_repeat_img_hook05_lp` · `cce_repeat_img_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"Statement वाले सवाल: पिछले प्रीलिम्स में [X]। पहले [X] थे।"**<br>*Statement-type questions: [X] in recent prelims, up from [X] earlier.* |
| On-screen text | "'निम्नलिखित कथनों पर विचार कीजिए…'" · "[earlier paper]: [X] सवाल → [recent paper]: [X] सवाल" · "स्रोत: पिछले प्रश्नपत्रों का हमारा विश्लेषण" |
| Voiceover | — |
| Visual | The phrase "निम्नलिखित कथनों पर विचार कीजिए" big, two numbers with an arrow. Fill only with real counts; if the trend isn't real, don't run. |
| Primary text | BPSC अब सीधा सवाल कम, कथन वाले सवाल ज़्यादा पूछता है ([X] → [X], पिछले पेपरों के हिसाब से)। इनकी अलग प्रैक्टिस चाहिए। फ्री टेस्ट में देखो। {D-AFF} |
| Headline | कथन वाले सवालों की प्रैक्टिस |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-06 · Real countdown · 15 s reel
`cce_count_r15_hook06_lp` · `cce_count_r15_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"73वीं प्रीलिम्स 2027 के आख़िर में संभावित। लंबा समय है, यही ख़तरा है।"**<br>*The 73rd prelims is expected in late 2027. Lots of time, and that's the risk.* |
| On-screen text | "73वीं प्रीलिम्स: संभावित 2027 के आख़िर में" · `{D-DATE}` · "हर हफ़्ते 1 टेस्ट = परीक्षा तक [N] टेस्ट" · "शुरुआत: आज, फ्री" |
| Voiceover | **0–2 s** "73वीं प्रीलिम्स, संभावित 2027 के आख़िर में।"<br>**2–7 s** "लंबा समय है, और यही ख़तरा है: तैयारी कल पर टलती रहती है।"<br>**7–12 s** "हर हफ़्ते एक टेस्ट दो, स्कोर नोट करो। पहला आज, फ्री।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | A weekly calendar graphic with one tick per week; cut to the real score report. `[N]` = weeks from the upload day to the tentative month, rounded down, labelled "लगभग". |
| Primary text | परीक्षा दूर है, इसलिए नियम बनाओ: हर हफ़्ते एक टेस्ट। पहला टेस्ट आज, फ्री, स्कोर तुरंत। {D-DATE} {D-AFF} |
| Headline | हर हफ़्ते एक टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-07 · Real countdown / fast-track ₹499 · 30 s reel
`cce_count_r30_hook07_lp` · `cce_count_r30_hook07_wa`

**Run only after the official date is notified, in the last ~2 months.**

| Field | Copy |
|---|---|
| Hook | **"प्रीलिम्स [official date] को। [N] दिन। अब सिर्फ़ रिवीज़न और मॉक।"**<br>*Prelims on [official date]. [N] days. Now it's only revision and mocks.* |
| On-screen text | "[official date] · [N] दिन" · "2 महीने का फ़ास्ट-ट्रैक: ₹499" · "[contents: confirm]" · "रोज़: टॉपिक टेस्ट · हर हफ़्ते: फुल मॉक" (if that is the real plan) |
| Voiceover | **0–3 s** "प्रीलिम्स [official date] को है। [N] दिन।"<br>**3–10 s** "अब नया पढ़ने का नहीं, जो पढ़ा है उसे टेस्ट करने का टाइम है।"<br>**10–20 s** "दो महीने का फ़ास्ट-ट्रैक: [contents]। हर टेस्ट के बाद पता चलेगा कौन-सा टॉपिक फिर से देखना है।"<br>**20–26 s** "चार सौ निन्यानवे रुपये। पहले फ्री टेस्ट दो।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Static day number graphic (no running clock); screen recording of the mock test and topic report; a revision checklist graphic. |
| Primary text | BPSC CCE प्रीलिम्स: [official date], आज से [N] दिन। 2 महीने का फ़ास्ट-ट्रैक ₹499: [contents]। पहले फ्री टेस्ट दो, फिर तय करो। {D-AFF} |
| Headline | आख़िरी 2 महीने का प्लान ₹499 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-08 · Pain → solution · 30 s reel
`cce_pain_r30_hook08_lp` · `cce_pain_r30_hook08_wa`

| Field | Copy |
|---|---|
| Hook | **"'केवल 1 और 3' या 'केवल 2 और 3'? और ऊपर से negative marking।"**<br>*'1 and 3 only' or '2 and 3 only'? And negative marking on top.* |
| On-screen text | "केवल 1 और 3? केवल 2 और 3?" · "दोनों सही लगे, तुक्का लगाया, नंबर कटे" · "हल: कथन वाले सवालों की अलग प्रैक्टिस, हर कथन का explanation" |
| Voiceover | **0–3 s** "'केवल एक और तीन', या 'केवल दो और तीन'?"<br>**3–10 s** "दो ऑप्शन तक पहुँचे, फिर तुक्का, और negative marking में नंबर कटे। ये BPSC प्रीलिम्स की सबसे आम कहानी है।"<br>**10–20 s** "Prashnottar में कथन वाले सवालों पर हर कथन का अलग explanation: कौन-सा सही, कौन-सा गलत, और क्यों।"<br>**20–26 s** "बार-बार प्रैक्टिस से पता चलता है कहाँ जोखिम लेना है, कहाँ छोड़ना है।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | Screen recording of the INC statement question from the free set ("1885 बम्बई अधिवेशन…"), answer chosen, explanation showing each statement marked right/wrong. *(Negative-marking line: confirm 73rd pattern.)* |
| Primary text | कथन वाले सवालों में दो ऑप्शन के बीच अटकना और negative marking: इसकी दवा है प्रैक्टिस और हर कथन का explanation। BPSC CCE का फ्री टेस्ट दो। {D-AFF} |
| Headline | कथन वाले सवाल, अब आसान |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-09 · Pain → solution · 15 s reel
`cce_pain_r15_hook09_lp` · `cce_pain_r15_hook09_wa`

| Field | Copy |
|---|---|
| Hook | **"करंट अफ़ेयर्स के 10 PDF पढ़े, याद कितना रहा?"**<br>*Read 10 current-affairs PDFs; how much do you remember?* |
| On-screen text | "10 PDF पढ़े… याद कितना?" · "पढ़ा हुआ तभी पक्का, जब सवाल हल हो" · "टॉपिक टेस्ट → स्कोर → फिर रिवीज़न" |
| Voiceover | **0–2 s** "करंट अफ़ेयर्स के दस PDF पढ़े। याद कितना रहा?"<br>**2–8 s** "पढ़ना आधा काम है। बाकी आधा: उसी पर सवाल हल करना।"<br>**8–12 s** "फ्री टेस्ट दो, पता चलेगा क्या टिका और क्या फिसला।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Phone scrolling through a folder of PDFs (generic file names, no brand names) 0–2 s; then real test screen and score report. |
| Primary text | पढ़ने से ज़्यादा याद रहता है सवाल हल करने से। BPSC CCE का फ्री टेस्ट: स्कोर और explanation तुरंत। {D-AFF} |
| Headline | पढ़ा हुआ टेस्ट करो |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-10 · Skip-list · Carousel
`cce_skip_car_hook10_lp` · `cce_skip_car_hook10_wa`

| Field | Copy |
|---|---|
| Hook | **"BPSC प्रीलिम्स: इन टॉपिक पर कम समय दें"**<br>*BPSC prelims: spend less time on these topics* |
| On-screen text | **Card 1:** "इन टॉपिक पर कम समय दें (पिछले [N] पेपरों के हिसाब से)" **Card 2:** "[टॉपिक A]: [X] सवाल" **Card 3:** "[टॉपिक B]: [X] सवाल" **Card 4:** "बचा समय यहाँ: [टॉपिक C]: [X] सवाल" **Card 5:** "पूरी लिस्ट + फ्री टेस्ट" · "कम पूछे गए टॉपिक भी आ सकते हैं, पूरी तरह न छोड़ें।" |
| Voiceover | — |
| Visual | Same card system as TRE-10; counts only from the analysis sheet. |
| Primary text | 150 सवाल का पेपर, सिलेबस का कोई अंत नहीं। पिछले BPSC प्रीलिम्स में किन टॉपिक से कम सवाल आए, स्वाइप करके देखो। (कम पूछे गए टॉपिक भी आ सकते हैं, बस कम समय दो।) {D-AFF} |
| Headline | कहाँ कम समय दें |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

*"150 सवाल": confirm from the 73rd notification.*

#### CCE-11 · Price contrast · Static image
`cce_price_img_hook11_lp` · `cce_price_img_hook11_wa`

| Field | Copy |
|---|---|
| Hook | **"पटना की टेस्ट-सीरीज़ ₹[Y]*। घर बैठे फ्री टेस्ट + ₹249 का सेट।"**<br>*A Patna test series costs ₹[Y]*. Free test from home + a ₹249 set.* |
| On-screen text | "ऑफ़लाइन टेस्ट-सीरीज़: ₹[Y]* + पटना का किराया" vs "Prashnottar: फ्री टेस्ट → most-probable सेट ₹249" · `{D-PROB}` · "*[source, date]" |
| Voiceover | — |
| Visual | Split layout; left: plain icon of a bus ticket; right: phone with the real UPI checkout. No brand names. |
| Primary text | ज़िले से पटना आकर टेस्ट देने की ज़रूरत नहीं। BPSC CCE का पहला टेस्ट फ्री, most-probable सेट ₹249, UPI से। {D-PROB} {D-AFF} |
| Headline | घर से टेस्ट, ₹249 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-12 · Price contrast · 15 s reel
`cce_price_r15_hook12_lp` · `cce_price_r15_hook12_wa`

| Field | Copy |
|---|---|
| Hook | **"हज़ारों की कोचिंग से पहले, ₹0 का एक टेस्ट दे लो।"**<br>*Before paying thousands for coaching, take one test for ₹0.* |
| On-screen text | "कोचिंग: हज़ारों में" · "पहले: ₹0 का टेस्ट" · "फिर: most-probable सेट ₹249" · `{D-PROB}` |
| Voiceover | **0–2 s** "हज़ारों की कोचिंग लेने से पहले..."<br>**2–7 s** "एक फ्री टेस्ट दे लो। पता चलेगा कमज़ोरी कहाँ है, फिर तय करो पैसा कहाँ लगाना है।"<br>**7–12 s** "और प्रैक्टिस चाहिए तो most-probable सेट, दो सौ उनचास रुपये।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Text graphic "₹ हज़ारों" crossing to "₹0"; then real test start and score report. |
| Primary text | पैसा लगाने से पहले अपनी कमज़ोरी जान लो। BPSC CCE का फ्री टेस्ट, फिर चाहो तो ₹249 का most-probable सेट। {D-PROB} {D-AFF} |
| Headline | पहले ₹0 का टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-13 · OMR / time pressure · 30 s reel
`cce_omr_r30_hook13_lp` · `cce_omr_r30_hook13_wa`

| Field | Copy |
|---|---|
| Hook | **"BPSC प्रीलिम्स में एक सवाल के लिए 48 सेकंड। गोला भरना भी इसी में।"**<br>*48 seconds per question in BPSC prelims. Bubble-filling included.* |
| On-screen text | "150 सवाल · 120 मिनट = 48 सेकंड/सवाल" `[confirm pattern]` · "पढ़ो · सोचो · गोला भरो: 48 सेकंड" · "घर पर पूरा पेपर, पूरे टाइम में" |
| Voiceover | **0–3 s** "एक सवाल, अड़तालीस सेकंड। गोला भरना भी इसी में।"<br>**3–10 s** "लंबे कथन वाले सवाल पर दो मिनट गए, तो बाकी सवालों से टाइम कटेगा।"<br>**10–20 s** "Prashnottar पर पूरा पेपर असली टाइम के साथ। सवाल पर कितना टाइम लगा, स्कोर रिपोर्ट में दिखता है।" *(confirm per-question time is shown; otherwise say "पूरे पेपर का टाइम")*<br>**20–26 s** "घर पर घड़ी से लड़ो, हॉल में कम घबराओगे।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | Big "48" text graphic, a stopwatch counting 48 s in a corner (this is a real per-question average, not an urgency timer); pencil filling a plain OMR sheet; cut to the real mock timer and palette. |
| Primary text | 150 सवाल, 2 घंटे: हर सवाल को औसतन 48 सेकंड। ये रफ़्तार पढ़ने से नहीं, पूरे पेपर की प्रैक्टिस से आती है। BPSC CCE का फ्री टेस्ट। {D-AFF} |
| Headline | 48 सेकंड प्रति सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-14 · Bilingual reach · Static image
`cce_bi_img_hook14_lp` · `cce_bi_img_hook14_wa`

| Field | Copy |
|---|---|
| Hook | **"English की किताब से पढ़ा, पेपर हिंदी में देना है?"**<br>*Studied from English books, but writing the paper in Hindi?* |
| On-screen text | Same question twice: "दल-बदल विरोधी प्रावधान किस अनुसूची में हैं?" / "Which Schedule contains the anti-defection provisions?" · "हर सवाल, हर explanation: हिंदी ⇄ English" |
| Voiceover | — |
| Visual | Phone screenshot split diagonally: Hindi version top, English bottom, the switch button circled. *(Switch must be live.)* |
| Primary text | किताब English में, पेपर हिंदी में (या उल्टा)? शब्दावली दोनों में पक्की करो। हर सवाल और explanation एक टैप में हिंदी या English में। BPSC CCE का फ्री टेस्ट। {D-AFF} |
| Headline | हिंदी ⇄ English, एक टैप |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

#### CCE-15 · Post-exam proof · 15 s reel
`cce_proof_r15_hook15_lp` · `cce_proof_r15_hook15_wa`

**Only after a real exam, with real numbers.** Comparison page live first.

| Field | Copy |
|---|---|
| Hook | **"73वीं प्रीलिम्स का पेपर हमारे सेट से मिलाया: [X] सवाल उन्हीं टॉपिक से।"**<br>*We matched the 73rd prelims paper with our set: [X] questions from the same topics.* |
| On-screen text | "73वीं प्रीलिम्स ([date]): [X]/[total] सवाल हमारे प्रैक्टिस सेट के टॉपिक से" · "हर सवाल की तुलना: [link]" · "मेन्स / अगली प्रीलिम्स: फ्री टेस्ट" |
| Voiceover | **0–3 s** "73वीं प्रीलिम्स का पेपर, हमने अपने सेट से मिलाया।"<br>**3–9 s** "[X] सवाल उन्हीं टॉपिक से आए जो हमारे प्रैक्टिस सेट में थे। हर सवाल की तुलना लिंक पर है।"<br>**9–12 s** "अगली परीक्षा की तैयारी यहीं से।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Side-by-side: official question (public paper) and our matching practice item; scroll of the comparison page. |
| Primary text | 73वीं प्रीलिम्स: [X] सवाल हमारे प्रैक्टिस सेट के टॉपिक से मिले। पूरी तुलना [link] पर, खुद जाँचो। पिछले नतीजे आगे की गारंटी नहीं। {D-AFF} |
| Headline | पेपर से मिलान: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CCE' लिखें" |

### 2.3 MPPSC State Service Prelims

| Item | Value |
|---|---|
| Exam dates | 24 January 2027 and 2 May 2027 (both tentative) → "24 जनवरी 2027 (संभावित)". Day countdown only once the date is officially confirmed. Stop 24-Jan ads 3 days before that exam; switch to the 2-May date after it. |
| Landing slug | `/mppsc` (no free set yet: build and review it before ads run) |
| WhatsApp keyword | `MPPSC` |
| Offers | Free test → ₹249 most-probable set → ₹499 2-month fast-track (fits the 24 Jan date now) / ₹999 3-month or full Pass |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, MPPSC से इसका कोई संबंध नहीं। |
| Pattern facts used in ads | `[confirm from the notification]`: GS paper + General Aptitude (CSAT) paper, questions per paper, time, whether CSAT is qualifying, negative marking |
| Ad questions | Drafted below with answers; add to the reviewed MPPSC free set before use |

#### MPPSC-01 · Question challenge · 15 s reel
`mppsc_quiz_r15_hook01_lp` · `mppsc_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"MP वालों, 10 सेकंड: सांची का स्तूप किस ज़िले में है?"**<br>*MP aspirants, 10 seconds: which district is the Sanchi stupa in?* |
| On-screen text | "सांची का स्तूप मध्य प्रदेश के किस ज़िले में है?" · A) विदिशा B) रायसेन C) सागर D) भोपाल · timer 10 → 0 · "जवाब: B) रायसेन (विदिशा पास है, इसलिए लोग फँसते हैं)" |
| Voiceover | **0–2 s** "MPPSC की तैयारी? दस सेकंड।"<br>**2–10 s** (ticking) "सांची का स्तूप, कौन-सा ज़िला?"<br>**10–12 s** "जवाब: रायसेन। विदिशा बिल्कुल पास है, इसीलिए गलती होती है।"<br>**12–15 s** "ऐसे MP GK के सवाल, टाइमर के साथ। अभी फ्री टेस्ट दें।" |
| Visual | Real question screen in practice mode, 10-second ring graphic; tap B, explanation appears. Optional 1 s AI B-roll of a stone stupa silhouette at dusk (generic, not a real photo passed off as current). |
| Primary text | विदिशा या रायसेन? MP GK में ऐसे ही करीबी ऑप्शन नंबर कटवाते हैं। MPPSC प्रीलिम्स का फ्री टेस्ट, हर जवाब का explanation। {D-AFF} |
| Headline | MPPSC का फ्री टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-02 · Question challenge · Static image
`mppsc_quiz_img_hook02_lp` · `mppsc_quiz_img_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"मध्य प्रदेश का राजकीय पक्षी? सोच के बताओ, मोर नहीं है।"**<br>*Madhya Pradesh's state bird? Think. It's not the peacock.* |
| On-screen text | "मध्य प्रदेश का राजकीय पक्षी कौन-सा है?" · A) मोर B) दूधराज C) सारस D) बाज · "जवाब कमेंट में पिन है" |
| Voiceover | — |
| Visual | Simple line drawing of a long-tailed bird (browser-rendered SVG, not AI image), question large in Devanagari. |
| Primary text | आसान लगता है, पर परीक्षा हॉल में यही अटकता है। MP GK के ऐसे सवाल, explanation के साथ, फ्री टेस्ट में। {D-AFF}<br>*Pinned comment:* "जवाब: B) दूधराज (Indian Paradise Flycatcher)।" |
| Headline | आपका जवाब? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-03 · Question challenge · Carousel
`mppsc_quiz_car_hook03_lp` · `mppsc_quiz_car_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"MP GK: 2 सवाल, 2 स्वाइप। दोनों सही करो तो मानें।"**<br>*MP GK: 2 questions, 2 swipes. Get both right.* |
| On-screen text | **Card 1:** "नर्मदा नदी का उद्गम कहाँ से होता है? A) अमरकंटक B) महू C) पचमढ़ी D) मुलताई" **Card 2:** "जवाब: A) अमरकंटक (अनूपपुर)। मुलताई से ताप्ती निकलती है।" **Card 3:** "मध्य प्रदेश राज्य का गठन किस तारीख़ को हुआ? A) 26 जनवरी 1950 B) 1 नवंबर 1956 C) 15 अगस्त 1947 D) 1 नवंबर 2000" **Card 4:** "जवाब: B) 1 नवंबर 1956। 1 नवंबर 2000 को छत्तीसगढ़ अलग हुआ।" **Card 5:** "दोनों सही? पूरा फ्री टेस्ट दो" + CTA |
| Voiceover | — |
| Visual | Card 1–4: outline map of MP (browser-rendered SVG) with the relevant spot marked; card 5: real score report. |
| Primary text | नर्मदा, ताप्ती, स्थापना दिवस: MP GK का बेसिक, पर ऑप्शन देख के लोग उलझ जाते हैं। स्वाइप करके चेक करो, फिर पूरा फ्री टेस्ट। {D-AFF} |
| Headline | दोनों सही हुए? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-04 · Data / repeat · 30 s reel
`mppsc_repeat_r30_hook04_lp` · `mppsc_repeat_r30_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"MPPSC प्रीलिम्स में MP GK से हर बार करीब [X] सवाल"**<br>*About [X] questions from MP GK in every MPPSC prelims* |
| On-screen text | "पिछले [N] पेपर · हर सवाल टॉपिक-वाइज़" · "MP GK: [X] · इतिहास: [X] · भूगोल: [X]" · "सबसे ज़्यादा: [टॉपिक]" · "इसी विश्लेषण पर: most-probable सेट ₹249" · `{D-PROB}` |
| Voiceover | **0–3 s** "MPPSC के पिछले [N] पेपर, हर सवाल हमने गिना।"<br>**3–11 s** "MP GK से औसतन [X] सवाल। उसमें भी सबसे ज़्यादा [टॉपिक] से।"<br>**11–19 s** "यानी MP GK को आख़िर के लिए छोड़ना भारी पड़ सकता है।"<br>**19–26 s** "इसी विश्लेषण से बना है most-probable सेट, दो सौ उनचास रुपये। पहले फ्री टेस्ट दो।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Browser-rendered donut chart of a GS paper split by subject (real numbers only); cut to an MP GK question in the app; `{D-PROB}` strip for the last 8 s. |
| Primary text | MPPSC प्रीलिम्स में MP GK का वज़न कितना है? पिछले [N] पेपरों का हिसाब: औसतन [X] सवाल, सबसे ज़्यादा [टॉपिक] से। पहले फ्री टेस्ट, फिर चाहो तो ₹249 का most-probable सेट। {D-PROB} {D-AFF} |
| Headline | MP GK: हर बार [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-05 · Data / repeat · Static image
`mppsc_repeat_img_hook05_lp` · `mppsc_repeat_img_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"MP की जनजातियाँ: पिछले [N] पेपरों में [X] सवाल"**<br>*MP's tribes: [X] questions in the last [N] papers* |
| On-screen text | "गोंड · भील · बैगा · सहरिया · कोरकू" · "पिछले [N] पेपरों में [X] सवाल" · "स्रोत: पिछले प्रश्नपत्रों का हमारा विश्लेषण" |
| Voiceover | — |
| Visual | Tribe names as large type on an earth-toned background with a simple geometric border (browser-rendered; avoid using real tribal art or photos without rights). Use the topic the analysis actually ranks highest; tribes is the expected one. |
| Primary text | MPPSC में जनजातियों पर सवाल बार-बार लौटते हैं: पिछले [N] पेपरों में [X]। ऐसे टॉपिक की टाइम के साथ प्रैक्टिस करो। फ्री टेस्ट दो। {D-AFF} |
| Headline | जनजातियाँ: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-06 · Real countdown · 15 s reel
`mppsc_count_r15_hook06_lp` · `mppsc_count_r15_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"MPPSC प्रीलिम्स 24 जनवरी को। [N] दिन बचे।"**<br>*MPPSC prelims on 24 January. [N] days left.* |
| On-screen text | "प्रीलिम्स: 24 जनवरी 2027" · "[N] दिन" · `{D-DATE}` until confirmed · "आज: एक फ्री टेस्ट, पता करो कहाँ खड़े हो" |
| Voiceover | **0–2 s** "MPPSC प्रीलिम्स, चौबीस जनवरी। [N] दिन।"<br>**2–8 s** "इतने दिनों में सबसे बड़ा काम: पता करना कि कमज़ोरी कहाँ है, और वहीं टाइम देना।"<br>**8–12 s** "फ्री टेस्ट दो, स्कोर और कमज़ोर टॉपिक तुरंत।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Calendar page "24 जनवरी" (browser-rendered) with the day count as a static number set on the upload day; cut to the real score report. If the date isn't officially confirmed at upload: drop "[N] दिन", show "24 जनवरी 2027 (संभावित)". |
| Primary text | MPPSC प्रीलिम्स: 24 जनवरी 2027, आज से [N] दिन। पहला कदम: एक फ्री टेस्ट, ताकि बचे दिन सही टॉपिक पर लगें। {D-AFF} |
| Headline | [N] दिन: पहले स्कोर देखो |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-07 · Real countdown / fast-track ₹499 · 30 s reel
`mppsc_count_r30_hook07_lp` · `mppsc_count_r30_hook07_wa`

**Runs now for 24 Jan (if confirmed); re-run with the 2 May date ~2 months before it.**

| Field | Copy |
|---|---|
| Hook | **"24 जनवरी तक के लिए 2 महीने का प्लान: ₹499"**<br>*A 2-month plan up to 24 January: ₹499* |
| On-screen text | "प्रीलिम्स 24 जनवरी · [N] दिन" · "2 महीने का फ़ास्ट-ट्रैक ₹499" · "[contents: confirm, e.g. हफ़्ते-वार टॉपिक प्लान · GS + CSAT मॉक · टॉपिक रिपोर्ट]" |
| Voiceover | **0–3 s** "चौबीस जनवरी तक [N] दिन। और प्लान?"<br>**3–10 s** "दो महीने में सब दोबारा नहीं पढ़ा जा सकता। चाहिए: कौन-सा टॉपिक किस हफ़्ते, और हर हफ़्ते एक मॉक।"<br>**10–20 s** "दो महीने का फ़ास्ट-ट्रैक: [contents]। हर मॉक के बाद पता चलेगा अगला हफ़्ता किस पर लगाना है।"<br>**20–26 s** "चार सौ निन्यानवे रुपये। पहले फ्री टेस्ट दो, फिर तय करो।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Week-by-week plan graphic (8 boxes) built from the real fast-track plan; screen recording of the mock and report. No running clock. |
| Primary text | MPPSC प्रीलिम्स 24 जनवरी को, [N] दिन बाकी। 2 महीने का फ़ास्ट-ट्रैक ₹499 में: [contents]। पहले फ्री टेस्ट दो, पसंद आए तभी लो। {D-AFF} |
| Headline | 2 महीने का प्लान, ₹499 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-08 · Pain → solution · 30 s reel
`mppsc_pain_r30_hook08_lp` · `mppsc_pain_r30_hook08_wa`

| Field | Copy |
|---|---|
| Hook | **"GS पर पूरा ज़ोर, CSAT 'हो जाएगा'... और वहीं अटक गए।"**<br>*All focus on GS, CSAT 'will be fine'... and that's where it got stuck.* |
| On-screen text | "GS: पूरी तैयारी · CSAT: 'हो जाएगा'" · "CSAT भी पास करना ज़रूरी" `[confirm qualifying rule]` · "हल: हर हफ़्ते एक CSAT मॉक, टाइमर के साथ" |
| Voiceover | **0–3 s** "GS पर पूरा ज़ोर, CSAT के लिए सोचा 'हो जाएगा'।"<br>**3–10 s** "बहुत से aspirants के साथ यही होता है, और नंबर वहीं कट जाते हैं। CSAT भी पास करना ज़रूरी है।"<br>**10–20 s** "Prashnottar पर GS और CSAT दोनों के मॉक, असली टाइम के साथ। Reasoning और maths के हर सवाल का स्टेप-वाइज़ हल।"<br>**20–26 s** "हफ़्ते में एक CSAT मॉक, बस इतना नियम।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | Two stacked text cards "GS: तैयार / CSAT: ?" 0–3 s; then real screen recording of a CSAT maths question with the step-wise solution. *(CSAT mocks must exist before this runs.)* |
| Primary text | MPPSC में CSAT को हल्के में लेना भारी पड़ सकता है। GS और CSAT दोनों की टाइम्ड प्रैक्टिस, स्टेप-वाइज़ हल के साथ। पहला टेस्ट फ्री। {D-AFF} |
| Headline | CSAT की भी प्रैक्टिस करो |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-09 · Pain → solution · 15 s reel
`mppsc_pain_r15_hook09_lp` · `mppsc_pain_r15_hook09_wa`

| Field | Copy |
|---|---|
| Hook | **"एक दिन, दो पेपर। दूसरे पेपर तक दिमाग थक जाता है।"**<br>*One day, two papers. By the second, your brain is tired.* |
| On-screen text | "सुबह: GS · दोपहर: CSAT" · "घर पर भी उसी दिन, उसी क्रम में दो मॉक" · "स्टैमिना भी प्रैक्टिस से" |
| Voiceover | **0–2 s** "एक दिन, दो पेपर।"<br>**2–8 s** "दूसरे पेपर तक दिमाग थक जाता है। इसकी प्रैक्टिस भी घर पर हो सकती है: एक ही दिन, उसी क्रम में दो मॉक।"<br>**8–12 s** "पहला मॉक आज, फ्री।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Text graphic of an exam-day timeline (morning GS, afternoon CSAT) `[confirm timings]`; AI B-roll of a tea cup and a clock at afternoon light; then the real mock start screen. |
| Primary text | MPPSC में एक दिन में दो पेपर होते हैं। घर पर एक बार पूरा दिन वैसा ही करके देखो: दो मॉक, उसी क्रम में। पहला फ्री। {D-AFF} |
| Headline | परीक्षा वाले दिन की रिहर्सल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-10 · Skip-list · Carousel
`mppsc_skip_car_hook10_lp` · `mppsc_skip_car_hook10_wa`

| Field | Copy |
|---|---|
| Hook | **"24 जनवरी से पहले: इन टॉपिक पर कम समय दें"**<br>*Before 24 January: spend less time on these topics* |
| On-screen text | **Card 1:** "कम समय दें: पिछले [N] MPPSC पेपरों के हिसाब से" **Card 2:** "[टॉपिक A]: [X] सवाल" **Card 3:** "[टॉपिक B]: [X] सवाल" **Card 4:** "बचा समय यहाँ: [टॉपिक C]: [X] सवाल" **Card 5:** "पूरी लिस्ट + फ्री टेस्ट" · "कम पूछे गए टॉपिक भी आ सकते हैं, पूरी तरह न छोड़ें।" |
| Voiceover | — |
| Visual | Same card system as TRE-10, MP-green accent (not MPPSC's branding). |
| Primary text | परीक्षा पास है, समय कम: पिछले MPPSC पेपरों में कौन-से टॉपिक कम आए और कौन-से ज़्यादा, स्वाइप करके देखो। (कम पूछे गए टॉपिक भी आ सकते हैं, बस कम समय दो।) {D-AFF} |
| Headline | कहाँ कम समय दें |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-11 · Price contrast · Static image
`mppsc_price_img_hook11_lp` · `mppsc_price_img_hook11_wa`

| Field | Copy |
|---|---|
| Hook | **"इंदौर की टेस्ट-सीरीज़ ₹[Y]*। यहाँ पहला टेस्ट फ्री।"**<br>*An Indore test series costs ₹[Y]*. Here the first test is free.* |
| On-screen text | "ऑफ़लाइन टेस्ट-सीरीज़ (इंदौर): ₹[Y]*" vs "Prashnottar: फ्री टेस्ट → most-probable सेट ₹249" · `{D-PROB}` · "*[source, date]" |
| Voiceover | — |
| Visual | Split layout, no brand names; right side phone with the real UPI checkout. |
| Primary text | इंदौर-भोपाल आए बिना, घर से टाइम्ड मॉक। MPPSC का पहला टेस्ट फ्री, most-probable सेट ₹249, UPI से। {D-PROB} {D-AFF} |
| Headline | फ्री टेस्ट, फिर ₹249 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-12 · Price contrast (₹499 fast-track) · 15 s reel
`mppsc_price_r15_hook12_lp` · `mppsc_price_r15_hook12_wa`

| Field | Copy |
|---|---|
| Hook | **"क्रैश कोर्स के लिए इंदौर में कमरा? या फोन पर ₹499 का 2 महीने का प्लान?"**<br>*A room in Indore for a crash course? Or a ₹499 two-month plan on your phone?* |
| On-screen text | "क्रैश कोर्स: फीस + कमरा + खाना" · "फ़ास्ट-ट्रैक: ₹499, घर से" · "पहले फ्री टेस्ट" |
| Voiceover | **0–2 s** "आख़िरी दो महीने के लिए इंदौर में कमरा?"<br>**2–8 s** "फीस, किराया, खाना। या घर पर रहकर दो महीने का फ़ास्ट-ट्रैक, चार सौ निन्यानवे रुपये में।"<br>**8–12 s** "फ़ैसला बाद में, पहले फ्री टेस्ट।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | AI B-roll of a small rented room with a desk and bag (no people); cut to phone with the real fast-track page and mock screen. |
| Primary text | आख़िरी दो महीने घर पर रहकर भी प्लान के साथ तैयारी हो सकती है। MPPSC 2 महीने का फ़ास्ट-ट्रैक ₹499: [contents]। पहले फ्री टेस्ट दो। {D-AFF} |
| Headline | 2 महीने, ₹499, घर से |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-13 · OMR / time pressure · 30 s reel
`mppsc_omr_r30_hook13_lp` · `mppsc_omr_r30_hook13_wa`

| Field | Copy |
|---|---|
| Hook | **"100 सवाल, 2 घंटे। सुनने में आराम, हॉल में नहीं।"**<br>*100 questions, 2 hours. Sounds relaxed; isn't, in the hall.* `[confirm pattern]` |
| On-screen text | "100 सवाल · 120 मिनट = 72 सेकंड/सवाल" · "पर लंबे सवाल + OMR + आख़िरी चेक = टाइम कम" · "घर पर: पूरा पेपर, पूरे टाइम में" |
| Voiceover | **0–3 s** "सौ सवाल, दो घंटे। सुनने में आराम लगता है।"<br>**3–10 s** "पर लंबे सवाल, OMR भरना, आख़िर में चेक करना, और टाइम उड़ जाता है।"<br>**10–20 s** "Prashnottar पर पूरा पेपर असली टाइम के साथ, ऑनलाइन या प्रिंट करके। आख़िर में सेक्शन-वाइज़ स्कोर।"<br>**20–26 s** "दो-तीन बार पूरा पेपर घड़ी के साथ कर लो, फिर हॉल का टाइम अपना लगेगा।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | "72" big text graphic; real footage of a pencil on a plain unbranded OMR sheet; the printable booklet paper; the online mock timer. |
| Primary text | 2 घंटे काफ़ी लगते हैं, जब तक घड़ी के साथ पूरा पेपर न किया हो। MPPSC पैटर्न पर पूरा पेपर, पूरे टाइम में। पहला टेस्ट फ्री। {D-AFF} |
| Headline | पूरा पेपर, घड़ी के साथ |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-14 · Bilingual reach · 15 s reel
`mppsc_bi_r15_hook14_lp` · `mppsc_bi_r15_hook14_wa`

| Field | Copy |
|---|---|
| Hook | **"हिंदी मीडियम से हो? सवाल और हल, पूरे हिंदी में।"**<br>*From Hindi medium? Questions and solutions fully in Hindi.* |
| On-screen text | "पूरा हिंदी में · चाहो तो English" · "एक टैप में भाषा बदलो" · "Explanation भी दोनों में" |
| Voiceover | **0–2 s** "हिंदी मीडियम से हो?"<br>**2–8 s** "हर सवाल, हर हल, पूरा हिंदी में। कोई शब्द अटके तो एक टैप में English देख लो।"<br>**8–12 s** "दोनों भाषाओं में शब्दावली पक्की।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Screen recording of the Sanchi question toggling हिंदी ⇄ English, then its explanation in both. *(Switch must be live.)* |
| Primary text | MPPSC की प्रैक्टिस अपनी भाषा में: हर सवाल और explanation हिंदी में, ज़रूरत हो तो English एक टैप में। पहला टेस्ट फ्री। {D-AFF} |
| Headline | पूरा हिंदी में, English भी |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

#### MPPSC-15 · Post-exam proof · 15 s reel
`mppsc_proof_r15_hook15_lp` · `mppsc_proof_r15_hook15_wa`

**Only after a real exam, with real numbers.** First use: after the 24 Jan paper, for the 2 May date.

| Field | Copy |
|---|---|
| Hook | **"24 जनवरी का पेपर हमारे सेट से मिलाया: [X] सवाल उन्हीं टॉपिक से।"**<br>*We matched the 24 January paper with our set: [X] questions from the same topics.* |
| On-screen text | "MPPSC प्रीलिम्स, 24 जनवरी 2027: [X]/[total] सवाल हमारे प्रैक्टिस सेट के टॉपिक से" · "तुलना: [link]" · "अगली प्रीलिम्स: 2 मई 2027 (संभावित)" |
| Voiceover | **0–3 s** "चौबीस जनवरी का MPPSC पेपर, हमने अपने सेट से मिलाया।"<br>**3–9 s** "[X] सवाल उन्हीं टॉपिक से आए। हर सवाल की तुलना लिंक पर है।"<br>**9–12 s** "दो मई की तैयारी यहीं से।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Side-by-side official question and matching practice item; comparison page scroll. |
| Primary text | 24 जनवरी के MPPSC पेपर के [X] सवाल हमारे प्रैक्टिस सेट के टॉपिक से मिले। पूरी तुलना [link] पर। पिछले नतीजे आगे की गारंटी नहीं। {D-AFF} |
| Headline | पेपर से मिलान: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'MPPSC' लिखें" |

### 2.4 RAS Prelims (RPSC)

| Item | Value |
|---|---|
| Exam date | Late 2027 (tentative) → "संभावित: 2027 के आख़िर में" + `{D-DATE}`; day countdown only after the official notice |
| Landing slug | `/ras` (no free set yet: build and review it before ads run) |
| WhatsApp keyword | `RAS` |
| Offers | Free test → ₹249 most-probable set → ₹499 / ₹999 fast-track or full Pass |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, RPSC से इसका कोई संबंध नहीं। |
| Pattern facts used in ads | `[confirm from the notification]`: 150 questions, 3 hours, negative marking (one-third), the 5th "not attempted" bubble and its penalty |
| Ad questions | Drafted below with answers; add to the reviewed RAS free set before use |

#### RAS-01 · Question challenge · 15 s reel
`ras_quiz_r15_hook01_lp` · `ras_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"राजस्थान वालों, 10 सेकंड: हल्दीघाटी का युद्ध किस साल?"**<br>*Rajasthan aspirants, 10 seconds: which year was the Battle of Haldighati?* |
| On-screen text | "हल्दीघाटी का युद्ध किस वर्ष हुआ?" · A) 1527 B) 1556 C) 1576 D) 1568 · timer 10 → 0 · "जवाब: C) 1576 (1527 = खानवा, 1556 = पानीपत II, 1568 = चित्तौड़ घेरा)" |
| Voiceover | **0–2 s** "RAS की तैयारी? दस सेकंड।"<br>**2–10 s** (ticking) "हल्दीघाटी, कौन-सा साल?"<br>**10–12 s** "जवाब: पंद्रह सौ छिहत्तर। बाकी तीनों साल भी याद रखो: खानवा, पानीपत, चित्तौड़।"<br>**12–15 s** "ऐसे सवाल, टाइमर के साथ। अभी फ्री टेस्ट दें।" |
| Visual | Real question screen, 10-second ring graphic; tap C, explanation with all four years appears. |
| Primary text | चारों ऑप्शन असली साल हैं, यही RAS की चाल है। हर ऑप्शन का मतलब समझो, explanation के साथ, फ्री टेस्ट में। {D-AFF} |
| Headline | RAS का फ्री टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-02 · Question challenge · Static image
`ras_quiz_img_hook02_lp` · `ras_quiz_img_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"कालीबंगा किस ज़िले में है? श्रीगंगानगर बोला तो गलत।"**<br>*Which district is Kalibangan in? If you said Sri Ganganagar, wrong.* |
| On-screen text | "सिंधु सभ्यता स्थल कालीबंगा राजस्थान के किस ज़िले में है?" · A) श्रीगंगानगर B) हनुमानगढ़ C) बीकानेर D) चूरू · "जवाब कमेंट में पिन है" |
| Voiceover | — |
| Visual | Outline map of Rajasthan's north (browser-rendered SVG), a dot without a label; question large above. |
| Primary text | पड़ोसी ज़िले वाले ऑप्शन, RAS में यहीं नंबर कटते हैं। राजस्थान GK के ऐसे सवाल explanation के साथ, फ्री टेस्ट में। {D-AFF}<br>*Pinned comment:* "जवाब: B) हनुमानगढ़। घग्घर नदी के किनारे।" |
| Headline | आपका जवाब? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-03 · Question challenge · Carousel
`ras_quiz_car_hook03_lp` · `ras_quiz_car_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"राजस्थान GK: 2 सवाल। दोनों सही तो तैयारी ठीक चल रही है।"**<br>*Rajasthan GK: 2 questions. Both right means prep is on track.* |
| On-screen text | **Card 1:** "अरावली की सबसे ऊँची चोटी? A) गुरु शिखर B) सेर C) जरगा D) अचलगढ़" **Card 2:** "जवाब: A) गुरु शिखर (सिरोही, माउंट आबू)" **Card 3:** "राजस्थान का एकीकरण कितने चरणों में पूरा हुआ? A) 5 B) 6 C) 7 D) 8" **Card 4:** "जवाब: C) 7 चरण (18 मार्च 1948 से 1 नवंबर 1956)" **Card 5:** "दोनों सही? पूरा फ्री टेस्ट दो" + CTA |
| Voiceover | — |
| Visual | Sand-and-maroon palette (not RPSC's branding); simple mountain line-art for card 1, a 7-step staircase graphic for card 3; card 5 real score report. |
| Primary text | गुरु शिखर और एकीकरण के चरण: RAS में बार-बार दिखने वाले टॉपिक। स्वाइप करो, जवाब चेक करो, फिर पूरा फ्री टेस्ट। {D-AFF} |
| Headline | दोनों सही हुए? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-04 · Data / repeat · 30 s reel
`ras_repeat_r30_hook04_lp` · `ras_repeat_r30_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"RAS प्रीलिम्स में राजस्थान GK से [X] सवाल। पूरे पेपर का [X]%।"**<br>*[X] questions from Rajasthan GK in RAS prelims: [X]% of the paper.* |
| On-screen text | "पिछले [N] पेपर · हर सवाल टॉपिक-वाइज़" · "राजस्थान इतिहास: [X] · कला-संस्कृति: [X] · भूगोल: [X]" · "इसी विश्लेषण पर: most-probable सेट ₹249" · `{D-PROB}` |
| Voiceover | **0–3 s** "RAS के पिछले [N] पेपर, हर सवाल हमने गिना।"<br>**3–11 s** "राजस्थान GK से [X] सवाल, यानी पेपर का [X] प्रतिशत। उसमें कला-संस्कृति से [X]।"<br>**11–19 s** "किले, लोक देवता, मेले, बोलियाँ: यहीं से सबसे ज़्यादा।"<br>**19–26 s** "इसी विश्लेषण से बना है most-probable सेट, दो सौ उनचास रुपये। पहले फ्री टेस्ट दो।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Browser-rendered stacked bar of the paper by subject (real numbers only); cut to a Rajasthan culture question in the app; `{D-PROB}` strip for the last 8 s. |
| Primary text | RAS प्रीलिम्स में राजस्थान GK का हिस्सा कितना? पिछले [N] पेपरों का हिसाब: [X] सवाल, सबसे ज़्यादा कला-संस्कृति से। पहले फ्री टेस्ट, फिर चाहो तो ₹249 का most-probable सेट। {D-PROB} {D-AFF} |
| Headline | राजस्थान GK: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-05 · Data / repeat · Static image
`ras_repeat_img_hook05_lp` · `ras_repeat_img_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"लोक देवता और मेले: पिछले [N] RAS पेपरों में [X] सवाल"**<br>*Folk deities and fairs: [X] questions in the last [N] RAS papers* |
| On-screen text | "पाबूजी · तेजाजी · गोगाजी · रामदेवजी · देवनारायणजी" · "पिछले [N] पेपरों में [X] सवाल" · "स्रोत: पिछले प्रश्नपत्रों का हमारा विश्लेषण" |
| Voiceover | — |
| Visual | Names in large type on a sand background with a simple rangoli-style border (browser-rendered). Use the topic the analysis actually ranks highest. |
| Primary text | लोक देवता, मेले, फड़ चित्रकला: RAS में बार-बार लौटने वाले टॉपिक। पिछले [N] पेपरों में [X] सवाल। टाइम के साथ प्रैक्टिस करो, फ्री टेस्ट में। {D-AFF} |
| Headline | लोक देवता: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-06 · Real countdown · 15 s reel
`ras_count_r15_hook06_lp` · `ras_count_r15_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"RAS प्रीलिम्स 2027 के आख़िर में संभावित। तब तक कितने मॉक दोगे?"**<br>*RAS prelims expected late 2027. How many mocks will you take by then?* |
| On-screen text | "RAS प्रीलिम्स: संभावित 2027 के आख़िर में" · `{D-DATE}` · "हर हफ़्ते 1 मॉक = लगभग [N] मॉक" · "पहला आज, फ्री" |
| Voiceover | **0–2 s** "RAS प्रीलिम्स, संभावित 2027 के आख़िर में।"<br>**2–8 s** "तब तक हर हफ़्ते एक मॉक दिया, तो लगभग [N] मॉक। हर मॉक के बाद पता चलेगा क्या सुधारना है।"<br>**8–12 s** "पहला मॉक आज, फ्री।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | A counter of mock tests filling up week by week (illustrative, not a timer); real score report. `[N]` = weeks from upload to the tentative month, "लगभग". |
| Primary text | परीक्षा दूर है, इसलिए हफ़्ते का नियम बनाओ: एक मॉक। पहला आज, फ्री, स्कोर तुरंत। {D-DATE} {D-AFF} |
| Headline | हर हफ़्ते एक मॉक |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-07 · Real countdown / fast-track ₹999 · 30 s reel
`ras_count_r30_hook07_lp` · `ras_count_r30_hook07_wa`

**Run only after the official date is notified, from about 3 months before.**

| Field | Copy |
|---|---|
| Hook | **"RAS प्रीलिम्स [official date] को। [N] दिन। 3 महीने का पूरा प्लान ₹999।"**<br>*RAS prelims on [official date]. [N] days. A full 3-month plan for ₹999.* |
| On-screen text | "[official date] · [N] दिन" · "3 महीने का फ़ास्ट-ट्रैक / पूरा Pass: ₹999" · "[contents: confirm]" |
| Voiceover | **0–3 s** "RAS प्रीलिम्स की तारीख़ आ गई। [N] दिन।"<br>**3–10 s** "राजस्थान GK, इतिहास, राजव्यवस्था, करंट अफ़ेयर्स: सबको तीन महीने में बाँटना है।"<br>**10–20 s** "तीन महीने का फ़ास्ट-ट्रैक: [contents]। हर मॉक के बाद टॉपिक-वाइज़ रिपोर्ट।"<br>**20–26 s** "नौ सौ निन्यानवे रुपये। पहले फ्री टेस्ट देकर देखो।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | 12-week plan grid graphic from the real plan; screen recording of the mock and report. |
| Primary text | RAS प्रीलिम्स: [official date], आज से [N] दिन। 3 महीने का फ़ास्ट-ट्रैक ₹999: [contents]। पहले फ्री टेस्ट दो, पसंद आए तभी लो। {D-AFF} |
| Headline | [N] दिन का प्लान, ₹999 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-08 · Pain → solution · 30 s reel
`ras_pain_r30_hook08_lp` · `ras_pain_r30_hook08_wa`

| Field | Copy |
|---|---|
| Hook | **"5 तुक्के लगाए, 2 सही... और नंबर बढ़े नहीं, घटे।"**<br>*5 guesses, 2 right... and the score went down, not up.* |
| On-screen text | "5 तुक्के: 2 सही (+), 3 गलत (−)" · "नेगेटिव मार्किंग: [rule]" `[confirm]` · "हल: मॉक में नेट स्कोर देखो, तय करो कब छोड़ना है" |
| Voiceover | **0–3 s** "पाँच तुक्के लगाए, दो सही। नंबर बढ़ने चाहिए थे?"<br>**3–10 s** "नेगेटिव मार्किंग में गलत जवाब नंबर काटते हैं, और तीन गलत, दो सही का हिसाब सोच से अलग निकल सकता है।"<br>**10–20 s** "Prashnottar के मॉक में स्कोर नेगेटिव मार्किंग के बाद दिखता है। हर मॉक के बाद देखो: तुक्कों से फ़ायदा हुआ या नुकसान।"<br>**20–26 s** "पाँच-छह मॉक में अपना नियम बन जाएगा: कब लगाना, कब छोड़ना।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | Simple +/− tally graphic for the 5 guesses using the confirmed marking rule (show the real arithmetic); then the real score report showing correct, wrong, net. *(Net score after negative marking must be live in the report.)* |
| Primary text | RAS में नेगेटिव मार्किंग है, इसलिए तुक्का भी सोच-समझकर। मॉक में अपना नेट स्कोर देखो और अपनी रणनीति बनाओ। पहला टेस्ट फ्री। {D-AFF} |
| Headline | तुक्का लगाएँ या छोड़ें? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-09 · Pain → solution · 15 s reel
`ras_pain_r15_hook09_lp` · `ras_pain_r15_hook09_wa`

| Field | Copy |
|---|---|
| Hook | **"राजस्थान GK के तथ्य हज़ार, याद रहते दस?"**<br>*A thousand Rajasthan GK facts, and only ten stay in memory?* |
| On-screen text | "किले · मेले · लोक देवता · बोलियाँ…" · "पढ़ा हुआ पक्का तब, जब सवाल में पहचाना" · "टॉपिक टेस्ट → explanation → दोबारा" |
| Voiceover | **0–2 s** "राजस्थान GK के तथ्य हज़ार, याद रहते दस?"<br>**2–8 s** "रटने से नहीं, सवाल हल करने से याद टिकता है। गलत हुआ तो explanation, फिर दोबारा।"<br>**8–12 s** "पहला टेस्ट आज, फ्री।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Fast text-cascade of fact words (browser-rendered), then real practice-mode screen: wrong answer, explanation, retry. |
| Primary text | राजस्थान GK याद रखने का तरीका: पढ़ो, सवाल हल करो, गलती का explanation पढ़ो। RAS का फ्री टेस्ट दो। {D-AFF} |
| Headline | पढ़ा हुआ याद रखने का तरीका |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-10 · Skip-list · Carousel
`ras_skip_car_hook10_lp` · `ras_skip_car_hook10_wa`

| Field | Copy |
|---|---|
| Hook | **"RAS: इन टॉपिक पर कम समय दें"**<br>*RAS: spend less time on these topics* |
| On-screen text | **Card 1:** "कम समय दें: पिछले [N] RAS पेपरों के हिसाब से" **Card 2:** "[टॉपिक A]: [X] सवाल" **Card 3:** "[टॉपिक B]: [X] सवाल" **Card 4:** "बचा समय यहाँ: [टॉपिक C]: [X] सवाल" **Card 5:** "पूरी लिस्ट + फ्री टेस्ट" · "कम पूछे गए टॉपिक भी आ सकते हैं, पूरी तरह न छोड़ें।" |
| Voiceover | — |
| Visual | Same card system as TRE-10, sand-and-maroon accent. |
| Primary text | RAS का सिलेबस समंदर है। पिछले पेपरों में कौन-से टॉपिक कम आए, कौन-से ज़्यादा, स्वाइप करके देखो। (कम पूछे गए टॉपिक भी आ सकते हैं, बस कम समय दो।) {D-AFF} |
| Headline | कहाँ कम समय दें |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-11 · Price contrast · Static image
`ras_price_img_hook11_lp` · `ras_price_img_hook11_wa`

| Field | Copy |
|---|---|
| Hook | **"जयपुर की टेस्ट-सीरीज़ ₹[Y]*। यहाँ पहला टेस्ट फ्री।"**<br>*A Jaipur test series costs ₹[Y]*. Here the first test is free.* |
| On-screen text | "ऑफ़लाइन टेस्ट-सीरीज़ (जयपुर): ₹[Y]*" vs "Prashnottar: फ्री टेस्ट → most-probable सेट ₹249" · `{D-PROB}` · "*[source, date]" |
| Voiceover | — |
| Visual | Split layout, no brand names; phone with the real UPI checkout. |
| Primary text | जयपुर आए बिना, घर से टाइम्ड मॉक। RAS का पहला टेस्ट फ्री, most-probable सेट ₹249, UPI से। {D-PROB} {D-AFF} |
| Headline | फ्री टेस्ट, फिर ₹249 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-12 · Price contrast · 15 s reel
`ras_price_r15_hook12_lp` · `ras_price_r15_hook12_wa`

| Field | Copy |
|---|---|
| Hook | **"गाँव से जयपुर, कमरा, कोचिंग... या पहले घर पर एक फ्री टेस्ट?"**<br>*Village to Jaipur, a room, coaching... or first, one free test at home?* |
| On-screen text | "जयपुर: फीस + कमरा + खाना" · "पहले: घर पर फ्री टेस्ट" · "फिर: most-probable सेट ₹249" · `{D-PROB}` |
| Voiceover | **0–2 s** "गाँव से जयपुर, कमरा, कोचिंग..."<br>**2–7 s** "बड़ा ख़र्च करने से पहले घर पर एक फ्री टेस्ट दे लो। पता चलेगा कहाँ मदद चाहिए।"<br>**7–12 s** "और प्रैक्टिस चाहिए तो most-probable सेट, दो सौ उनचास रुपये।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | AI B-roll of a bus on a desert highway at dawn (no people's faces, no brand names); cut to the real test screen and UPI page. |
| Primary text | बड़ा ख़र्च करने से पहले अपनी तैयारी नाप लो। RAS का फ्री टेस्ट, फिर चाहो तो ₹249 का most-probable सेट। {D-PROB} {D-AFF} |
| Headline | पहले घर पर फ्री टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-13 · OMR / time pressure · 30 s reel
`ras_omr_r30_hook13_lp` · `ras_omr_r30_hook13_wa`

| Field | Copy |
|---|---|
| Hook | **"RAS OMR में पाँचवाँ गोला भी है। छोड़ा तो नुकसान।"**<br>*The RAS OMR has a fifth bubble too. Leave it blank and you lose marks.* `[confirm rule]` |
| On-screen text | "A · B · C · D · E" · "जवाब न आए तो E भरो" `[confirm]` · "150 सवाल, 3 घंटे: 150 बार गोला" `[confirm]` · "घर पर पूरा पेपर, पाँचों गोलों के साथ" |
| Voiceover | **0–3 s** "RAS की OMR में पाँचवाँ गोला भी है।"<br>**3–10 s** "जो सवाल छोड़ना है, उसमें भी कुछ भरना ज़रूरी है, वरना नंबर कटते हैं। [confirm wording against the notification]"<br>**10–20 s** "डेढ़ सौ सवाल, हर सवाल पर एक गोला। ये आदत घर पर बननी चाहिए। Prashnottar पर पूरा पेपर, असली टाइम के साथ।"<br>**20–26 s** "प्रिंट करो, घड़ी लगाओ, और गोले भरने का टाइम भी गिनो।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | Real footage of a pencil on a plain unbranded 5-option OMR practice sheet (A–E); the printable booklet paper; online mock timer. *(5-option practice must be live in the product: the paper format supports 5 options.)* |
| Primary text | RAS में हर सवाल पर पाँच में से एक गोला भरना होता है, छोड़े हुए सवाल पर भी। ये आदत घर पर बनाओ। RAS पैटर्न पर पूरा पेपर, पहला टेस्ट फ्री। [confirm rule] {D-AFF} |
| Headline | पाँचवें गोले की प्रैक्टिस |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-14 · Bilingual reach · Static image
`ras_bi_img_hook14_lp` · `ras_bi_img_hook14_wa`

| Field | Copy |
|---|---|
| Hook | **"हिंदी में पढ़ा, शब्द English में अटका? दोनों एक साथ देखो।"**<br>*Studied in Hindi, stuck on an English term? See both together.* |
| On-screen text | "हल्दीघाटी का युद्ध किस वर्ष हुआ?" / "In which year was the Battle of Haldighati fought?" · "हर सवाल, हर explanation: हिंदी ⇄ English" |
| Voiceover | — |
| Visual | Phone screenshot split diagonally, Hindi top, English bottom, switch circled. *(Switch must be live.)* |
| Primary text | RAS का पेपर दोनों भाषाओं में आता है। प्रैक्टिस भी दोनों में करो: हर सवाल और explanation एक टैप में हिंदी या English में। पहला टेस्ट फ्री। {D-AFF} |
| Headline | हिंदी ⇄ English, एक टैप |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

#### RAS-15 · Post-exam proof · 15 s reel
`ras_proof_r15_hook15_lp` · `ras_proof_r15_hook15_wa`

**Only after a real exam, with real numbers.** Comparison page live first.

| Field | Copy |
|---|---|
| Hook | **"RAS प्रीलिम्स का पेपर हमारे सेट से मिलाया: [X] सवाल उन्हीं टॉपिक से।"**<br>*We matched the RAS prelims paper with our set: [X] questions from the same topics.* |
| On-screen text | "RAS प्रीलिम्स ([date]): [X]/[total] सवाल हमारे प्रैक्टिस सेट के टॉपिक से" · "तुलना: [link]" · "मेन्स / अगली परीक्षा: फ्री टेस्ट" |
| Voiceover | **0–3 s** "RAS प्रीलिम्स का पेपर, हमने अपने सेट से मिलाया।"<br>**3–9 s** "[X] सवाल उन्हीं टॉपिक से। हर सवाल की तुलना लिंक पर है, खुद देखो।"<br>**9–12 s** "अगली परीक्षा की तैयारी यहीं से।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Side-by-side official question and matching practice item; comparison page scroll. |
| Primary text | RAS प्रीलिम्स के [X] सवाल हमारे प्रैक्टिस सेट के टॉपिक से मिले। पूरी तुलना [link] पर। पिछले नतीजे आगे की गारंटी नहीं। {D-AFF} |
| Headline | पेपर से मिलान: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'RAS' लिखें" |

---

## 3. Fillers and bundles

Lower budgets; run after the core exams have a winning destination. None of these exams has a free set yet: build and review it first. Ad questions are drafted with answers below.

### 3.1 Bihar STET

| Item | Value |
|---|---|
| Exam date | `[from the official BSEB notice]` + `{D-DATE}` |
| Landing slug | `/bihar-stet` |
| WhatsApp keyword | `STET` |
| Offers | Free test → ₹249 most-probable set; bundle with TRE ₹799 (3.4) |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, BSEB से इसका कोई संबंध नहीं। |
| Note | STET is subject-wise. Run subject-specific copies (Hindi, maths, science, social science, English…) only for subjects that have a free set. |

#### STET-01 · Question challenge (Hindi) · 15 s reel
`stet_quiz_r15_hook01_lp` · `stet_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"STET हिंदी वालों, 10 सेकंड: 'यथाशक्ति' में कौन-सा समास?"**<br>*STET Hindi aspirants, 10 seconds: which samas is 'yathashakti'?* |
| On-screen text | "'यथाशक्ति' में कौन-सा समास है?" · A) तत्पुरुष B) बहुव्रीहि C) अव्ययीभाव D) द्वंद्व · timer 10 → 0 · "जवाब: C) अव्ययीभाव (पहला पद 'यथा' अव्यय)" |
| Voiceover | **0–2 s** "STET हिंदी की तैयारी? दस सेकंड।"<br>**2–10 s** (ticking) "यथाशक्ति, कौन-सा समास?"<br>**10–12 s** "जवाब: अव्ययीभाव। पहला पद 'यथा' अव्यय है, और वही प्रधान।"<br>**12–15 s** "ऐसे सवाल, टाइमर के साथ। अभी फ्री टेस्ट दें।" |
| Visual | Real question screen, 10-second ring graphic, tap C, explanation. |
| Primary text | समास के सवाल आसान दिखते हैं, ऑप्शन देखकर उलझाते हैं। Bihar STET का फ्री टेस्ट, हर जवाब का explanation। {D-AFF} |
| Headline | Bihar STET का फ्री टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'STET' लिखें" |

#### STET-02 · Data / repeat · Static image
`stet_repeat_img_hook02_lp` · `stet_repeat_img_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"STET [subject]: पिछले पेपरों में [टॉपिक] से [X] सवाल"**<br>*STET [subject]: [X] questions from [topic] in past papers* |
| On-screen text | "[टॉपिक]: [X] सवाल" · "पिछले [N] STET पेपर" · "स्रोत: पिछले प्रश्नपत्रों का हमारा विश्लेषण" |
| Voiceover | — |
| Visual | Big number, subject name, plain background. |
| Primary text | STET [subject] में सबसे ज़्यादा सवाल [टॉपिक] से: पिछले [N] पेपरों में [X]। इसी हिसाब से प्रैक्टिस करो। फ्री टेस्ट दो। {D-AFF} |
| Headline | [टॉपिक]: [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'STET' लिखें" |

#### STET-03 · Pain → solution · 30 s reel
`stet_pain_r30_hook03_lp` · `stet_pain_r30_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"ग्रेजुएशन में पढ़ा था, पर 3 साल हो गए। अब STET में वही विषय।"**<br>*Studied it in graduation, but it's been 3 years. Now the same subject in STET.* |
| On-screen text | "विषय पुराना, याद धुँधली" · "सीधे सवाल से शुरू करो" · "गलत → explanation → दोबारा" |
| Voiceover | **0–3 s** "ग्रेजुएशन में पढ़ा था, पर तीन साल हो गए।"<br>**3–10 s** "अब STET में वही विषय। पूरी किताब फिर से शुरू करें? ज़रूरी नहीं।"<br>**10–20 s** "पहले सवाल हल करो। जो गलत हो, उसका explanation पढ़ो। ऐसे पता चलता है कि किस चैप्टर पर लौटना है।"<br>**20–26 s** "Prashnottar पर विषय-वार सवाल, हर जवाब का explanation।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | AI B-roll of an old notebook being opened (no faces); real practice-mode screen recording: wrong answer, explanation, topic tag. |
| Primary text | पुराना विषय दोबारा? पूरी किताब से नहीं, सवालों से शुरू करो, गलतियाँ बताएँगी कहाँ लौटना है। Bihar STET का फ्री टेस्ट। {D-AFF} |
| Headline | सवालों से रिवीज़न शुरू करो |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'STET' लिखें" |

#### STET-04 · OMR / time pressure · Carousel
`stet_omr_car_hook04_lp` · `stet_omr_car_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"STET का पूरा पेपर एक बार घड़ी के साथ किया है?"**<br>*Have you done the full STET paper once against the clock?* |
| On-screen text | **Card 1:** "पूरा पेपर, घड़ी के साथ, एक बार भी?" **Card 2:** "[N] सवाल · [time]" `[confirm pattern]` **Card 3:** "आधे टाइम पर कितने सवाल हुए? नोट करो" **Card 4:** "स्कोर रिपोर्ट: सही, गलत, टाइम" **Card 5:** "पहला पूरा पेपर फ्री" + CTA |
| Voiceover | — |
| Visual | Cards 1–3 text graphics with a clock icon; card 4 real score report; card 5 test start screen. |
| Primary text | विषय आता है, पर पूरा पेपर टाइम में? एक बार घर पर घड़ी के साथ करके देखो। Bihar STET का पहला पेपर फ्री। {D-AFF} |
| Headline | पूरा पेपर, घड़ी के साथ |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'STET' लिखें" |

#### STET-05 · Price contrast · Static image
`stet_price_img_hook05_lp` · `stet_price_img_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"STET की तैयारी के लिए कोचिंग? पहले ₹0 का टेस्ट, फिर ₹249 का सेट।"**<br>*Coaching for STET? First a ₹0 test, then a ₹249 set.* |
| On-screen text | "कोचिंग: हज़ारों में" vs "Prashnottar: फ्री टेस्ट → most-probable सेट ₹249" · `{D-PROB}` |
| Voiceover | — |
| Visual | Split layout; right side phone with the real UPI checkout. |
| Primary text | पहले फ्री टेस्ट से जानो कहाँ खड़े हो। फिर चाहो तो Bihar STET का most-probable सेट ₹249, UPI से। {D-PROB} {D-AFF} |
| Headline | फ्री टेस्ट, फिर ₹249 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'STET' लिखें" |

#### STET-06 · Bilingual reach · 15 s reel
`stet_bi_r15_hook06_lp` · `stet_bi_r15_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"Science English में पढ़ी, पेपर हिंदी में? शब्द दोनों में देखो।"**<br>*Studied science in English, writing the paper in Hindi? See the terms in both.* |
| On-screen text | "ध्वनि की चाल किसमें सबसे ज़्यादा? / Speed of sound is highest in?" · "हिंदी ⇄ English, एक टैप" |
| Voiceover | **0–2 s** "Science English में पढ़ी, पेपर हिंदी में?"<br>**2–8 s** "हर सवाल दोनों भाषाओं में। 'इस्पात' और 'steel' अब अलग नहीं लगेंगे।"<br>**8–12 s** "Explanation भी दोनों में।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Screen recording of a science question (speed of sound, answer: इस्पात / steel) toggling हिंदी ⇄ English. *(Switch must be live.)* |
| Primary text | STET की प्रैक्टिस दोनों भाषाओं में: हर सवाल और explanation हिंदी या English में, एक टैप में। पहला टेस्ट फ्री। {D-AFF} |
| Headline | हिंदी ⇄ English, एक टैप |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'STET' लिखें" |

### 3.2 CTET (Paper 1 and 2)

| Item | Value |
|---|---|
| Exam date | `[from the official CBSE notice]` + `{D-DATE}` |
| Landing slug | `/ctet` |
| WhatsApp keyword | `CTET` |
| Offers | Free test → ₹249 most-probable set; bundle with TRE ₹799 (3.4) |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, CBSE से इसका कोई संबंध नहीं। |
| Pattern facts used | 150 questions, 2.5 hours, Child Development & Pedagogy 30 questions, no negative marking, 60% to qualify (general category): `[re-confirm in the current notification]` |

#### CTET-01 · Question challenge · 15 s reel
`ctet_quiz_r15_hook01_lp` · `ctet_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"CTET वालों, 10 सेकंड: 'ZPD' किसकी देन है?"**<br>*CTET aspirants, 10 seconds: whose concept is the 'ZPD'?* |
| On-screen text | "'समीपस्थ विकास का क्षेत्र' (ZPD) किसकी अवधारणा है?" · A) पियाजे B) वाइगोत्स्की C) कोहलबर्ग D) स्किनर · timer · "जवाब: B) वाइगोत्स्की: बच्चा अकेले क्या कर सकता है और मदद से क्या, उसके बीच का फ़ासला" |
| Voiceover | **0–2 s** "CTET की तैयारी? दस सेकंड।"<br>**2–10 s** (ticking) "ZPD, किसकी अवधारणा?"<br>**10–12 s** "जवाब: वाइगोत्स्की। अकेले और मदद के साथ सीखने के बीच का फ़ासला।"<br>**12–15 s** "ऐसे CDP सवाल, टाइमर के साथ। अभी फ्री टेस्ट दें।" |
| Visual | Real question screen with ring timer; explanation slides up. |
| Primary text | CDP के 30 सवाल दोनों पेपर में आते हैं, और ZPD जैसे टॉपिक बार-बार। आपका जवाब कमेंट में, फिर फ्री टेस्ट में चेक करो। {D-AFF} |
| Headline | CTET का फ्री टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CTET' लिखें" |

#### CTET-02 · Data / repeat · 30 s reel
`ctet_repeat_r30_hook02_lp` · `ctet_repeat_r30_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"CDP के 30 सवाल में पियाजे-वाइगोत्स्की-कोहलबर्ग से [X]"**<br>*Of the 30 CDP questions, [X] from Piaget, Vygotsky and Kohlberg* |
| On-screen text | "CDP: 30 सवाल" · "पियाजे: [X] · वाइगोत्स्की: [X] · कोहलबर्ग: [X] (पिछले [N] पेपर, औसत)" · "इसी पर बना: most-probable सेट ₹249" · `{D-PROB}` |
| Voiceover | **0–3 s** "CTET में बाल विकास और शिक्षाशास्त्र के तीस सवाल।"<br>**3–11 s** "पिछले [N] पेपरों में औसतन [X] सवाल सिर्फ़ तीन नामों से: पियाजे, वाइगोत्स्की, कोहलबर्ग।"<br>**11–19 s** "यानी ये तीन सिद्धांत पक्के, तो CDP का बड़ा हिस्सा मज़बूत।"<br>**19–26 s** "इसी विश्लेषण से बना है most-probable सेट, दो सौ उनचास रुपये। पहले फ्री टेस्ट।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Three name cards with counts (real numbers only), animated in; a question from each in the app; `{D-PROB}` strip at the end. |
| Primary text | CTET CDP के 30 में से औसतन [X] सवाल तीन सिद्धांतों से (पिछले [N] पेपरों का हमारा हिसाब)। पहले फ्री टेस्ट, फिर चाहो तो ₹249 का most-probable सेट। {D-PROB} {D-AFF} |
| Headline | 3 नाम, [X] सवाल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CTET' लिखें" |

#### CTET-03 · Pain → solution · 15 s reel
`ctet_pain_r15_hook03_lp` · `ctet_pain_r15_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"CTET में 90 चाहिए। दो-तीन नंबर से रह जाना सबसे ज़्यादा चुभता है।"**<br>*CTET needs 90. Missing by two or three marks hurts the most.* |
| On-screen text | "क्वालिफ़ाई: 150 में 90 (सामान्य वर्ग)" `[confirm]` · "हर मॉक के बाद: 90 से कितना ऊपर या नीचे?" · "कमज़ोर टॉपिक पर काम" |
| Voiceover | **0–2 s** "CTET में डेढ़ सौ में नब्बे चाहिए।"<br>**2–8 s** "दो-तीन नंबर से रह जाना सबसे ज़्यादा चुभता है। इसलिए हर मॉक के बाद देखो: नब्बे से कितना दूर, और कौन-से टॉपिक नंबर खा रहे हैं।"<br>**8–12 s** "पहला मॉक फ्री।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | A simple line at "90" on a score bar (text graphic), then the real score report with weak topics. |
| Primary text | CTET में मंज़िल साफ़ है: 150 में 90 (सामान्य वर्ग)। हर मॉक के बाद देखो कितने पास हो और कहाँ नंबर जा रहे हैं। पहला मॉक फ्री। {D-AFF} |
| Headline | 90 से कितना दूर? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CTET' लिखें" |

#### CTET-04 · Skip-list · Carousel
`ctet_skip_car_hook04_lp` · `ctet_skip_car_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"CTET: इन टॉपिक पर कम समय दें"**<br>*CTET: spend less time on these topics* |
| On-screen text | **Card 1:** "कम समय दें: पिछले [N] CTET पेपरों के हिसाब से" **Card 2:** "[टॉपिक A]: [X] सवाल" **Card 3:** "[टॉपिक B]: [X] सवाल" **Card 4:** "बचा समय यहाँ: [टॉपिक C]: [X] सवाल" **Card 5:** "पूरी लिस्ट + फ्री टेस्ट" · "कम पूछे गए टॉपिक भी आ सकते हैं, पूरी तरह न छोड़ें।" |
| Voiceover | — |
| Visual | Same card system as TRE-10. |
| Primary text | CTET में पाँच सेक्शन, समय एक। पिछले पेपरों में किन टॉपिक से कम सवाल आए, स्वाइप करके देखो। (कम पूछे गए टॉपिक भी आ सकते हैं, बस कम समय दो।) {D-AFF} |
| Headline | कहाँ कम समय दें |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CTET' लिखें" |

#### CTET-05 · Price contrast · Static image
`ctet_price_img_hook05_lp` · `ctet_price_img_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"CTET के लिए महँगी टेस्ट-सीरीज़? पहले फ्री टेस्ट, फिर ₹249।"**<br>*An expensive test series for CTET? First a free test, then ₹249.* |
| On-screen text | "टेस्ट-सीरीज़: ₹[Y]*" vs "Prashnottar: फ्री टेस्ट → most-probable सेट ₹249" · `{D-PROB}` · "*[source, date]" (or drop the left column if no sourced price) |
| Voiceover | — |
| Visual | Split layout, phone with UPI checkout. |
| Primary text | CTET Paper 1 या 2: पहले फ्री टेस्ट दो, फिर चाहो तो most-probable सेट ₹249, UPI से। {D-PROB} {D-AFF} |
| Headline | फ्री टेस्ट, फिर ₹249 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CTET' लिखें" |

#### CTET-06 · OMR / time pressure · 30 s reel
`ctet_omr_r30_hook06_lp` · `ctet_omr_r30_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"CTET में नेगेटिव मार्किंग नहीं। फिर भी लोग सवाल छोड़ आते हैं।"**<br>*No negative marking in CTET. Yet people still leave questions blank.* |
| On-screen text | "नेगेटिव मार्किंग: नहीं" `[confirm]` · "150 सवाल · 150 मिनट" · "आख़िरी 10 मिनट: कोई गोला खाली नहीं" |
| Voiceover | **0–3 s** "CTET में नेगेटिव मार्किंग नहीं है।"<br>**3–10 s** "फिर भी टाइम ख़त्म होने पर कुछ गोले खाली रह जाते हैं। यानी मुफ़्त के नंबर छूट गए।"<br>**10–20 s** "घर पर पूरा पेपर डेढ़ सौ मिनट में करो, और आख़िरी दस मिनट सिर्फ़ खाली गोलों के लिए रखो।"<br>**20–26 s** "Prashnottar पर पूरा पेपर असली टाइम के साथ।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | Pencil on a plain OMR sheet with a few blank rows (real footage); online mock timer; palette showing unanswered questions in a different colour. |
| Primary text | नेगेटिव मार्किंग नहीं, तो कोई सवाल खाली क्यों? पूरा पेपर टाइम में करने की आदत घर पर बनाओ। CTET का पहला टेस्ट फ्री। {D-AFF} |
| Headline | कोई गोला खाली न रहे |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CTET' लिखें" |

### 3.3 CG TET

| Item | Value |
|---|---|
| Exam date | 26 September 2027 (tentative) → "26 सितंबर 2027 (संभावित)" + `{D-DATE}`; day countdown only once confirmed |
| Landing slug | `/cg-tet` |
| WhatsApp keyword | `CGTET` |
| Offers | Free test → ₹249 most-probable set |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, CG व्यापम से इसका कोई संबंध नहीं। |

#### CGTET-01 · Question challenge · 15 s reel
`cgtet_quiz_r15_hook01_lp` · `cgtet_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"CG TET वालों, 10 सेकंड: 'सिर से पैर की ओर' विकास, कौन-सा सिद्धांत?"**<br>*CG TET aspirants, 10 seconds: development 'from head to toe', which principle?* |
| On-screen text | "बच्चे का विकास सिर से पैर की ओर होता है: यह कौन-सा सिद्धांत है?" · A) समीप-दूराभिमुख B) मस्तकाधोमुखी C) निरंतरता D) एकीकरण · timer · "जवाब: B) मस्तकाधोमुखी (cephalocaudal)" |
| Voiceover | **0–2 s** "CG TET की तैयारी? दस सेकंड।"<br>**2–10 s** (ticking) "सिर से पैर की ओर विकास, कौन-सा सिद्धांत?"<br>**10–12 s** "जवाब: मस्तकाधोमुखी। केंद्र से बाहर की ओर वाला 'समीप-दूराभिमुख' है।"<br>**12–15 s** "ऐसे सवाल, टाइमर के साथ। अभी फ्री टेस्ट दें।" |
| Visual | Real question screen, ring timer, explanation with a simple head-to-toe arrow graphic. |
| Primary text | मस्तकाधोमुखी या समीप-दूराभिमुख? बाल विकास के ऐसे जोड़े ही उलझाते हैं। CG TET का फ्री टेस्ट, हर जवाब का explanation। {D-AFF} |
| Headline | CG TET का फ्री टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CGTET' लिखें" |

#### CGTET-02 · Question challenge · Static image
`cgtet_quiz_img_hook02_lp` · `cgtet_quiz_img_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"RTE अधिनियम 2009 देश में किस तारीख़ से लागू हुआ?"**<br>*From which date did the RTE Act 2009 come into force?* |
| On-screen text | Question · A) 26 जनवरी 2010 B) 1 अप्रैल 2010 C) 15 अगस्त 2009 D) 4 अगस्त 2009 · "जवाब कमेंट में पिन है" |
| Voiceover | — |
| Visual | Calendar-page graphic with four dates; question large. |
| Primary text | पारित कब हुआ और लागू कब, यहीं लोग गड़बड़ करते हैं। CG TET के ऐसे सवाल, explanation के साथ, फ्री टेस्ट में। {D-AFF}<br>*Pinned comment:* "जवाब: B) 1 अप्रैल 2010। (अधिनियम अगस्त 2009 में पारित हुआ था।)" |
| Headline | आपका जवाब? |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CGTET' लिखें" |

#### CGTET-03 · Real countdown · 15 s reel
`cgtet_count_r15_hook03_lp` · `cgtet_count_r15_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"CG TET 26 सितंबर 2027 को संभावित। आराम से, पर आज से।"**<br>*CG TET expected on 26 September 2027. Take it easy, but start today.* |
| On-screen text | "CG TET: 26 सितंबर 2027 (संभावित)" · `{D-DATE}` · "हर हफ़्ते 1 टेस्ट" · "पहला आज, फ्री" |
| Voiceover | **0–2 s** "CG TET, संभावित छब्बीस सितंबर 2027।"<br>**2–8 s** "समय है, इसलिए दबाव नहीं, नियम चाहिए: हर हफ़्ते एक टेस्ट, स्कोर नोट करो।"<br>**8–12 s** "पहला टेस्ट आज, फ्री।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Calendar graphic with the date marked "संभावित"; real score report. Day count added only once the date is confirmed (then "[N] दिन"). |
| Primary text | CG TET की तारीख़ संभावित है, तैयारी का नियम पक्का करो: हर हफ़्ते एक टेस्ट। पहला आज, फ्री। {D-DATE} {D-AFF} |
| Headline | हर हफ़्ते एक टेस्ट |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CGTET' लिखें" |

#### CGTET-04 · Data / repeat · Carousel
`cgtet_repeat_car_hook04_lp` · `cgtet_repeat_car_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"CG TET के पिछले पेपर: किस सेक्शन से कितने सवाल?"**<br>*Past CG TET papers: how many questions from each section?* |
| On-screen text | **Card 1:** hook **Card 2:** "बाल विकास: [X] · सबसे ज़्यादा: [टॉपिक]" **Card 3:** "हिंदी: [X] · सबसे ज़्यादा: [टॉपिक]" **Card 4:** "गणित / पर्यावरण: [X] · सबसे ज़्यादा: [टॉपिक]" **Card 5:** "इसी विश्लेषण पर: most-probable सेट ₹249" + `{D-PROB}` + CTA |
| Voiceover | — |
| Visual | One section per card, big count, topic name; card 5 real checkout screen. Fill from the analysis only. |
| Primary text | CG TET के पिछले [N] पेपरों का सेक्शन-वाइज़ हिसाब, स्वाइप करके देखो। पहले फ्री टेस्ट, फिर चाहो तो ₹249 का most-probable सेट। {D-PROB} {D-AFF} |
| Headline | सेक्शन-वाइज़ हिसाब |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CGTET' लिखें" |

#### CGTET-05 · Pain → solution · 30 s reel
`cgtet_pain_r30_hook05_lp` · `cgtet_pain_r30_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"पियाजे की चारों अवस्थाएँ याद हैं... जब तक सवाल घुमा के न पूछा जाए।"**<br>*You know Piaget's four stages... until the question is twisted.* |
| On-screen text | "रटा: 4 अवस्थाएँ (याद)" `→` "सवाल: 'वस्तु स्थायित्व किस अवस्था में?'" · "रटने से नहीं, लागू करने से" |
| Voiceover | **0–3 s** "पियाजे की चारों अवस्थाएँ याद हैं।"<br>**3–10 s** "पर सवाल आया: 'वस्तु स्थायित्व किस अवस्था में विकसित होता है?' और दिमाग रुक गया।"<br>**10–20 s** "CG TET में सिद्धांत सीधे नहीं, स्थिति के रूप में पूछे जाते हैं। Prashnottar पर ऐसे ही सवाल, हर जवाब का explanation।"<br>**20–26 s** "जवाब, वैसे: संवेदी-गामक अवस्था।"<br>**26–30 s** "पहला टेस्ट फ्री। अभी फ्री टेस्ट दें।" |
| Visual | Text card listing the four stages, then the question pops up; real practice screen with the explanation. |
| Primary text | सिद्धांत याद होना और सवाल में पहचानना, दो अलग बातें हैं। CG TET के बाल विकास के सवाल explanation के साथ, फ्री टेस्ट में। {D-AFF} |
| Headline | रटा हुआ, सवाल में पहचानो |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CGTET' लिखें" |

#### CGTET-06 · Price contrast · Static image
`cgtet_price_img_hook06_lp` · `cgtet_price_img_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"रायपुर-बिलासपुर की कोचिंग से पहले: एक फ्री टेस्ट, घर से।"**<br>*Before coaching in Raipur or Bilaspur: one free test, from home.* |
| On-screen text | "कोचिंग: फीस + शहर का किराया" vs "Prashnottar: फ्री टेस्ट → most-probable सेट ₹249" · `{D-PROB}` |
| Voiceover | — |
| Visual | Split layout; phone with UPI checkout. |
| Primary text | शहर जाने से पहले घर पर अपनी तैयारी नाप लो। CG TET का फ्री टेस्ट, फिर चाहो तो most-probable सेट ₹249। {D-PROB} {D-AFF} |
| Headline | फ्री टेस्ट, फिर ₹249 |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'CGTET' लिखें" |

### 3.4 Bundle: BPSC TRE + CTET (₹799)

| Item | Value |
|---|---|
| Price | ₹799. Contents: `[confirm exactly what the bundle includes]`. No "बचत ₹X" line unless the saving is real against listed prices. |
| Landing | `/bpsc-tre?bundle=ctet` `[confirm route]` |
| WhatsApp keyword | `TRE CTET` |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, BPSC या CBSE से इसका कोई संबंध नहीं। |
| Eligibility line | Any line linking TRE to CTET eligibility must match the TRE 4.0 notification `[confirm]` |

#### TRECTET-01 · Question challenge · 15 s reel
`tre-ctet_quiz_r15_hook01_lp` · `tre-ctet_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"एक सवाल, दो परीक्षा: ये TRE में भी आता है, CTET में भी।"**<br>*One question, two exams: this comes in TRE and in CTET.* |
| On-screen text | "कोहलबर्ग: 'पूर्व-परंपरागत स्तर' की अवस्था कौन-सी?" · A) सामाजिक अनुबंध B) अच्छा लड़का–अच्छी लड़की C) आज्ञापालन और दंड D) सार्वभौमिक नैतिक सिद्धांत · timer · "जवाब: C) आज्ञापालन और दंड अभिमुखता" |
| Voiceover | **0–2 s** "एक सवाल, दो परीक्षा।"<br>**2–10 s** (ticking) "कोहलबर्ग का पूर्व-परंपरागत स्तर, कौन-सी अवस्था?"<br>**10–12 s** "जवाब: आज्ञापालन और दंड। ये TRE में भी पूछा जाता है, CTET में भी।"<br>**12–15 s** "दोनों की तैयारी साथ। अभी फ्री टेस्ट दें।" |
| Visual | Real question screen with a small "TRE + CTET" tag; ring timer; explanation. |
| Primary text | बाल विकास और शिक्षाशास्त्र TRE और CTET दोनों में आता है। दोनों की प्रैक्टिस एक जगह: TRE + CTET बंडल ₹799 ([contents])। पहले फ्री टेस्ट दो। {D-AFF} |
| Headline | TRE + CTET, एक साथ |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE CTET' लिखें" |

#### TRECTET-02 · Data / repeat · Static image
`tre-ctet_repeat_img_hook02_lp` · `tre-ctet_repeat_img_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"TRE और CTET का [X]% सिलेबस एक जैसा"**<br>*[X]% of the TRE and CTET syllabus overlaps* |
| On-screen text | Two overlapping circles: "TRE" / "CTET", middle: "बाल विकास · शिक्षाशास्त्र · भाषा · [topics]" · "[X]% साझा (हमारा सिलेबस-विश्लेषण)" |
| Voiceover | — |
| Visual | Venn diagram text graphic (browser-rendered). `[X]` only from a real syllabus mapping. |
| Primary text | दो परीक्षाएँ, आधी से ज़्यादा तैयारी एक जैसी (हमारे सिलेबस-मिलान के हिसाब से [X]%)। TRE + CTET बंडल ₹799: [contents]। पहले फ्री टेस्ट। {D-AFF} |
| Headline | एक तैयारी, दो परीक्षा |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE CTET' लिखें" |

#### TRECTET-03 · Pain → solution · 30 s reel
`tre-ctet_pain_r30_hook03_lp` · `tre-ctet_pain_r30_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"CTET के लिए एक ऐप, TRE के लिए दूसरा, नोट्स तीसरी जगह?"**<br>*One app for CTET, another for TRE, notes somewhere else?* |
| On-screen text | "CTET: ऐप 1 · TRE: ऐप 2 · नोट्स: रजिस्टर" · "एक जगह: दोनों के मॉक + एक स्कोर रिपोर्ट" · "बंडल ₹799" |
| Voiceover | **0–3 s** "CTET के लिए एक ऐप, TRE के लिए दूसरा, नोट्स कहीं और।"<br>**3–10 s** "एक ही टॉपिक दो जगह पढ़ा जा रहा है, और किसी में पूरा हिसाब नहीं।"<br>**10–20 s** "TRE प्लस CTET बंडल: [contents]। साझा टॉपिक एक बार, बाकी अलग-अलग।"<br>**20–26 s** "सात सौ निन्यानवे रुपये। पहले फ्री टेस्ट देकर देखो।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Phone home screen with several generic app icons (no real brands) collapsing into one; real screen recording of switching between the TRE and CTET sections in the app *(bundle view must be live)*. |
| Primary text | दो परीक्षा, एक जगह तैयारी। TRE + CTET बंडल ₹799: [contents]। पहले फ्री टेस्ट दो, फिर तय करो। {D-AFF} |
| Headline | दोनों की तैयारी एक जगह |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE CTET' लिखें" |

#### TRECTET-04 · Price · Carousel
`tre-ctet_price_car_hook04_lp` · `tre-ctet_price_car_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"₹799 में TRE + CTET: क्या-क्या मिलेगा, साफ़-साफ़"**<br>*TRE + CTET for ₹799: exactly what you get* |
| On-screen text | **Card 1:** hook **Card 2:** "TRE: [contents]" **Card 3:** "CTET: [contents]" **Card 4:** "एक बार ₹799, UPI से · वैधता: [validity]" **Card 5:** "पहले फ्री टेस्ट" + CTA |
| Voiceover | — |
| Visual | Plain itemised cards; card 4 real checkout screen. Transparency is the angle: no small print. |
| Primary text | कोई छुपी शर्त नहीं: TRE + CTET बंडल ₹799 में [contents], वैधता [validity]। पहले फ्री टेस्ट दो। {D-AFF} |
| Headline | ₹799: पूरा हिसाब |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE CTET' लिखें" |

#### TRECTET-05 · Real countdown · 15 s reel
`tre-ctet_count_r15_hook05_lp` · `tre-ctet_count_r15_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"पहले CTET ([date]), फिर TRE 4.0 (संभावित जुलाई 2027)। एक ही तैयारी, दो पड़ाव।"**<br>*First CTET ([date]), then TRE 4.0 (expected July 2027). One prep, two stops.* |
| On-screen text | Timeline: "आज → CTET [official date] → TRE 4.0 संभावित जुलाई 2027" · `{D-DATE}` · "बंडल ₹799" |
| Voiceover | **0–2 s** "पहले CTET, फिर TRE।"<br>**2–8 s** "CTET [date] को, TRE चार संभावित जुलाई 2027 में। बाल विकास की तैयारी दोनों में काम आएगी।"<br>**8–12 s** "दोनों का बंडल, सात सौ निन्यानवे रुपये। पहले फ्री टेस्ट।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Timeline graphic with two milestones; real app screen. |
| Primary text | CTET [official date], TRE 4.0 संभावित जुलाई 2027। एक तैयारी, दो पड़ाव: TRE + CTET बंडल ₹799 ([contents])। {D-DATE} {D-AFF} |
| Headline | CTET फिर TRE: एक प्लान |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE CTET' लिखें" |

#### TRECTET-06 · Bilingual reach · Static image
`tre-ctet_bi_img_hook06_lp` · `tre-ctet_bi_img_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"CTET में भाषा चुननी पड़ती है, TRE में भी। प्रैक्टिस दोनों भाषाओं में।"**<br>*CTET makes you pick a language, so does TRE. Practise in both.* |
| On-screen text | "ZPD / समीपस्थ विकास का क्षेत्र" · "हर सवाल: हिंदी ⇄ English" · "TRE + CTET बंडल ₹799" |
| Voiceover | — |
| Visual | Phone screenshot split Hindi/English. *(Switch must be live.)* |
| Primary text | शिक्षाशास्त्र के शब्द हिंदी में भी, English में भी पक्के करो। TRE + CTET की प्रैक्टिस दोनों भाषाओं में, बंडल ₹799 ([contents])। पहले फ्री टेस्ट। {D-AFF} |
| Headline | दोनों भाषा, दोनों परीक्षा |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE CTET' लिखें" |

### 3.5 Bundle: BPSC TRE + Bihar STET (₹799)

| Item | Value |
|---|---|
| Price | ₹799. Contents: `[confirm]`. No savings claim unless real. |
| Landing | `/bpsc-tre?bundle=stet` `[confirm route]` |
| WhatsApp keyword | `TRE STET` |
| `{D-AFF}` | Prashnottar एक स्वतंत्र प्रैक्टिस प्लेटफ़ॉर्म है, BPSC या BSEB से इसका कोई संबंध नहीं। |
| Audience | Aspirants for classes 9–12 (TRE secondary/higher secondary levels); eligibility link per TRE 4.0 notification `[confirm]` |

#### TRESTET-01 · Question challenge · 15 s reel
`tre-stet_quiz_r15_hook01_lp` · `tre-stet_quiz_r15_hook01_wa`

| Field | Copy |
|---|---|
| Hook | **"कक्षा 9–12 के लिए तैयारी? 10 सेकंड: 'उज्ज्वल' सही है या 'उज्वल'?"**<br>*Preparing for classes 9–12? 10 seconds: is 'ujjwal' spelt with one j or two?* |
| On-screen text | "शुद्ध वर्तनी चुनिए:" · A) आशिर्वाद B) उज्ज्वल C) कवियत्री D) अत्याधिक · timer · "जवाब: B) उज्ज्वल (सही: आशीर्वाद, कवयित्री, अत्यधिक)" |
| Voiceover | **0–2 s** "TRE और STET, दोनों की तैयारी? दस सेकंड।"<br>**2–10 s** (ticking) "शुद्ध वर्तनी, कौन-सी?"<br>**10–12 s** "जवाब: उज्ज्वल। बाकी तीनों की सही वर्तनी भी देख लो।"<br>**12–15 s** "दोनों परीक्षा, एक जगह। अभी फ्री टेस्ट दें।" |
| Visual | Real question screen with a "TRE + STET" tag; explanation lists the three corrected spellings. |
| Primary text | आशीर्वाद, कवयित्री, अत्यधिक: तीन में से कितने सही लिखते थे? TRE और STET दोनों की प्रैक्टिस एक जगह: बंडल ₹799 ([contents])। पहले फ्री टेस्ट। {D-AFF} |
| Headline | TRE + STET, एक साथ |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE STET' लिखें" |

#### TRESTET-02 · Data / repeat · Static image
`tre-stet_repeat_img_hook02_lp` · `tre-stet_repeat_img_hook02_wa`

| Field | Copy |
|---|---|
| Hook | **"STET [subject] और TRE [subject]: [X] टॉपिक साझा"**<br>*STET [subject] and TRE [subject]: [X] topics in common* |
| On-screen text | Venn: "STET [subject]" / "TRE [subject]", middle: "[topics]" · "[X] साझा टॉपिक (हमारा सिलेबस-मिलान)" |
| Voiceover | — |
| Visual | Venn text graphic; one per subject that has content. |
| Primary text | एक ही विषय, दो परीक्षा: STET और TRE [subject] में [X] टॉपिक साझा। बंडल ₹799 ([contents])। पहले फ्री टेस्ट। {D-AFF} |
| Headline | [X] टॉपिक साझा |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE STET' लिखें" |

#### TRESTET-03 · Pain → solution · 30 s reel
`tre-stet_pain_r30_hook03_lp` · `tre-stet_pain_r30_hook03_wa`

| Field | Copy |
|---|---|
| Hook | **"STET की तैयारी अलग, TRE की अलग। समय एक ही है।"**<br>*STET prep separate, TRE prep separate. The time is the same.* |
| On-screen text | "STET: विषय · TRE: विषय + सामान्य अध्ययन" · "साझा हिस्सा एक बार, बाकी अलग" · "बंडल ₹799" |
| Voiceover | **0–3 s** "STET की तैयारी अलग, TRE की अलग।"<br>**3–10 s** "पर दिन में घंटे उतने ही हैं। जो विषय दोनों में है, उसे दो बार क्यों पढ़ना?"<br>**10–20 s** "TRE प्लस STET बंडल: [contents]। साझा टॉपिक एक बार, बाकी अलग-अलग, एक ही स्कोर रिपोर्ट में।"<br>**20–26 s** "सात सौ निन्यानवे रुपये। पहले फ्री टेस्ट।"<br>**26–30 s** "अभी फ्री टेस्ट दें।" |
| Visual | Two timetables merging into one (text graphic); real app screen recording *(bundle view must be live)*. |
| Primary text | दो परीक्षा, एक टाइम-टेबल। TRE + STET बंडल ₹799: [contents]। पहले फ्री टेस्ट दो, फिर तय करो। {D-AFF} |
| Headline | दो परीक्षा, एक टाइम-टेबल |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE STET' लिखें" |

#### TRESTET-04 · Price · Static image
`tre-stet_price_img_hook04_lp` · `tre-stet_price_img_hook04_wa`

| Field | Copy |
|---|---|
| Hook | **"TRE + STET: ₹799 में क्या-क्या, एक नज़र में"**<br>*TRE + STET: what ₹799 gets you, at a glance* |
| On-screen text | "TRE: [contents]" · "STET: [contents]" · "एक बार ₹799 · वैधता: [validity]" · "पहले फ्री टेस्ट" |
| Voiceover | — |
| Visual | Itemised receipt-style layout (clearly our own design, not a fake bill); phone with UPI checkout. |
| Primary text | साफ़ हिसाब: TRE + STET बंडल ₹799 में [contents], वैधता [validity]। पहले फ्री टेस्ट दो। {D-AFF} |
| Headline | ₹799: पूरा हिसाब |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE STET' लिखें" |

#### TRESTET-05 · Skip-list · Carousel
`tre-stet_skip_car_hook05_lp` · `tre-stet_skip_car_hook05_wa`

| Field | Copy |
|---|---|
| Hook | **"TRE + STET [subject]: इन टॉपिक पर कम समय दें"**<br>*TRE + STET [subject]: spend less time on these topics* |
| On-screen text | **Card 1:** hook "(दोनों के पिछले पेपरों के हिसाब से)" **Card 2:** "[टॉपिक A]: TRE [X] · STET [X]" **Card 3:** "[टॉपिक B]: TRE [X] · STET [X]" **Card 4:** "दोनों में ज़्यादा: [टॉपिक C]: TRE [X] · STET [X]" **Card 5:** "बंडल ₹799 + फ्री टेस्ट" · "कम पूछे गए टॉपिक भी आ सकते हैं, पूरी तरह न छोड़ें।" |
| Voiceover | — |
| Visual | Card system as TRE-10 with two counts per topic. |
| Primary text | दोनों परीक्षाओं में कौन-से टॉपिक कम आते हैं, कौन-से ज़्यादा: स्वाइप करके देखो। (कम पूछे गए टॉपिक भी आ सकते हैं, बस कम समय दो।) {D-AFF} |
| Headline | दोनों में कहाँ कम समय दें |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE STET' लिखें" |

#### TRESTET-06 · OMR / time pressure · 15 s reel
`tre-stet_omr_r15_hook06_lp` · `tre-stet_omr_r15_hook06_wa`

| Field | Copy |
|---|---|
| Hook | **"दो परीक्षा, दो पैटर्न, दो घड़ियाँ।"**<br>*Two exams, two patterns, two clocks.* |
| On-screen text | "STET: [N] सवाल · [time]" · "TRE 4.0: [N] सवाल · [time]" `[confirm both]` · "दोनों के पूरे पेपर, असली टाइम में" |
| Voiceover | **0–2 s** "दो परीक्षा, दो पैटर्न।"<br>**2–8 s** "STET का पेपर अलग टाइम का, TRE का अलग। दोनों की घड़ी की आदत अलग बननी चाहिए।"<br>**8–12 s** "बंडल में दोनों के पूरे पेपर, असली टाइम के साथ।"<br>**12–15 s** "अभी फ्री टेस्ट दें।" |
| Visual | Two clock graphics side by side with the confirmed timings; online mock timer for each. |
| Primary text | STET और TRE के पेपर का समय और पैटर्न अलग है। दोनों की टाइम्ड प्रैक्टिस: बंडल ₹799 ([contents])। पहले फ्री टेस्ट। {D-AFF} |
| Headline | दोनों पेपर, असली टाइम में |
| CTA | LP: "अभी फ्री टेस्ट दें" · WA: "WhatsApp पर 'TRE STET' लिखें" |

---

## 4. Production notes

### 4.1 Pipeline

| Step | Tool | Output |
|---|---|---|
| 1. Fill placeholders | Past-paper analysis sheet, notifications, product | Ad copy with no `[ ]` left (or the ad waits) |
| 2. Screen recordings | Real Android phone, live app | 9:16 clips of question, timer, palette, score report, checkout |
| 3. Hindi text graphics | Browser (HTML/CSS → PNG) | Question cards, charts, end cards, disclaimer strips, carousel cards, statics |
| 4. Voiceover | ElevenLabs | One body file per reel + two CTA lines (LP, WA) |
| 5. B-roll (optional) | Higgsfield | 3–5 s AI clips, no text, no faces |
| 6. Assembly | CapCut | `_lp.mp4` and `_wa.mp4` per reel |
| 7. QA | This file's checklist (section 0) + 4.7 | Upload |

### 4.2 Voiceover: ElevenLabs

- **API key:** coming later; it goes in the server `.env` as `ELEVENLABS_API_KEY` (never committed). Until then, scripts are final but no audio is rendered.
- **Voice choice is made from the ElevenLabs voice list**, not from memory or a guessed ID: list the available voices, filter for Hindi, shortlist 2 male and 2 female voices that sound like a friendly senior, not a news anchor. Render TRE-01 and TRE-08 with each, pick by ear (ideally with two or three real aspirants listening), and write the chosen `voice_id` here: **Voice A (default):** `[voice_id]` · **Voice B (A/B test):** `[voice_id]`.
- **Model:** the current ElevenLabs multilingual model that supports Hindi (check the model list when the key arrives).
- **Settings to start from:** natural, slightly fast delivery for reels; keep stability moderate so it doesn't sound robotic; same settings for every ad of a test so voice isn't a variable.
- **Pronunciation:** the scripts already write numbers and prices as words. Spell acronyms the way they should be said: "बी पी एस सी", "एम पी पी एस सी", "आर ए एस" (not "रास"), "सी टेट", "एस टेट", "सी जी टेट", "प्रश्नोत्तर". Add these to a pronunciation dictionary once the key is in.
- **Save credits:** ElevenLabs bills by characters. Render each reel's body once, and the two CTA lines ("अभी फ्री टेस्ट दें।" / "WhatsApp पर '[KEY]' लिखें।") once per exam, then splice in CapCut. Check the character estimate against the remaining credit before each batch.
- **Files:** `[ad name without dest]_body.mp3`, `[exam]_cta_lp.mp3`, `[exam]_cta_wa.mp3`, kept out of the public repo.

### 4.3 AI video B-roll: Higgsfield

- **API key:** coming later (`HIGGSFIELD_API_KEY` in `.env`). Until then, use real footage or plain text graphics instead of B-roll; no ad depends on AI video.
- **B-roll only.** Never the product, never a "student", never a testimonial. No text in frame (AI garbles Devanagari), no logos, no faces or faces turned away, 9:16, 3–5 s.
- **Check the credit cost before any video generation:** look up the per-clip cost for the chosen model and duration, generate one test clip, then the batch; log clip, cost and prompt. Don't retry a generation blindly: each call is charged.
- **Shot list (reused across exams):**

| Shot | Used in | Prompt direction |
|---|---|---|
| Wall clock + pen over a plain answer sheet | TRE-08, *-13 | Close-up, warm lamp light, night, shallow depth of field, no text visible |
| Stack of books and a notebook on a desk | TRE-09 | Overhead, morning light, worn paperbacks with blank spines |
| Old notebook being opened | STET-03 | Hands only, dust in light beam |
| Small rented room with desk and bag | MPPSC-12 | Static wide shot, no people |
| Busy street with blurred coaching banners | TRE-12 | Heavy blur, no readable text, evening |
| Bus on a desert highway at dawn | RAS-12 | Wide, golden hour |
| Stone stupa silhouette at dusk | MPPSC-01 (optional) | Silhouette only, generic |
| Tea cup and clock in afternoon light | MPPSC-09 | Close-up, steam |

- Turn on Meta's AI disclosure where Meta asks for it.

### 4.4 Hindi text graphics: rendered in the browser

AI image models garble Devanagari (broken matras and conjuncts), so every piece of Hindi text on screen is HTML/CSS rendered to PNG in a headless browser.

- **Templates:** question card (question + 4/5 options), 10-second ring (PNG sequence or a CapCut timer over a static card), bar/donut chart, calendar/countdown number, Venn, carousel card, disclaimer strip, end card (LP and WA versions), static ad layouts.
- **Sizes:** 1080×1920 (reels, stories, static 9:16), 1080×1350 (feed static, carousel).
- **Fonts:** Noto Sans Devanagari, Mukta or Hind (Google Fonts). Check conjuncts and matras in every render: क्ष, ज्ञ, द्ध, ज्ज्व, र्य, श्र, ॉ.
- **Style:** one accent colour per exam that doesn't copy any commission's branding; high contrast; key text inside the safe zone (not in the top ~14% or bottom ~35% of 9:16).
- **Data graphics** (charts, counts) are generated from the analysis sheet, not typed by hand, so the ad and the source never disagree.

### 4.5 Screen recordings of the real product

- Record on a mid-range Android phone (what most of the audience uses), clean status bar (no notifications, full battery), light theme and dark theme both, 1080 wide.
- Use reviewed free-set questions only. Score reports shown are demo attempts: never caption one as a real person's result.
- Only record features that are live (checklist rule 12). Features some ads depend on: Hindi/English switch, weak-topic report, net score after negative marking, 5-option papers, printable paper, CSAT mocks, bundle view, fast-track plan, ₹249 UPI checkout.

### 4.6 Final assembly: CapCut

- Timeline: hook graphic/recording → payload → end card. Body VO, then the destination's CTA line.
- **Burned-in Hindi captions** on every spoken word. CapCut's auto-captions can mangle Hindi: correct every line by hand against the script.
- Ticking clock and other SFX: only assets licensed for commercial use (in CapCut, the commercial-use filter).
- Export H.264, 1080×1920, 30 fps, exact length (15 s / 30 s). Two exports per reel: `[ad name]_lp.mp4` and `[ad name]_wa.mp4` (only the end card and last line differ).

### 4.7 Pre-upload QA

| Check | |
|---|---|
| Section 0 checklist passed | |
| No `[ ]` placeholders left in copy, graphics or VO | |
| Captions match VO word for word | |
| `{D-PROB}` (if most-probable mentioned), `{D-AFF}` and `{D-DATE}` (if a tentative date) present and readable ≥3 s | |
| Ad name follows `exam_angle_format_hookNN_dest`; same name in `utm_content` | |
| LP link opens the right exam's free test; WA button pre-fills the right keyword | |
| The question in the ad is the same as in the live free set, and reviewed | |

---

## 5. WhatsApp follow-up scripts (72-hour window)

### 5.1 Rules

- **Who gets them:** people who wrote the keyword to our number (click-to-WhatsApp) and replied "हाँ" to the follow-up question, and landing-page visitors who left a number with the consent box ticked (`consent: true` in `/api/leads`).
- **Meta's messaging rules:** within 24 hours of the person's last message we can reply freely. After that, and for every landing-page lead (who hasn't messaged us), messages go out as **pre-approved WhatsApp template messages** (Marketing or Utility category, as Meta classifies them). The scripts below are written as templates: `{{1}}` name, `{{2}}` exam name in Hindi (e.g. "BPSC TRE 4.0"), `{{3}}` link, `{{4}}` score, `{{5}}` weakest topic.
- **Timing:** one message a day at most, between 9 AM and 8 PM. Sequence ends after day 3; nothing more unless the person writes back or buys.
- **STOP:** every message carries the opt-out line. "STOP", "stop", "रोकें", "बंद" → mark the lead opted out, send one confirmation, never message again.
- **Honesty:** no fake deadlines, no "सीटें ख़त्म", no "आख़िरी मौका". A real offer end date may be mentioned only if it is real. Most-probable set messages always carry `{D-PROB}`.
- **n8n:** these map to `step` values in `/api/automation/followups`: `0` welcome, `1` day-1 nudge, `2` day-2 mini-mock, `3` day-3 offer, `10` upsell.
- **Language:** send the Hindi version by default; Hinglish if the person writes in Roman script; English if they write in English.

### 5.2 Step 0: welcome + free set link (immediately)

**Hindi**
> नमस्ते {{1}}! Prashnottar में आपका स्वागत है।
> आपका {{2}} का फ्री टेस्ट यहाँ है: {{3}}
> टाइमर के साथ दीजिए; आख़िर में स्कोर और हर सवाल का explanation मिलेगा।
> क्या अगले 3 दिन रोज़ एक छोटा प्रैक्टिस मैसेज भेजें? "हाँ" लिखें।
> मैसेज बंद करने के लिए STOP लिखें।

**Hinglish**
> Namaste {{1}}! Prashnottar mein aapka swagat hai.
> Aapka {{2}} ka free test yahan hai: {{3}}
> Timer ke saath dijiye; end mein score aur har sawaal ka explanation milega.
> Kya agle 3 din roz ek chhota practice message bhejein? "Haan" likhein.
> Messages band karne ke liye STOP likhein.

**English**
> Hi {{1}}, welcome to Prashnottar.
> Here's your free {{2}} test: {{3}}
> Take it with the timer on; you'll get your score and an explanation for every question at the end.
> Want one short practice message a day for the next 3 days? Reply "Yes".
> Reply STOP to stop messages.

*(For landing-page leads, drop the "हाँ" question: consent was given on the page. Replace it with: "अगले 3 दिन रोज़ एक छोटा प्रैक्टिस मैसेज आएगा।")*

### 5.3 Step 1: day-1 nudge (~24 h)

**Variant A, test not taken yet**

**Hindi**
> {{1}}, आपका {{2}} का फ्री टेस्ट अभी बाकी है।
> [duration] मिनट निकालिए, फ़ोन साइलेंट कीजिए, और असली पेपर की तरह दीजिए: {{3}}
> स्कोर से पता चलेगा कि अगला हफ़्ता किस टॉपिक पर लगाना है।
> STOP लिखें तो मैसेज बंद।

**Hinglish**
> {{1}}, aapka {{2}} ka free test abhi baaki hai.
> [duration] minute nikaliye, phone silent kijiye, aur asli paper ki tarah dijiye: {{3}}
> Score se pata chalega ki agla hafta kis topic par lagana hai.
> STOP likhein to messages band.

**English**
> {{1}}, your free {{2}} test is still waiting.
> Set aside [duration] minutes, put your phone on silent, and take it like the real paper: {{3}}
> Your score will show which topics to work on next week.
> Reply STOP to stop messages.

**Variant B, test taken**

**Hindi**
> {{1}}, आपका स्कोर {{4}} रहा। सबसे ज़्यादा नंबर {{5}} में कटे।
> आज 20 मिनट सिर्फ़ {{5}} पर दीजिए, फिर कल का मिनी-मॉक देखिए।
> गलत सवालों के explanation यहाँ: {{3}}
> STOP लिखें तो मैसेज बंद।

**Hinglish**
> {{1}}, aapka score {{4}} raha. Sabse zyada number {{5}} mein kate.
> Aaj 20 minute sirf {{5}} par dijiye, phir kal ka mini-mock dekhiye.
> Galat sawaalon ke explanation yahan: {{3}}
> STOP likhein to messages band.

**English**
> {{1}}, you scored {{4}}. You lost the most marks in {{5}}.
> Spend 20 minutes on {{5}} today; tomorrow there's a mini-mock.
> Explanations for the ones you missed: {{3}}
> Reply STOP to stop messages.

### 5.4 Step 2: day-2 mini-mock (~48 h)

*Needs a free 10-question mini-mock per exam `[confirm it exists; otherwise link a free topic set]`.*

**Hindi**
> {{1}}, आज का मिनी-मॉक: 10 सवाल, [N] मिनट। 
> चाय बनने से पहले ख़त्म हो जाएगा: {{3}}
> पूरा करके अपना स्कोर यहाँ भेजिए, अगर चाहें तो हम बताएँगे किस टॉपिक पर ध्यान दें।
> STOP लिखें तो मैसेज बंद।

**Hinglish**
> {{1}}, aaj ka mini-mock: 10 sawaal, [N] minute.
> Chai banne se pehle khatam ho jayega: {{3}}
> Poora karke apna score yahan bhejiye, chahein to hum batayenge kis topic par dhyaan dein.
> STOP likhein to messages band.

**English**
> {{1}}, today's mini-mock: 10 questions, [N] minutes.
> Done before your tea is: {{3}}
> Send us your score if you like, and we'll suggest which topic to focus on.
> Reply STOP to stop messages.

### 5.5 Step 3: day-3 offer (~72 h, last message of the sequence)

**Hindi**
> {{1}}, अगर आगे प्रैक्टिस करनी है तो:
> {{2}} का most-probable सेट: ₹249, एक बार, UPI से: {{3}}
> यह सेट पिछले वर्षों के प्रश्नपत्रों के विश्लेषण पर आधारित है; असली पेपर के सवाल अलग हो सकते हैं।
> [Only if a real offer exists: "यह कीमत [real end date] तक है।"]
> अभी नहीं लेना? कोई बात नहीं, आपका फ्री टेस्ट आपके पास रहेगा। ये इस सीरीज़ का आख़िरी मैसेज है।
> STOP लिखें तो मैसेज बंद।

**Hinglish**
> {{1}}, agar aage practice karni hai to:
> {{2}} ka most-probable set: ₹249, ek baar, UPI se: {{3}}
> Ye set pichhle saalon ke question papers ke analysis par based hai; asli paper ke sawaal alag ho sakte hain.
> [Only if a real offer exists: "Ye price [real end date] tak hai."]
> Abhi nahi lena? Koi baat nahi, aapka free test aapke paas rahega. Ye is series ka aakhri message hai.
> STOP likhein to messages band.

**English**
> {{1}}, if you'd like more practice:
> The {{2}} most-probable set: ₹249, one-time, by UPI: {{3}}
> It's based on analysis of past papers; actual exam questions may differ.
> [Only if a real offer exists: "This price is valid until [real end date]."]
> Not now? No problem, your free test stays yours. This is the last message in this series.
> Reply STOP to stop messages.

### 5.6 Step 10: ₹999 upsell for ₹249 buyers

*Send once: when the buyer finishes the most-probable set, or 48 hours after purchase, whichever comes first, within Meta's messaging rules (5.1). Only state a credit for the ₹249 if the checkout actually applies it.*

**Hindi**
> {{1}}, most-probable सेट लेने के लिए धन्यवाद। उम्मीद है प्रैक्टिस अच्छी चल रही है।
> अगर परीक्षा तक पूरी तैयारी एक जगह चाहिए: {{2}} का पूरा Pass / 3 महीने का फ़ास्ट-ट्रैक ₹999: [contents]।
> [Only if true: "आपके ₹249 इसमें जुड़ जाएँगे, बाकी ₹750।"]
> देखिए: {{3}}
> ज़रूरत नहीं है तो बिल्कुल ठीक, आपका सेट जैसा है वैसा रहेगा।
> STOP लिखें तो मैसेज बंद।

**Hinglish**
> {{1}}, most-probable set lene ke liye dhanyavaad. Ummeed hai practice achchhi chal rahi hai.
> Agar exam tak poori taiyaari ek jagah chahiye: {{2}} ka full Pass / 3 mahine ka fast-track ₹999: [contents].
> [Only if true: "Aapke ₹249 ismein jud jayenge, baaki ₹750."]
> Dekhiye: {{3}}
> Zaroorat nahi hai to bilkul theek, aapka set jaisa hai waisa rahega.
> STOP likhein to messages band.

**English**
> {{1}}, thanks for getting the most-probable set. Hope the practice is going well.
> If you want everything in one place until the exam: the full {{2}} Pass / 3-month fast-track is ₹999: [contents].
> [Only if true: "Your ₹249 counts towards it, so you pay ₹750."]
> Details: {{3}}
> If you don't need it, that's completely fine; your set stays as it is.
> Reply STOP to stop messages.

### 5.7 STOP confirmation

**Hindi:** ठीक है {{1}}, अब आपको Prashnottar से कोई मैसेज नहीं आएगा। कभी ज़रूरत हो तो यहीं लिख दीजिए।
**Hinglish:** Theek hai {{1}}, ab aapko Prashnottar se koi message nahi aayega. Kabhi zaroorat ho to yahin likh dijiye.
**English:** Done, {{1}}. You won't get any more messages from Prashnottar. Write here any time if you need us.

---

## 6. Ad count and open placeholders

| Exam / bundle | Ads | Of which gated (run later) |
|---|---|---|
| BPSC TRE 4.0 | 15 | TRE-07 (after official date), TRE-15 (after exam) |
| BPSC CCE 73rd Prelims | 15 | CCE-07 (after official date), CCE-15 (after exam) |
| MPPSC Prelims | 15 | MPPSC-15 (after 24 Jan exam) |
| RAS Prelims | 15 | RAS-07 (after official date), RAS-15 (after exam) |
| Bihar STET | 6 | — |
| CTET | 6 | — |
| CG TET | 6 | — |
| TRE + CTET bundle | 6 | — |
| TRE + STET bundle | 6 | — |
| **Total** | **90** (180 uploads with `_lp` and `_wa`) | |

**Placeholders to fill before the affected ads run:** `[X]` / `[N]` counts and topics from the past-paper analysis (all `repeat`, `skip`, `proof` ads); `[official date]` and day counts; `[Y]` sourced coaching prices; fast-track and bundle `[contents]` and `[validity]`; pattern facts marked `[confirm]` (question counts, timing, negative marking, RAS 5th option, TRE 4.0 mode, CSAT rule, TET eligibility); `[domain]`; ElevenLabs `[voice_id]`; mini-mock link; bundle landing routes.
