# WhatsApp automation (n8n)

Two n8n workflows run on this server (`deploy/docker-compose.yml`, n8n on `127.0.0.1:5678`):

| Workflow | What it does |
|---|---|
| `n8n/followups.json` | Every minute, asks the API for follow-ups that are due (the 72-hour sequence: welcome, day 1, day 2, day 3 offer) and sends them on WhatsApp, then marks each one sent. |
| `n8n/inbound.json` | Receives incoming WhatsApp messages (forwarded by the API after it checks Meta's signature), gets a reply from the bot (`/api/bot/whatsapp`), sends it, and alerts the owner when the bot hands over to a human. |

**Retry rule:** if WhatsApp or the API has a temporary problem (network, 408/409/429/5xx), the workflow waits 10 seconds and tries again, in a loop. Permanent errors (bad token, rejected template) are marked failed and the lead is retried 10 minutes later by the schedule.

Tested on 27 Nov 2026 against a mock WhatsApp server: the follow-up went out as a template after one simulated 503 and a 10-second retry; a signed inbound message got a bot reply; forged signatures were rejected (403).

## How a message flows

```
Meta ──signed POST──► API /api/whatsapp/webhook ──(signature OK)──► n8n inbound ──► API bot ──► WhatsApp reply
                                                                          └─ handover? ──► owner alert
n8n schedule (1 min) ──► API /api/automation/followups ──► WhatsApp (template or text) ──► API mark sent
```

Meta's webhook ends at the API, not at n8n, because the signature check needs the raw request body. Without it, anyone could post fake messages and make the bot message random numbers from your WhatsApp number, which gets the number banned.

## Going live: steps for the owner

1. **Meta app:** in Meta for Developers, create an app with the WhatsApp product and add the business number.
2. **Send these values** (they go in env files on the server, never in git):
   - `deploy/.env`: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN` (a permanent system-user token), `OWNER_WHATSAPP` (your number with 91, for handover alerts)
   - `server/.env`: `META_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN` (any long random string you choose), `ANTHROPIC_API_KEY`, and `PUBLIC_SITE_URL`
3. **Public URL:** expose the API through Dokploy/Traefik on your domain with HTTPS, then in Meta set the webhook URL to `https://<domain>/api/whatsapp/webhook` with the same verify token, and subscribe to `messages`.
4. **Message templates:** WhatsApp only allows free-form text within 24 hours of the student's last message. Landing-page leads never wrote to you, so their follow-ups must be **approved templates**. Create these four in WhatsApp Manager, language **Hindi (hi)**, each with two variables: `{{1}}` = name, `{{2}}` = link.

| Template name | Category | Body |
|---|---|---|
| `pr_followup_0` | Utility | नमस्ते {{1}}! Prashnottar से जुड़ने के लिए धन्यवाद। आपका फ्री प्रैक्टिस सेट और पूरे हल यहाँ हैं: {{2}} संदेश बंद करने के लिए STOP लिखें। |
| `pr_followup_1` | Marketing | {{1}}, आज 10 मिनट निकालें और फ्री सेट घड़ी लगाकर दोबारा हल करें। अपने कमज़ोर टॉपिक देखें: {{2}} |
| `pr_followup_2` | Marketing | {{1}}, असली परीक्षा जैसा अभ्यास: टाइमर, सेक्शन और OMR के साथ मॉक टेस्ट। सैंपल देखें: {{2}} |
| `pr_followup_3` | Marketing | {{1}}, पिछले वर्षों के प्रश्नपत्रों के विश्लेषण से बना Most-probable सेट ₹249 में उपलब्ध है। पैक और बंडल देखें: {{2}} STOP लिखकर संदेश बंद करें। |

   Meta decides the final category. Marketing messages are charged per message (roughly ₹1 each in India), so the 4-step sequence costs about ₹3–4 per landing-page lead. Click-to-WhatsApp leads get free-form text inside the free window instead.

5. **Restart:** `docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d`.

## Changing a workflow

Edit in the n8n editor (tunnel to it: `ssh -L 5678:localhost:5678 <server>`, then open http://localhost:5678 and create the owner account on first visit), then export it back to `automation/n8n/` so git has the current version. Or edit the JSON here and re-import:

```bash
C="docker compose -f deploy/docker-compose.yml --env-file deploy/.env"
$C stop n8n
$C run --rm --no-deps -T n8n import:workflow --input=/workflows/followups.json
$C run --rm --no-deps -T n8n publish:workflow --id=prFollowups0001
$C up -d n8n
```
