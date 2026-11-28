# Prashnottar: architecture and contracts

Every part of the build follows this file. Change it here first, then in code.

## Layout

| Path | What | Language |
|---|---|---|
| `web/` | Website and the app's UI (Astro, static build in `web/dist`) | TypeScript |
| `server/` | API server: auth, leads, attempts, chatbot, WhatsApp bot replies, admin. Serves `web/dist` too. | Rust (axum, Postgres on Supabase) |
| `app/` | Native app shell for Android, iOS and Windows. Bundles `web/dist`. | Rust (Tauri 2) |
| `content/bank/<exam>/*.json` | Question bank (the paid asset). **Gitignored**: the repo is public. | JSON |
| `content/free/` | Free sample questions that may be public | JSON |
| `pipeline/` | Validate, review (filter agent), assemble papers, PDFs | Python |
| `scraper/` | Official PYQ downloader and OCR | Python + Docker |
| `automation/n8n/` | n8n workflows for WhatsApp follow-ups | JSON |
| `adscript.md` | Ad creatives and scripts | Markdown |
| `content/papers/<exam>/*.json` | Assembled paid papers (mocks, sample, probable). **Gitignored**, served only by the API. | JSON |

## Exams (slugs)

| Slug | Exam | Track |
|---|---|---|
| `bpsc-tre` | BPSC TRE 4.0 (Bihar teacher recruitment) | Core |
| `bpsc-cce` | BPSC CCE Prelims | Core |
| `mppsc` | MPPSC State Service Prelims | Core |
| `ras` | RPSC RAS Prelims | Core |
| `bihar-stet` | Bihar STET | Filler (bundle with TRE) |
| `ctet` | CTET Paper 1 and 2 | Filler (bundle with TRE) |
| `cg-tet` | Chhattisgarh TET | Filler |

Parked (removed from the site): `bihar-daroga`, `up-si`.

## Question bank format

One file per batch: `content/bank/<exam>/<subject-slug>-NN.json` containing a JSON **array** of questions:

```jsonc
{
  "id": "bpsc-cce-hist-0001",          // <exam>-<subject-slug>-<4 digits>, unique
  "exam": "bpsc-cce",
  "subject": { "en": "History", "hi": "इतिहास" },
  "topic": { "en": "Modern India: 1857", "hi": "आधुनिक भारत: 1857" },
  "difficulty": "easy",                // easy | medium | hard
  "type": "single",                    // single | statement | match | assertion | sequence | numeric
  "text": { "en": "...", "hi": "..." },
  "options": [ { "en": "...", "hi": "..." } ],   // 4, or 5 where the exam uses a 5th option
  "answer": 0,                         // 0-based index of the correct option
  "explanation": { "en": "...", "hi": "..." },
  "source": "generated",               // generated | pyq
  "pyq_ref": null,                     // for pyq: "BPSC 69th Prelims 2023 Q12"; else null
  "variant_of": null,                  // id of the question this one varies, else null
  "time_sensitive": false,             // true for current affairs / facts that change
  "facts_as_of": null,                 // "2026-11" when time_sensitive
  "status": "draft"                    // draft | reviewed | rejected
}
```

Hindi-only items (Hindi grammar): same Hindi text in `en` and `hi`. English-language items: same English text in both.

## Paper format (assembled from the bank)

Free papers: `web/src/data/papers/<exam>/<paper-id>.json` (public, in the static build). Paid papers: `content/papers/<exam>/<paper-id>.json` (never in the static build). Both use `web/src/data/PAPER_FORMAT.md`, with:
- `kind`: `free` | `mock` | `sample` | `probable` | `pyq`
- options: 4 or 5
- each question keeps its bank `id` as `qid`
- mock ids are never reused or regenerated; new mocks get the next number

## API (served by `server/`, base path `/api`)

Auth: an HttpOnly cookie `pr_session` **or** `Authorization: Bearer <token>` (the native app uses the token). The same token is returned in JSON on login.

| Method and path | Body / query | Returns | Who |
|---|---|---|---|
| `POST /api/auth/login` | `{ "phone": "10 digits", "password": "..." }` (admin uses `ADMIN_PHONE`) | `{ "token", "role": "admin" \| "student", "name" }` | anyone |
| `POST /api/auth/register` | `{ "name", "phone", "password" }` | same as login | anyone |
| `POST /api/auth/logout` | | `{ "ok": true }` | signed in |
| `GET /api/auth/me` | | `{ "role", "name", "phone", "passes": ["bpsc-tre"] }` | signed in |
| `POST /api/leads` | `{ "phone", "name"?, "exam", "score"?, "total"?, "source": "landing" \| "ctwa" \| "app", "consent": true }` | `{ "ok": true }` | anyone |
| `POST /api/attempts` | `{ "exam", "paper", "answers": [int\|null], "score", "total", "topics": { "<topic>": [correct, total] } }` | `{ "ok": true, "id" }` | anyone (linked if signed in) |
| `POST /api/chat` | `{ "messages": [{ "role": "user"\|"assistant", "content": "..." }], "exam"?, "lang"?: "hi"\|"en" }` | `{ "reply": "..." }` | anyone (rate-limited) |
| `POST /api/bot/whatsapp` | `{ "from", "name"?, "text", "history"?: [...] }` | `{ "reply", "handoff": bool }` | n8n (header `X-Automation-Key`) |
| `GET /api/automation/followups` | | `[{ "lead_id", "phone", "name", "exam", "step", "message" }]` due now | n8n |
| `POST /api/automation/followups/{lead_id}` | `{ "step", "status": "sent" \| "failed" }` | `{ "ok": true }` | n8n |
| `GET /api/admin/stats` | | counts: leads, students, attempts, questions by exam/status | admin |
| `GET /api/admin/leads` | `?exam=&limit=` | leads list | admin |
| `GET /api/admin/questions` | `?exam=&status=&q=&limit=&offset=` | questions | admin |
| `PATCH /api/admin/questions/{id}` | `{ "status": "reviewed" \| "rejected" \| "draft" }` | `{ "ok": true }` | admin |
| `GET /api/admin/attempts` | `?limit=` | attempts | admin |
| `GET /api/papers/{exam}` | | `[{ "id", "kind", "title", "free", "questions", "duration_minutes" }]` free and paid | anyone |
| `GET /api/papers/{exam}/{id}` | | full paper JSON; paid papers need a pass for that exam (or admin) | signed in for paid |
| `GET /api/practice/{exam}/topics` | | `{ "exam", "locked", "free_per_topic": 10, "total", "subjects": [{ "subject": {en,hi}, "count", "topics": [{ "topic": {en,hi}, "count", "free" }] }] }` | anyone (`locked` = no pass for this exam) |
| `GET /api/practice/{exam}/questions` | `?subject=&topic=&limit=&offset=` (subject/topic are the English names; limit ≤ 50, default 10) | `{ "locked", "preview", "total", "available", "offset", "limit", "items": [full bank question incl. answer and explanation] }` | anyone: a pass for that exam or admin gets every question; others get the first 10 of each topic (by id), `preview: true`, and `locked: true` when more exist |
| `GET /api/me/attempts` | `?exam=&limit=` (limit ≤ 1000, default 200) | `[{ "id", "exam", "paper", "score", "total", "topics", "created_at" }]` newest first | signed in (own attempts only) |
| `POST /api/payments/razorpay` | Razorpay webhook | | Razorpay (signature checked; placeholder until keys arrive) |

Topic practice serves only the question statuses in `PRACTICE_STATUSES` (comma list of `reviewed` / `draft`, default `reviewed`); `rejected` is never served. Topic-practice sessions are saved through `POST /api/attempts` with `paper` = `topic:<subject-slug>[:<topic-slug>]` (at most 64 chars) and `topics` filled, so they appear on `/progress/`.

Student pages: `/<exam>/practice/` (topic picker), `/<exam>/practice/topic/?subject=&topic=&offset=` (one round of ten), `/<exam>/mocks/` (every paper with lock state and best/last score), `/progress/` (signed in: score trend per exam, weak topics, recent attempts).

The web reads the API base from `PUBLIC_API_BASE` (empty = same origin).

**Supabase keep-alive.** Until 1 January 2027, cron runs `automation/keepalive/supabase-ping.sh` twice a day (a real query plus an HTTP request) so the free project doesn't pause; on that date it removes its own cron line. Log: `~/.cache/prashnottar-supabase-ping.log`.

**Hosting.** The website is on Vercel (https://edtech-ashy-three.vercel.app, project root `web/`). `web/vercel.json` proxies `/api/*` to the API server at `https://api.161-97-97-207.sslip.io`, which Dokploy's Traefik publishes with a Let's Encrypt certificate (labels in `deploy/docker-compose.yml`, host from `API_HOST` in `deploy/.env`). To the browser it stays same-origin, so `PUBLIC_API_BASE` stays empty on Vercel. When a real domain arrives, change `API_HOST` and the rewrite destination together. The native app needs `PUBLIC_API_BASE` set to the API address, because it isn't served from Vercel.

## Database (Supabase Postgres)

- The API server is the only client. It connects with `DATABASE_URL`, the Supabase **session pooler** string (`aws-0-ap-south-1.pooler.supabase.com:5432`, user `postgres.<project-ref>`). The direct `db.<ref>.supabase.co` host is IPv6-only, and Docker's default network has no IPv6. Don't use the transaction pooler (port 6543): it breaks the prepared statements the server uses.
- The server creates its tables on start (`server/src/db.rs`), turns on row-level security on every table with no policies, and revokes all grants from Supabase's `anon` and `authenticated` roles. The Supabase publishable/anon key therefore can't read or write anything. Keep it that way: the question bank is the paid asset.
- Timestamps are Unix seconds (`BIGINT`). `questions.body`, `attempts.answers` and `attempts.topics` are `JSONB`.
- `questions` is a copy of `content/bank` (the files are the source of truth), rebuilt on every start and on `POST /api/admin/reload`.
- The admin account is created or updated on every start from `ADMIN_USERNAME`, `ADMIN_PHONE` and `ADMIN_PASSWORD`.

## Ports on this server

This server also runs production containers (Dokploy on 3000, Traefik on 80/443). Don't touch them.
- API server: `127.0.0.1:8787`
- n8n: `127.0.0.1:5678`

## External APIs and the retry rule

Anthropic (chatbot, filter agent), Meta WhatsApp Cloud API, Razorpay, ElevenLabs, Higgsfield, and scraping requests:
- **Transient errors** (network, timeouts, HTTP 408/409/429/5xx, Anthropic 529): wait **10 seconds** and try again, in a loop. Background jobs loop until success, except scraping, which stops after 30 tries per URL (about 5 minutes) and records the failure, so a site that is down doesn't hang the run; a live request (chat reply) gives up after 6 tries (about a minute) and returns a friendly fallback.
- **Permanent errors** (400/401/403/404, a missing key): don't loop. Log them clearly and stop, because looping on a bad key never succeeds.

## Secrets

Live in `.env` files on the server (gitignored); `*.env.example` files list the names only. That covers `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ANTHROPIC_API_KEY`, `META_*`, `RAZORPAY_*`, `ELEVENLABS_API_KEY`, `HIGGSFIELD_API_KEY` and `AUTOMATION_KEY`. Never commit a real value.
