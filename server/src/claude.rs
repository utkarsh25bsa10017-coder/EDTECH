//! Claude Messages API over raw HTTP (there is no official Rust SDK).
//! Retry rule (docs/ARCHITECTURE.md): transient errors wait 10 s and retry;
//! permanent errors stop.

use serde_json::{json, Value};
use std::time::Duration;

use crate::Config;

#[derive(Debug)]
pub enum ClaudeError {
    NoKey,
    Permanent(String),
    GaveUp(String),
    Refusal,
}

impl std::fmt::Display for ClaudeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ClaudeError::NoKey => write!(f, "ANTHROPIC_API_KEY is not set"),
            ClaudeError::Permanent(m) => write!(f, "permanent API error: {m}"),
            ClaudeError::GaveUp(m) => write!(f, "gave up after retries: {m}"),
            ClaudeError::Refusal => write!(f, "the model declined to answer"),
        }
    }
}

const RETRY_WAIT: Duration = Duration::from_secs(10);
/// A live request (someone is waiting) stops after this many tries.
const LIVE_MAX_TRIES: u32 = 6;

fn is_transient(status: u16) -> bool {
    matches!(status, 408 | 409 | 429 | 500..=599)
}

fn supports_server_fallback(model: &str) -> bool {
    model.starts_with("claude-opus") || model.starts_with("claude-sonnet") || model.starts_with("claude-fable")
}

/// `messages`: [{"role": "user"|"assistant", "content": "..."}], ending with a user turn.
/// `live`: true when a person is waiting for the reply (bounded retries).
pub async fn ask(
    http: &reqwest::Client,
    cfg: &Config,
    system: &str,
    messages: Vec<Value>,
    live: bool,
) -> Result<String, ClaudeError> {
    if cfg.anthropic_key.is_empty() {
        return Err(ClaudeError::NoKey);
    }
    let mut body = json!({
        "model": cfg.chat_model,
        "max_tokens": 2048,
        "system": system,
        "messages": messages,
        "output_config": { "effort": "low" }
    });
    let use_fallback = supports_server_fallback(&cfg.chat_model);
    if use_fallback {
        body["fallbacks"] = json!("default");
    }

    let mut tries = 0u32;
    loop {
        tries += 1;
        let mut req = http
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &cfg.anthropic_key)
            .header("anthropic-version", "2026-10-21")
            .header("content-type", "application/json");
        if use_fallback {
            req = req.header("anthropic-beta", "server-side-fallback-2026-07-01");
        }
        let outcome = req.json(&body).send().await;

        let last_err = match outcome {
            Ok(resp) => {
                let status = resp.status().as_u16();
                if resp.status().is_success() {
                    let v: Value = resp
                        .json()
                        .await
                        .map_err(|e| ClaudeError::Permanent(format!("bad JSON: {e}")))?;
                    if v["stop_reason"] == "refusal" {
                        return Err(ClaudeError::Refusal);
                    }
                    let text: String = v["content"]
                        .as_array()
                        .map(|blocks| {
                            blocks
                                .iter()
                                .filter(|b| b["type"] == "text")
                                .filter_map(|b| b["text"].as_str())
                                .collect::<Vec<_>>()
                                .join("")
                        })
                        .unwrap_or_default();
                    return Ok(text.trim().to_string());
                }
                let detail = resp.text().await.unwrap_or_default();
                if !is_transient(status) {
                    tracing::error!("Claude API {status}: {detail}");
                    return Err(ClaudeError::Permanent(format!("HTTP {status}")));
                }
                format!("HTTP {status}")
            }
            Err(e) => format!("network: {e}"),
        };

        if live && tries >= LIVE_MAX_TRIES {
            return Err(ClaudeError::GaveUp(last_err));
        }
        tracing::warn!("Claude API transient error ({last_err}); retrying in 10 s (try {tries})");
        tokio::time::sleep(RETRY_WAIT).await;
    }
}
