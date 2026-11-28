use axum::{
    body::Bytes,
    extract::{ConnectInfo, Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use hmac::{Hmac, Mac};
use sqlx::PgPool;
use serde::Deserialize;
use serde_json::{json, Value};
use sha2::Sha256;
use std::net::SocketAddr;

use crate::{
    auth::{self, User},
    claude::{self, ClaudeError},
    content, now, AppState,
};

// ------------------------------------------------------------------ errors

pub struct ApiError(StatusCode, String);

impl ApiError {
    fn bad(msg: &str) -> Self {
        ApiError(StatusCode::BAD_REQUEST, msg.to_string())
    }
    fn unauthorized() -> Self {
        ApiError(StatusCode::UNAUTHORIZED, "sign in required".into())
    }
    fn forbidden(msg: &str) -> Self {
        ApiError(StatusCode::FORBIDDEN, msg.to_string())
    }
    fn not_found() -> Self {
        ApiError(StatusCode::NOT_FOUND, "not found".into())
    }
    fn internal<E: std::fmt::Display>(e: E) -> Self {
        tracing::error!("internal error: {e}");
        ApiError(StatusCode::INTERNAL_SERVER_ERROR, "internal error".into())
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({ "error": self.1 }))).into_response()
    }
}

type ApiResult<T> = Result<T, ApiError>;

fn db(state: &AppState) -> &PgPool {
    &state.db
}

async fn require_admin(state: &AppState, headers: &HeaderMap) -> ApiResult<User> {
    let user = auth::current_user(state, headers).await.ok_or_else(ApiError::unauthorized)?;
    if !user.is_admin() {
        return Err(ApiError::forbidden("admin only"));
    }
    Ok(user)
}

fn require_automation(state: &AppState, headers: &HeaderMap) -> ApiResult<()> {
    let key = headers.get("x-automation-key").and_then(|v| v.to_str().ok()).unwrap_or("");
    if state.cfg.automation_key.is_empty() || key != state.cfg.automation_key {
        return Err(ApiError::forbidden("bad automation key"));
    }
    Ok(())
}

async fn passes_for(db: &PgPool, phone: Option<&str>) -> Vec<String> {
    let Some(phone) = phone else { return vec![] };
    sqlx::query_scalar("SELECT DISTINCT exam FROM passes WHERE phone = $1 AND expires_at > $2")
        .bind(phone)
        .bind(now())
        .fetch_all(db)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("passes lookup failed: {e}");
            vec![]
        })
}

fn session_response(state: &AppState, token: String, user: &User) -> Response {
    let cookie = auth::session_cookie(&token, state.cfg.secure_cookies);
    (
        [(header::SET_COOKIE, cookie)],
        Json(json!({ "token": token, "role": user.role, "name": user.name })),
    )
        .into_response()
}

// ------------------------------------------------------------------ auth

#[derive(Deserialize)]
pub struct LoginReq {
    #[serde(alias = "username")]
    phone: String,
    password: String,
}

/// Everyone, admin included, signs in with a 10-digit phone number and password.
pub async fn login(State(state): State<AppState>, Json(req): Json<LoginReq>) -> ApiResult<Response> {
    let phone = auth::login_phone(&req.phone).ok_or_else(|| ApiError::bad("enter your 10-digit phone number"))?;
    let row: Option<(i64, String, Option<String>, String, String)> =
        sqlx::query_as("SELECT id, name, phone, role, password_hash FROM users WHERE phone = $1")
            .bind(&phone)
            .fetch_optional(db(&state))
            .await
            .map_err(ApiError::internal)?;
    let Some((id, name, phone, role, hash)) = row else {
        return Err(ApiError(StatusCode::UNAUTHORIZED, "wrong phone number or password".into()));
    };
    if !auth::verify_password(&req.password, &hash) {
        return Err(ApiError(StatusCode::UNAUTHORIZED, "wrong phone number or password".into()));
    }
    let token = auth::new_session(db(&state), id).await.map_err(ApiError::internal)?;
    let user = User { id, name, phone, role };
    Ok(session_response(&state, token, &user))
}

#[derive(Deserialize)]
pub struct RegisterReq {
    name: String,
    phone: String,
    password: String,
}

pub async fn register(State(state): State<AppState>, Json(req): Json<RegisterReq>) -> ApiResult<Response> {
    let name = req.name.trim();
    if name.is_empty() || name.chars().count() > 80 {
        return Err(ApiError::bad("enter your name"));
    }
    let phone = auth::normalize_phone(&req.phone).ok_or_else(|| ApiError::bad("enter a valid 10-digit mobile number"))?;
    if req.password.chars().count() < 8 {
        return Err(ApiError::bad("password must be at least 8 characters"));
    }
    // ON CONFLICT also covers two sign-ups for the same number at once.
    let id: Option<i64> = sqlx::query_scalar(
        "INSERT INTO users (name, phone, password_hash, role, created_at) VALUES ($1, $2, $3, 'student', $4)
         ON CONFLICT (phone) DO NOTHING RETURNING id",
    )
    .bind(name)
    .bind(&phone)
    .bind(auth::hash_password(&req.password))
    .bind(now())
    .fetch_optional(db(&state))
    .await
    .map_err(ApiError::internal)?;
    let Some(id) = id else {
        return Err(ApiError(StatusCode::CONFLICT, "this number already has an account; sign in instead".into()));
    };
    let token = auth::new_session(db(&state), id).await.map_err(ApiError::internal)?;
    let user = User { id, name: name.to_string(), phone: Some(phone), role: "student".into() };
    Ok(session_response(&state, token, &user))
}

pub async fn logout(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Response> {
    if let Some(token) = auth::token_from_headers(&headers) {
        sqlx::query("DELETE FROM sessions WHERE token = $1")
            .bind(token)
            .execute(db(&state))
            .await
            .map_err(ApiError::internal)?;
    }
    Ok(([(header::SET_COOKIE, auth::clear_cookie())], Json(json!({ "ok": true }))).into_response())
}

pub async fn me(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Json<Value>> {
    let user = auth::current_user(&state, &headers).await.ok_or_else(ApiError::unauthorized)?;
    let passes = passes_for(db(&state), user.phone.as_deref()).await;
    Ok(Json(json!({ "role": user.role, "name": user.name, "phone": user.phone, "passes": passes })))
}

// ------------------------------------------------------------------ leads, attempts

#[derive(Deserialize)]
pub struct LeadReq {
    phone: String,
    name: Option<String>,
    exam: String,
    score: Option<i64>,
    total: Option<i64>,
    source: String,
    consent: bool,
}

pub async fn create_lead(State(state): State<AppState>, Json(req): Json<LeadReq>) -> ApiResult<Json<Value>> {
    let phone = auth::normalize_phone(&req.phone).ok_or_else(|| ApiError::bad("enter a valid 10-digit mobile number"))?;
    if !content::valid_exam(&req.exam) {
        return Err(ApiError::bad("unknown exam"));
    }
    if !matches!(req.source.as_str(), "landing" | "ctwa" | "app") {
        return Err(ApiError::bad("unknown source"));
    }
    if !req.consent {
        return Err(ApiError::bad("please tick the consent box"));
    }
    let name = req.name.as_deref().map(str::trim).filter(|n| !n.is_empty()).map(|n| n.chars().take(80).collect::<String>());
    let t = now();
    sqlx::query(
        "INSERT INTO leads (phone, name, exam, score, total, source, consent, followup_step, next_followup_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, 0, $7, $7)
         ON CONFLICT (phone, exam) DO UPDATE SET
            name = COALESCE(EXCLUDED.name, leads.name),
            score = COALESCE(EXCLUDED.score, leads.score),
            total = COALESCE(EXCLUDED.total, leads.total),
            consent = true",
    )
    .bind(&phone)
    .bind(name)
    .bind(&req.exam)
    .bind(req.score)
    .bind(req.total)
    .bind(&req.source)
    .bind(t)
    .execute(db(&state))
    .await
    .map_err(ApiError::internal)?;
    Ok(Json(json!({ "ok": true })))
}

#[derive(Deserialize)]
pub struct AttemptReq {
    exam: String,
    paper: String,
    answers: Vec<Option<i64>>,
    score: f64,
    total: i64,
    topics: Value,
}

pub async fn create_attempt(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<AttemptReq>,
) -> ApiResult<Json<Value>> {
    if !content::valid_exam(&req.exam) || req.paper.len() > 64 || req.answers.len() > 400 {
        return Err(ApiError::bad("invalid attempt"));
    }
    let user_id = auth::current_user(&state, &headers).await.map(|u| u.id);
    let id: i64 = sqlx::query_scalar(
        "INSERT INTO attempts (user_id, exam, paper, score, total, answers, topics, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
    )
    .bind(user_id)
    .bind(&req.exam)
    .bind(&req.paper)
    .bind(req.score)
    .bind(req.total)
    .bind(sqlx::types::Json(&req.answers))
    .bind(&req.topics)
    .bind(now())
    .fetch_one(db(&state))
    .await
    .map_err(ApiError::internal)?;
    Ok(Json(json!({ "ok": true, "id": id })))
}

// ------------------------------------------------------------------ papers

pub async fn list_papers(State(state): State<AppState>, Path(exam): Path<String>) -> ApiResult<Json<Value>> {
    if !content::valid_exam(&exam) {
        return Err(ApiError::not_found());
    }
    Ok(Json(Value::Array(content::list_papers(&state, &exam))))
}

pub async fn get_paper(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path((exam, id)): Path<(String, String)>,
) -> ApiResult<Response> {
    let paper = content::find_paper(&state, &exam, &id).ok_or_else(ApiError::not_found)?;
    let text = std::fs::read_to_string(&paper.path).map_err(ApiError::internal)?;
    let v: Value = serde_json::from_str(&text).map_err(ApiError::internal)?;
    let is_free = paper.free && v["free"].as_bool().unwrap_or(true);
    if !is_free {
        let user = auth::current_user(&state, &headers).await.ok_or_else(ApiError::unauthorized)?;
        if !user.is_admin() {
            if !passes_for(db(&state), user.phone.as_deref()).await.iter().any(|e| e == &exam) {
                return Err(ApiError(StatusCode::PAYMENT_REQUIRED, "this paper needs a pass for this exam".into()));
            }
        }
    }
    Ok(([(header::CACHE_CONTROL, "private, no-store")], Json(v)).into_response())
}

// ------------------------------------------------------------------ topic practice

/// Questions per topic that anyone (no pass) may practise.
const FREE_PER_TOPIC: i64 = 10;

/// Signed-in with a pass for this exam, or admin.
async fn bank_unlocked(state: &AppState, headers: &HeaderMap, exam: &str) -> bool {
    match auth::current_user(state, headers).await {
        Some(u) if u.is_admin() => true,
        Some(u) => passes_for(db(state), u.phone.as_deref()).await.iter().any(|e| e == exam),
        None => false,
    }
}

/// `{ en, hi }` from a question body field, falling back to the English column.
fn bi_or(v: Value, en: &str) -> Value {
    if v.get("en").and_then(|x| x.as_str()).is_some() {
        json!({ "en": v["en"], "hi": v.get("hi").and_then(|x| x.as_str()).unwrap_or(en) })
    } else {
        json!({ "en": en, "hi": en })
    }
}

/// Subjects with their topics and question counts (statuses from PRACTICE_STATUSES).
pub async fn practice_topics(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(exam): Path<String>,
) -> ApiResult<Response> {
    if !content::valid_exam(&exam) {
        return Err(ApiError::not_found());
    }
    let unlocked = bank_unlocked(&state, &headers, &exam).await;
    let rows: Vec<(String, String, Value, Value, i64)> = sqlx::query_as(
        "SELECT subject, topic, (array_agg(body->'subject' ORDER BY id))[1], (array_agg(body->'topic' ORDER BY id))[1], COUNT(*)
         FROM questions WHERE exam = $1 AND status = ANY($2)
         GROUP BY subject, topic ORDER BY subject, topic",
    )
    .bind(&exam)
    .bind(&state.cfg.practice_statuses)
    .fetch_all(db(&state))
    .await
    .map_err(ApiError::internal)?;
    let mut subjects: Vec<Value> = Vec::new();
    let mut total = 0i64;
    for (subject, topic, sbody, tbody, count) in rows {
        total += count;
        let topic_v = json!({ "topic": bi_or(tbody, &topic), "count": count, "free": count.min(FREE_PER_TOPIC) });
        match subjects.last_mut() {
            Some(last) if last["subject"]["en"] == subject.as_str() => {
                last["count"] = json!(last["count"].as_i64().unwrap_or(0) + count);
                if let Some(t) = last["topics"].as_array_mut() {
                    t.push(topic_v);
                }
            }
            _ => subjects.push(json!({ "subject": bi_or(sbody, &subject), "count": count, "topics": [topic_v] })),
        }
    }
    let body = json!({
        "exam": exam, "locked": !unlocked, "free_per_topic": FREE_PER_TOPIC, "total": total, "subjects": subjects
    });
    Ok(([(header::CACHE_CONTROL, "private, no-store")], Json(body)).into_response())
}

#[derive(Deserialize)]
pub struct PracticeQuery {
    subject: Option<String>,
    topic: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
}

/// Full questions (answer and explanation included) for one subject and/or topic.
/// Without a pass, only the first FREE_PER_TOPIC questions of each topic (by id).
pub async fn practice_questions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(exam): Path<String>,
    Query(q): Query<PracticeQuery>,
) -> ApiResult<Response> {
    if !content::valid_exam(&exam) {
        return Err(ApiError::not_found());
    }
    let unlocked = bank_unlocked(&state, &headers, &exam).await;
    let subject = q.subject.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let topic = q.topic.as_deref().map(str::trim).filter(|s| !s.is_empty());
    let limit = q.limit.unwrap_or(10).clamp(1, 50);
    let offset = q.offset.unwrap_or(0).max(0);
    const SEL: &str = "WITH sel AS (
        SELECT id, subject, topic, body, ROW_NUMBER() OVER (PARTITION BY subject, topic ORDER BY id) AS rn
        FROM questions
        WHERE exam = $1 AND status = ANY($2) AND ($3::text IS NULL OR subject = $3) AND ($4::text IS NULL OR topic = $4)
    )";
    let (total, free): (i64, i64) =
        sqlx::query_as(&format!("{SEL} SELECT COUNT(*), COUNT(*) FILTER (WHERE rn <= $5) FROM sel"))
            .bind(&exam)
            .bind(&state.cfg.practice_statuses)
            .bind(subject)
            .bind(topic)
            .bind(FREE_PER_TOPIC)
            .fetch_one(db(&state))
            .await
            .map_err(ApiError::internal)?;
    let items: Vec<Value> = sqlx::query_scalar(&format!(
        "{SEL} SELECT body FROM sel WHERE ($5 OR rn <= $6) ORDER BY subject, topic, id LIMIT $7 OFFSET $8"
    ))
    .bind(&exam)
    .bind(&state.cfg.practice_statuses)
    .bind(subject)
    .bind(topic)
    .bind(unlocked)
    .bind(FREE_PER_TOPIC)
    .bind(limit)
    .bind(offset)
    .fetch_all(db(&state))
    .await
    .map_err(ApiError::internal)?;
    let available = if unlocked { total } else { free };
    let body = json!({
        // locked: more questions exist here than this user may open (free preview only).
        "locked": available < total,
        "preview": !unlocked,
        "total": total,
        "available": available,
        "offset": offset,
        "limit": limit,
        "items": items,
    });
    Ok(([(header::CACHE_CONTROL, "private, no-store")], Json(body)).into_response())
}

// ------------------------------------------------------------------ the student's own attempts

#[derive(Deserialize)]
pub struct MyAttemptsQuery {
    exam: Option<String>,
    limit: Option<i64>,
}

/// The signed-in user's attempts, newest first (answers left out).
pub async fn my_attempts(
    State(state): State<AppState>,
    headers: HeaderMap,
    Query(q): Query<MyAttemptsQuery>,
) -> ApiResult<Response> {
    let user = auth::current_user(&state, &headers).await.ok_or_else(ApiError::unauthorized)?;
    let exam = q.exam.as_deref().filter(|e| !e.is_empty());
    if exam.is_some_and(|e| !content::valid_exam(e)) {
        return Err(ApiError::bad("unknown exam"));
    }
    let limit = q.limit.unwrap_or(200).clamp(1, 1000);
    let found: Vec<(i64, String, String, f64, i64, Value, i64)> = sqlx::query_as(
        "SELECT id, exam, paper, score, total, topics, created_at FROM attempts
         WHERE user_id = $1 AND ($2::text IS NULL OR exam = $2) ORDER BY created_at DESC, id DESC LIMIT $3",
    )
    .bind(user.id)
    .bind(exam)
    .bind(limit)
    .fetch_all(db(&state))
    .await
    .map_err(ApiError::internal)?;
    let rows: Vec<Value> = found
        .into_iter()
        .map(|r| {
            json!({
                "id": r.0, "exam": r.1, "paper": r.2, "score": r.3, "total": r.4, "topics": r.5, "created_at": r.6
            })
        })
        .collect();
    Ok(([(header::CACHE_CONTROL, "private, no-store")], Json(Value::Array(rows))).into_response())
}

// ------------------------------------------------------------------ chatbot

const PRODUCT_FACTS: &str = r#"PRODUCT FACTS (the only facts you may state about Prashnottar):
- Prashnottar is an independent exam-practice app and website. It is NOT affiliated with any commission or government body.
- Exams covered: BPSC TRE 4.0 (Bihar school teacher recruitment; exam expected around July 2027), BPSC CCE Prelims (73rd expected late 2027), MPPSC State Service Prelims (24 Jan 2027 and 2 May 2027), RPSC RAS Prelims (next expected late 2027), Bihar STET (possibly mid-2027), CTET (usually twice a year), CG TET (26 Sep 2027). ALL dates are tentative: always tell the student to confirm with the official notification.
- What students get: a free 20-question set per exam (no sign-up); practice mode with instant explanations; full mock tests that work like the real exam (timer, sections, question palette, mark for review, negative marking, section- and topic-wise results); an OMR practice mode; a printable sample paper; a most-probable question paper chosen by topic weight from past-paper analysis.
- Prices per exam: Most-probable set ₹249; 2-month fast-track ₹499; 3-month fast-track / full Pass ₹999. Bundles: TRE + CTET ₹799, TRE + STET ₹799. Payment by UPI on the website.
- Refund: 7-day refund policy (details on the refund page).
- Questions are written in the pattern of official past papers and checked before going live. Hindi and English.
"#;

const RULES: &str = r#"RULES:
- Reply in the student's language and style: Hindi (Devanagari), English, or Hinglish, matching how they wrote.
- Keep replies short and clear: 2-5 short sentences or a few bullets.
- Never promise selection, marks, ranks or that specific questions will appear. Never call anything "guaranteed" or "100%". Never invent urgency or limited seats.
- Never claim official status. Never state exam dates, vacancies or rules beyond the facts above; for anything else say you aren't sure and point them to the official website/notification.
- If asked whether you are a bot or AI, say honestly that you are Prashnottar's AI assistant.
- Do not ask for passwords, OTPs or card details.
"#;

fn chat_system(exam: Option<&str>) -> String {
    format!(
        "You are the guidance assistant on the Prashnottar website/app. You help students pick the right pack, understand exam timing, use the mock tests well, and plan study in simple steps (e.g. daily practice sets, revise weak topics from the result screen, take a full mock every week, practise OMR filling).\n\n{PRODUCT_FACTS}\n{RULES}\nThe student is currently looking at: {}.",
        exam.unwrap_or("the home page")
    )
}

fn wa_system() -> String {
    format!(
        "You are Prashnottar's WhatsApp assistant (sales and support for our own products only). Help with: the free set, which pack fits, prices, how to pay, how to log in and use mock tests, and simple support questions. Do not tutor subjects or act as a general assistant: for study questions, briefly point them to the practice sets and mock tests in the app.\n\n{PRODUCT_FACTS}\n{RULES}\n- Write like a helpful person on WhatsApp: short messages, no long paragraphs, at most one emoji.\n- If the student has a payment problem, wants a refund, complains, is upset, asks for a human, or you are unsure, reply politely that a team member will reply soon, and end your message with the exact marker [HANDOFF].\n- If they want to stop messages, tell them to send STOP."
    )
}

fn client_ip(headers: &HeaderMap, addr: &SocketAddr) -> String {
    headers
        .get("x-forwarded-for")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.split(',').next())
        .map(|s| s.trim().to_string())
        .unwrap_or_else(|| addr.ip().to_string())
}

/// 20 chat messages per IP per 10 minutes.
fn rate_ok(state: &AppState, ip: &str) -> bool {
    let mut map = match state.rate.lock() {
        Ok(m) => m,
        Err(_) => return true,
    };
    let t = now();
    if map.len() > 10_000 {
        map.retain(|_, (start, _)| t - *start < 600);
    }
    let entry = map.entry(ip.to_string()).or_insert((t, 0));
    if t - entry.0 >= 600 {
        *entry = (t, 0);
    }
    entry.1 += 1;
    entry.1 <= 20
}

fn clean_history(raw: &[Value], limit: usize) -> Vec<Value> {
    let mut msgs: Vec<Value> = raw
        .iter()
        .filter_map(|m| {
            let role = m["role"].as_str()?;
            let content = m["content"].as_str()?.trim();
            if !matches!(role, "user" | "assistant") || content.is_empty() {
                return None;
            }
            Some(json!({ "role": role, "content": content.chars().take(2000).collect::<String>() }))
        })
        .collect();
    if msgs.len() > limit {
        msgs = msgs.split_off(msgs.len() - limit);
    }
    while msgs.first().map(|m| m["role"] != "user").unwrap_or(false) {
        msgs.remove(0);
    }
    msgs
}

fn fallback_reply(e: &ClaudeError, hindi: bool) -> String {
    tracing::warn!("chat fallback: {e}");
    if hindi {
        "माफ़ कीजिए, सहायक अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद फिर कोशिश करें, या WhatsApp पर हमसे बात करें।".into()
    } else {
        "Sorry, the assistant isn't available right now. Please try again in a little while, or message us on WhatsApp.".into()
    }
}

#[derive(Deserialize)]
pub struct ChatReq {
    messages: Vec<Value>,
    exam: Option<String>,
    lang: Option<String>,
}

pub async fn chat(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(req): Json<ChatReq>,
) -> ApiResult<Json<Value>> {
    if !rate_ok(&state, &client_ip(&headers, &addr)) {
        return Err(ApiError(StatusCode::TOO_MANY_REQUESTS, "too many messages; please wait a few minutes".into()));
    }
    let msgs = clean_history(&req.messages, 12);
    if msgs.last().map(|m| m["role"] != "user").unwrap_or(true) {
        return Err(ApiError::bad("send a message"));
    }
    let exam = req.exam.as_deref().filter(|e| content::valid_exam(e));
    let hindi = req.lang.as_deref() != Some("en");
    let reply = match claude::ask(&state.http, &state.cfg, &chat_system(exam), msgs, true).await {
        Ok(r) if !r.is_empty() => r,
        Ok(_) => fallback_reply(&ClaudeError::Permanent("empty reply".into()), hindi),
        Err(e) => fallback_reply(&e, hindi),
    };
    Ok(Json(json!({ "reply": reply })))
}

// ------------------------------------------------------------------ WhatsApp bot (called by n8n)

#[derive(Deserialize)]
pub struct WaReq {
    from: String,
    name: Option<String>,
    text: String,
}

fn is_stop(text: &str) -> bool {
    let t = text.trim().to_lowercase();
    matches!(t.as_str(), "stop" | "unsubscribe" | "रोकें" | "बंद करो" | "band karo" | "stop karo")
}

pub async fn bot_whatsapp(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(req): Json<WaReq>,
) -> ApiResult<Json<Value>> {
    require_automation(&state, &headers)?;
    let phone = auth::normalize_phone(&req.from).ok_or_else(|| ApiError::bad("bad phone"))?;
    let text: String = req.text.trim().chars().take(2000).collect();
    if text.is_empty() {
        return Err(ApiError::bad("empty message"));
    }

    if is_stop(&text) {
        sqlx::query("UPDATE leads SET opted_out = true WHERE phone = $1")
            .bind(&phone)
            .execute(db(&state))
            .await
            .map_err(ApiError::internal)?;
        return Ok(Json(json!({
            "reply": "ठीक है, अब आपको हमारी ओर से संदेश नहीं भेजे जाएंगे। कभी भी फिर से जुड़ने के लिए 'START' लिखें।",
            "handoff": false
        })));
    }

    let history = {
        let t = now();
        // Someone who messages us first counts as a click-to-WhatsApp lead.
        sqlx::query(
            "INSERT INTO leads (phone, name, exam, source, consent, followup_step, next_followup_at, created_at)
             VALUES ($1, $2, 'bpsc-tre', 'ctwa', true, 0, $3, $3)
             ON CONFLICT (phone, exam) DO UPDATE SET opted_out = CASE WHEN $4 THEN false ELSE leads.opted_out END",
        )
        .bind(&phone)
        .bind(&req.name)
        .bind(t)
        .bind(text.trim().eq_ignore_ascii_case("start"))
        .execute(db(&state))
        .await
        .map_err(ApiError::internal)?;
        sqlx::query("INSERT INTO wa_messages (phone, role, content, created_at) VALUES ($1, 'user', $2, $3)")
            .bind(&phone)
            .bind(&text)
            .bind(t)
            .execute(db(&state))
            .await
            .map_err(ApiError::internal)?;
        let rows: Vec<(String, String)> =
            sqlx::query_as("SELECT role, content FROM wa_messages WHERE phone = $1 ORDER BY id DESC LIMIT 12")
                .bind(&phone)
                .fetch_all(db(&state))
                .await
                .map_err(ApiError::internal)?;
        rows.into_iter().rev().map(|(role, content)| json!({ "role": role, "content": content })).collect::<Vec<Value>>()
    };

    let msgs = clean_history(&history, 12);
    let (reply, handoff) = match claude::ask(&state.http, &state.cfg, &wa_system(), msgs, true).await {
        Ok(r) if !r.is_empty() => {
            let handoff = r.contains("[HANDOFF]");
            (r.replace("[HANDOFF]", "").trim().to_string(), handoff)
        }
        Ok(_) => (fallback_reply(&ClaudeError::Permanent("empty".into()), true), true),
        Err(e) => (fallback_reply(&e, true), true),
    };

    sqlx::query("INSERT INTO wa_messages (phone, role, content, created_at) VALUES ($1, 'assistant', $2, $3)")
        .bind(&phone)
        .bind(&reply)
        .bind(now())
        .execute(db(&state))
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(json!({ "reply": reply, "handoff": handoff })))
}

// ------------------------------------------------------------------ follow-ups (pulled by n8n)

/// The 72-hour sequence: step 0 right away, then one message a day.
fn followup_message(site: &str, exam: &str, name: Option<&str>, step: i64) -> Option<String> {
    let hi = name.map(|n| format!(" {n}")).unwrap_or_default();
    let free = format!("{site}/{exam}/");
    let price = format!("{site}/pricing/");
    match step {
        0 => Some(format!(
            "नमस्ते{hi}! Prashnottar से जुड़ने के लिए धन्यवाद। आपका फ्री प्रैक्टिस सेट और पूरे हल यहाँ हैं: {free}\nसवाल हो तो यहीं पूछें। संदेश बंद करने के लिए STOP लिखें।"
        )),
        1 => Some(format!(
            "आज का अभ्यास: 10 मिनट निकालें और फ्री सेट दोबारा हल करें, इस बार घड़ी लगाकर। रिज़ल्ट में अपने कमज़ोर टॉपिक देखें: {free}"
        )),
        2 => Some(format!(
            "असली परीक्षा जैसा अनुभव चाहिए? हमारे मॉक टेस्ट में टाइमर, सेक्शन और OMR अभ्यास है। सैंपल देखें: {free}"
        )),
        3 => Some(format!(
            "पिछले वर्षों के प्रश्नपत्रों के विश्लेषण से बना Most-probable सेट ₹249 में उपलब्ध है। पूरा पैक और बंडल यहाँ देखें: {price}\nकोई सवाल हो तो जवाब दें।"
        )),
        _ => None,
    }
}

pub async fn due_followups(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Json<Value>> {
    require_automation(&state, &headers)?;
    let due: Vec<(i64, String, Option<String>, String, i64, String, bool)> = sqlx::query_as(
        "SELECT l.id, l.phone, l.name, l.exam, l.followup_step, l.source,
                EXISTS (SELECT 1 FROM wa_messages w WHERE w.phone = l.phone AND w.role = 'user' AND w.created_at > $1 - 86000)
         FROM leads l
         WHERE l.consent AND NOT l.opted_out AND l.followup_step < 4 AND l.next_followup_at <= $1
         ORDER BY l.next_followup_at LIMIT 50",
    )
    .bind(now())
    .fetch_all(db(&state))
    .await
    .map_err(ApiError::internal)?;
    let site = &state.cfg.site_url;
    let rows: Vec<Value> = due
        .into_iter()
        .filter_map(|(id, phone, name, exam, step, source, window_open)| {
            followup_message(site, &exam, name.as_deref(), step).map(|message| {
                let link = if step == 3 { format!("{site}/pricing/") } else { format!("{site}/{exam}/") };
                json!({
                    "lead_id": id, "phone": format!("91{phone}"), "name": name, "exam": exam, "step": step,
                    "source": source,
                    // Free-form text is only allowed within 24 h of the student's last message;
                    // otherwise WhatsApp requires an approved template.
                    "window_open": window_open,
                    "message": message,
                    "template_name": format!("pr_followup_{step}"),
                    "template_params": [name.clone().unwrap_or_else(|| "विद्यार्थी".into()), link],
                })
            })
        })
        .collect();
    Ok(Json(Value::Array(rows)))
}

#[derive(Deserialize)]
pub struct FollowupMark {
    step: i64,
    status: String,
}

pub async fn mark_followup(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(lead_id): Path<i64>,
    Json(req): Json<FollowupMark>,
) -> ApiResult<Json<Value>> {
    require_automation(&state, &headers)?;
    let t = now();
    let q = match req.status.as_str() {
        "sent" => sqlx::query(
            "UPDATE leads SET followup_step = $1 + 1, next_followup_at = $2 WHERE id = $3 AND followup_step = $1",
        )
        .bind(req.step)
        .bind(t + 86400)
        .bind(lead_id),
        "failed" => sqlx::query("UPDATE leads SET next_followup_at = $1 WHERE id = $2").bind(t + 600).bind(lead_id),
        _ => return Err(ApiError::bad("status must be sent or failed")),
    };
    q.execute(db(&state)).await.map_err(ApiError::internal)?;
    Ok(Json(json!({ "ok": true })))
}

// ------------------------------------------------------------------ admin

pub async fn admin_stats(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Json<Value>> {
    require_admin(&state, &headers).await?;
    let pool = db(&state);
    let counts: (i64, i64, i64, i64) = sqlx::query_as(
        "SELECT (SELECT COUNT(*) FROM leads), (SELECT COUNT(*) FROM users WHERE role = 'student'),
                (SELECT COUNT(*) FROM attempts), (SELECT COUNT(*) FROM passes)",
    )
    .fetch_one(pool)
    .await
    .map_err(ApiError::internal)?;
    let (leads, students, attempts, passes) = counts;
    let by_status: Vec<(String, String, i64)> =
        sqlx::query_as("SELECT exam, status, COUNT(*) FROM questions GROUP BY exam, status")
            .fetch_all(pool)
            .await
            .map_err(ApiError::internal)?;
    let mut questions = serde_json::Map::new();
    for row in by_status {
        let entry = questions.entry(row.0).or_insert_with(|| json!({}));
        entry[row.1] = json!(row.2);
    }
    Ok(Json(json!({ "leads": leads, "students": students, "attempts": attempts, "passes": passes, "questions": questions })))
}

#[derive(Deserialize)]
pub struct ListQuery {
    exam: Option<String>,
    status: Option<String>,
    q: Option<String>,
    limit: Option<i64>,
    offset: Option<i64>,
}

pub async fn admin_leads(State(state): State<AppState>, headers: HeaderMap, Query(q): Query<ListQuery>) -> ApiResult<Json<Value>> {
    require_admin(&state, &headers).await?;
    let limit = q.limit.unwrap_or(100).clamp(1, 500);
    type LeadRow = (i64, String, Option<String>, String, Option<i64>, Option<i64>, String, bool, i64, i64);
    let found: Vec<LeadRow> = sqlx::query_as(
        "SELECT id, phone, name, exam, score, total, source, opted_out, followup_step, created_at FROM leads
         WHERE ($1::text IS NULL OR exam = $1) ORDER BY id DESC LIMIT $2",
    )
    .bind(&q.exam)
    .bind(limit)
    .fetch_all(db(&state))
    .await
    .map_err(ApiError::internal)?;
    let rows: Vec<Value> = found
        .into_iter()
        .map(|r| {
            json!({
                "id": r.0, "phone": r.1, "name": r.2, "exam": r.3, "score": r.4, "total": r.5,
                "source": r.6, "opted_out": r.7, "followup_step": r.8, "created_at": r.9
            })
        })
        .collect();
    Ok(Json(Value::Array(rows)))
}

pub async fn admin_questions(State(state): State<AppState>, headers: HeaderMap, Query(q): Query<ListQuery>) -> ApiResult<Json<Value>> {
    require_admin(&state, &headers).await?;
    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    let offset = q.offset.unwrap_or(0).max(0);
    let like = q.q.as_deref().map(str::trim).filter(|s| !s.is_empty()).map(|s| format!("%{s}%"));
    const FILTER: &str =
        "($1::text IS NULL OR exam = $1) AND ($2::text IS NULL OR status = $2) AND ($3::text IS NULL OR body::text ILIKE $3)";
    let rows: Vec<Value> = sqlx::query_scalar(&format!("SELECT body FROM questions WHERE {FILTER} ORDER BY id LIMIT $4 OFFSET $5"))
        .bind(&q.exam)
        .bind(&q.status)
        .bind(&like)
        .bind(limit)
        .bind(offset)
        .fetch_all(db(&state))
        .await
        .map_err(ApiError::internal)?;
    let total: i64 = sqlx::query_scalar(&format!("SELECT COUNT(*) FROM questions WHERE {FILTER}"))
        .bind(&q.exam)
        .bind(&q.status)
        .bind(&like)
        .fetch_one(db(&state))
        .await
        .map_err(ApiError::internal)?;
    Ok(Json(json!({ "total": total, "items": rows })))
}

#[derive(Deserialize)]
pub struct StatusReq {
    status: String,
}

pub async fn admin_update_question(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(req): Json<StatusReq>,
) -> ApiResult<Json<Value>> {
    require_admin(&state, &headers).await?;
    if !matches!(req.status.as_str(), "draft" | "reviewed" | "rejected") {
        return Err(ApiError::bad("status must be draft, reviewed or rejected"));
    }
    content::set_question_status(&state, &id, &req.status).await.map_err(|e| {
        if e.contains("not found") {
            ApiError::not_found()
        } else {
            ApiError::internal(e)
        }
    })?;
    Ok(Json(json!({ "ok": true })))
}

pub async fn admin_attempts(State(state): State<AppState>, headers: HeaderMap, Query(q): Query<ListQuery>) -> ApiResult<Json<Value>> {
    require_admin(&state, &headers).await?;
    let limit = q.limit.unwrap_or(100).clamp(1, 500);
    let found: Vec<(i64, String, String, f64, i64, i64, Option<String>)> = sqlx::query_as(
        "SELECT a.id, a.exam, a.paper, a.score, a.total, a.created_at, u.name FROM attempts a
         LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT $1",
    )
    .bind(limit)
    .fetch_all(db(&state))
    .await
    .map_err(ApiError::internal)?;
    let rows: Vec<Value> = found
        .into_iter()
        .map(|r| {
            json!({
                "id": r.0, "exam": r.1, "paper": r.2, "score": r.3, "total": r.4, "created_at": r.5, "student": r.6
            })
        })
        .collect();
    Ok(Json(Value::Array(rows)))
}

pub async fn admin_reload(State(state): State<AppState>, headers: HeaderMap) -> ApiResult<Json<Value>> {
    require_admin(&state, &headers).await?;
    let n = content::import_bank(&state).await.map_err(ApiError::internal)?;
    Ok(Json(json!({ "ok": true, "questions": n })))
}

// ------------------------------------------------------------------ payments

/// Razorpay webhook. Expects payment notes { phone, exam, tier } set on the
/// payment link. Inactive until RAZORPAY_WEBHOOK_SECRET is configured.
pub async fn razorpay_webhook(State(state): State<AppState>, headers: HeaderMap, body: Bytes) -> ApiResult<Json<Value>> {
    if state.cfg.razorpay_secret.is_empty() {
        return Err(ApiError(StatusCode::SERVICE_UNAVAILABLE, "payments not configured yet".into()));
    }
    let sig = headers.get("x-razorpay-signature").and_then(|v| v.to_str().ok()).unwrap_or("");
    let mut mac = Hmac::<Sha256>::new_from_slice(state.cfg.razorpay_secret.as_bytes()).map_err(ApiError::internal)?;
    mac.update(&body);
    let expected = hex::encode(mac.finalize().into_bytes());
    if sig.is_empty() || !constant_time_eq(expected.as_bytes(), sig.as_bytes()) {
        return Err(ApiError::forbidden("bad signature"));
    }
    let v: Value = serde_json::from_slice(&body).map_err(|_| ApiError::bad("bad JSON"))?;
    if v["event"] != "payment.captured" {
        return Ok(Json(json!({ "ok": true, "ignored": true })));
    }
    let entity = &v["payload"]["payment"]["entity"];
    let notes = &entity["notes"];
    let phone = notes["phone"].as_str().and_then(auth::normalize_phone).ok_or_else(|| ApiError::bad("missing phone note"))?;
    let tier = notes["tier"].as_str().unwrap_or("pass").to_string();
    let exams: Vec<String> = notes["exam"]
        .as_str()
        .unwrap_or("")
        .split(['+', ','])
        .map(|s| s.trim().to_string())
        .filter(|e| content::valid_exam(e))
        .collect();
    if exams.is_empty() {
        return Err(ApiError::bad("missing exam note"));
    }
    let payment_id = entity["id"].as_str().unwrap_or("").to_string();
    let t = now();
    for (i, exam) in exams.iter().enumerate() {
        sqlx::query(
            "INSERT INTO passes (phone, exam, tier, payment_id, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (payment_id) DO NOTHING",
        )
        .bind(&phone)
        .bind(exam)
        .bind(&tier)
        .bind(format!("{payment_id}:{i}"))
        .bind(t)
        .bind(t + state.cfg.pass_days * 86400)
        .execute(db(&state))
        .await
        .map_err(ApiError::internal)?;
    }
    Ok(Json(json!({ "ok": true })))
}

fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    a.len() == b.len() && a.iter().zip(b).fold(0u8, |acc, (x, y)| acc | (x ^ y)) == 0
}

// ------------------------------------------------------------------ Meta WhatsApp webhook

#[derive(Deserialize)]
pub struct VerifyQuery {
    #[serde(rename = "hub.mode")]
    mode: Option<String>,
    #[serde(rename = "hub.verify_token")]
    token: Option<String>,
    #[serde(rename = "hub.challenge")]
    challenge: Option<String>,
}

/// Meta's one-time webhook verification.
pub async fn wa_verify(State(state): State<AppState>, Query(q): Query<VerifyQuery>) -> Response {
    let ok = !state.cfg.wa_verify_token.is_empty()
        && q.mode.as_deref() == Some("subscribe")
        && q.token.as_deref() == Some(state.cfg.wa_verify_token.as_str());
    if ok {
        (StatusCode::OK, q.challenge.unwrap_or_default()).into_response()
    } else {
        StatusCode::FORBIDDEN.into_response()
    }
}

/// Incoming WhatsApp events. Checks Meta's signature on the raw body, answers
/// 200 at once, and forwards the event to n8n (retrying every 10 s for up to
/// an hour if n8n is down).
pub async fn wa_webhook(State(state): State<AppState>, headers: HeaderMap, body: Bytes) -> Response {
    if state.cfg.meta_app_secret.is_empty() {
        return (StatusCode::SERVICE_UNAVAILABLE, "WhatsApp not configured yet").into_response();
    }
    let sig = headers
        .get("x-hub-signature-256")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("sha256="))
        .unwrap_or("");
    let Ok(mut mac) = Hmac::<Sha256>::new_from_slice(state.cfg.meta_app_secret.as_bytes()) else {
        return StatusCode::INTERNAL_SERVER_ERROR.into_response();
    };
    mac.update(&body);
    let expected = hex::encode(mac.finalize().into_bytes());
    if sig.is_empty() || !constant_time_eq(expected.as_bytes(), sig.as_bytes()) {
        tracing::warn!("WhatsApp webhook: bad signature");
        return StatusCode::FORBIDDEN.into_response();
    }
    let http = state.http.clone();
    let url = state.cfg.n8n_inbound_url.clone();
    let key = state.cfg.automation_key.clone();
    tokio::spawn(async move {
        for attempt in 1..=360u32 {
            let res = http
                .post(&url)
                .header("content-type", "application/json")
                .header("x-automation-key", &key)
                .body(body.clone())
                .send()
                .await;
            match res {
                Ok(r) if r.status().is_success() => return,
                Ok(r) if r.status().is_client_error() && !matches!(r.status().as_u16(), 404 | 408 | 409 | 429) => {
                    // 404 is retried too: n8n returns it while the workflow is inactive or restarting.
                    tracing::error!("n8n rejected WhatsApp event: HTTP {}", r.status());
                    return;
                }
                Ok(r) => tracing::warn!("n8n not ready (HTTP {}), retrying in 10 s (try {attempt})", r.status()),
                Err(e) => tracing::warn!("n8n unreachable ({e}), retrying in 10 s (try {attempt})"),
            }
            tokio::time::sleep(std::time::Duration::from_secs(10)).await;
        }
        tracing::error!("gave up forwarding a WhatsApp event to n8n after an hour");
    });
    StatusCode::OK.into_response()
}
