//! Prashnottar API server: auth, leads, attempts, paid papers, chatbot,
//! WhatsApp bot replies for n8n, admin. Contract: docs/ARCHITECTURE.md.

mod api;
mod auth;
mod claude;
mod content;
mod db;

use std::{
    collections::HashMap,
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, Mutex},
};

use axum::{
    http::{header, HeaderValue, Method},
    routing::{get, patch, post},
    Router,
};
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    services::{ServeDir, ServeFile},
};

pub struct Config {
    pub port: u16,
    pub data_dir: PathBuf,
    pub web_dist: PathBuf,
    pub free_papers_dir: PathBuf,
    pub paid_papers_dir: PathBuf,
    pub bank_dir: PathBuf,
    pub site_url: String,
    pub admin_username: String,
    pub admin_password: String,
    pub automation_key: String,
    pub anthropic_key: String,
    pub chat_model: String,
    pub razorpay_secret: String,
    pub pass_days: i64,
    pub cors_origins: Vec<String>,
    pub secure_cookies: bool,
    pub meta_app_secret: String,
    pub wa_verify_token: String,
    pub n8n_inbound_url: String,
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).ok().filter(|v| !v.trim().is_empty()).unwrap_or_else(|| default.to_string())
}

impl Config {
    fn from_env() -> Self {
        let root = PathBuf::from(env_or("PROJECT_ROOT", ".."));
        Config {
            port: env_or("PORT", "8787").parse().unwrap_or(8787),
            data_dir: PathBuf::from(env_or("DATA_DIR", "data")),
            web_dist: PathBuf::from(env_or("WEB_DIST", &root.join("web/dist").to_string_lossy())),
            free_papers_dir: PathBuf::from(env_or("FREE_PAPERS_DIR", &root.join("web/src/data/papers").to_string_lossy())),
            paid_papers_dir: PathBuf::from(env_or("PAID_PAPERS_DIR", &root.join("content/papers").to_string_lossy())),
            bank_dir: PathBuf::from(env_or("BANK_DIR", &root.join("content/bank").to_string_lossy())),
            site_url: env_or("PUBLIC_SITE_URL", "http://localhost:8787").trim_end_matches('/').to_string(),
            admin_username: env_or("ADMIN_USERNAME", ""),
            admin_password: env_or("ADMIN_PASSWORD", ""),
            automation_key: env_or("AUTOMATION_KEY", ""),
            anthropic_key: env_or("ANTHROPIC_API_KEY", ""),
            chat_model: env_or("CHAT_MODEL", "claude-opus-5-5"),
            razorpay_secret: env_or("RAZORPAY_WEBHOOK_SECRET", ""),
            pass_days: env_or("PASS_DAYS", "365").parse().unwrap_or(365),
            cors_origins: env_or("CORS_ORIGINS", "")
                .split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect(),
            secure_cookies: env_or("SECURE_COOKIES", "false") == "true",
            meta_app_secret: env_or("META_APP_SECRET", ""),
            wa_verify_token: env_or("WHATSAPP_VERIFY_TOKEN", ""),
            n8n_inbound_url: env_or("N8N_INBOUND_URL", "http://n8n:5678/webhook/wa-inbound"),
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Mutex<rusqlite::Connection>>,
    pub cfg: Arc<Config>,
    pub http: reqwest::Client,
    /// ip -> (window start, count) for the public chatbot
    pub rate: Arc<Mutex<HashMap<String, (i64, u32)>>>,
    /// question id -> bank file it lives in
    pub qfiles: Arc<Mutex<HashMap<String, PathBuf>>>,
}

pub fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let cfg = Config::from_env();
    std::fs::create_dir_all(&cfg.data_dir).expect("create data dir");
    let conn = db::open(&cfg.data_dir.join("prashnottar.db")).expect("open database");

    if cfg.admin_username.is_empty() || cfg.admin_password.is_empty() {
        tracing::warn!("ADMIN_USERNAME / ADMIN_PASSWORD not set: no admin account will be created");
    } else {
        auth::ensure_admin(&conn, &cfg.admin_username, &cfg.admin_password).expect("seed admin");
    }
    if cfg.anthropic_key.is_empty() {
        tracing::warn!("ANTHROPIC_API_KEY not set: the chatbot will answer with a fallback message");
    }

    let state = AppState {
        db: Arc::new(Mutex::new(conn)),
        cfg: Arc::new(cfg),
        http: reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .expect("http client"),
        rate: Arc::new(Mutex::new(HashMap::new())),
        qfiles: Arc::new(Mutex::new(HashMap::new())),
    };

    match content::import_bank(&state) {
        Ok(n) => tracing::info!("question bank: {n} questions loaded"),
        Err(e) => tracing::warn!("question bank not loaded: {e}"),
    }

    let api = Router::new()
        .route("/auth/login", post(api::login))
        .route("/auth/register", post(api::register))
        .route("/auth/logout", post(api::logout))
        .route("/auth/me", get(api::me))
        .route("/leads", post(api::create_lead))
        .route("/attempts", post(api::create_attempt))
        .route("/chat", post(api::chat))
        .route("/papers/{exam}", get(api::list_papers))
        .route("/papers/{exam}/{id}", get(api::get_paper))
        .route("/whatsapp/webhook", get(api::wa_verify).post(api::wa_webhook))
        .route("/bot/whatsapp", post(api::bot_whatsapp))
        .route("/automation/followups", get(api::due_followups))
        .route("/automation/followups/{lead_id}", post(api::mark_followup))
        .route("/admin/stats", get(api::admin_stats))
        .route("/admin/leads", get(api::admin_leads))
        .route("/admin/questions", get(api::admin_questions))
        .route("/admin/questions/{id}", patch(api::admin_update_question))
        .route("/admin/attempts", get(api::admin_attempts))
        .route("/admin/reload", post(api::admin_reload))
        .route("/payments/razorpay", post(api::razorpay_webhook))
        .route("/health", get(|| async { "ok" }));

    let mut origins: Vec<HeaderValue> = ["tauri://localhost", "http://tauri.localhost", "https://tauri.localhost"]
        .iter()
        .map(|o| HeaderValue::from_static(o))
        .collect();
    for o in &state.cfg.cors_origins {
        if let Ok(v) = HeaderValue::from_str(o) {
            origins.push(v);
        }
    }
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .allow_credentials(true);

    let dist = state.cfg.web_dist.clone();
    let static_files = ServeDir::new(&dist)
        .append_index_html_on_directories(true)
        .not_found_service(ServeFile::new(dist.join("404.html")));

    let port = state.cfg.port;
    let app = Router::new()
        .nest("/api", api.with_state(state))
        .fallback_service(static_files)
        .layer(cors);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("listening on {addr}");
    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .expect("server");
}
