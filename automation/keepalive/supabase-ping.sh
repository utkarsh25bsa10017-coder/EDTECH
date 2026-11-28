#!/usr/bin/env bash
# Keeps the free Supabase project from pausing (Supabase pauses free projects
# after about 7 days without activity). Runs from cron twice a day until
# 1 January 2027, then removes its own cron line and stops.
#   Install: (crontab -l 2>/dev/null; echo "17 */12 * * * $PWD/automation/keepalive/supabase-ping.sh") | crontab -
#   Remove:  crontab -l | grep -v supabase-ping.sh | crontab -
set -uo pipefail

STOP_AFTER=2027-01-01
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="${HOME}/.cache/prashnottar-supabase-ping.log"
mkdir -p "$(dirname "$LOG")"
log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >> "$LOG"; }

if [[ "$(date -u +%F)" > "$STOP_AFTER" || "$(date -u +%F)" == "$STOP_AFTER" ]]; then
  crontab -l 2>/dev/null | grep -v 'supabase-ping.sh' | crontab -
  log "reached $STOP_AFTER: removed the cron job, stopping"
  exit 0
fi

URL="$(grep '^DATABASE_URL=' "$ROOT/server/.env" | cut -d= -f2-)"
REF="$(printf '%s' "$URL" | sed -n 's/.*postgres\.\([a-z0-9]*\):.*/\1/p')"
if [[ -z "$URL" || -z "$REF" ]]; then log "DATABASE_URL missing in server/.env"; exit 1; fi

# 1. A real query on the database (what Supabase counts as activity).
# Retry transient failures every 10 s, up to 30 times (docs/ARCHITECTURE.md retry rule).
ok=""
for try in $(seq 1 30); do
  out="$(docker run --rm postgres:16 psql "${URL}?sslmode=require" -Atc \
        "select 'users=' || (select count(*) from users) || ' questions=' || (select count(*) from questions)" 2>&1)"
  if [[ $? -eq 0 ]]; then ok="$out"; break; fi
  if grep -q 'password authentication failed' <<<"$out"; then log "db: bad password, not retrying"; break; fi
  sleep 10
done
if [[ -n "$ok" ]]; then
  log "db ok: $ok"
else
  log "db FAILED: $(printf '%s' "$out" | tr '\n' ' ' | sed 's#://[^@]*@#://***@#g')"
fi

# 2. A request to the project's HTTP API as well.
code="$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://${REF}.supabase.co/auth/v1/health" \
        -H "apikey: sb_publishable_8uPZSxElzKBIeEJGN2MvjQ_ltRWC6cm")"
log "http auth/health: $code"
