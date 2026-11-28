use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::http::HeaderMap;
use rand::RngCore;
use rusqlite::{params, Connection, OptionalExtension};

use crate::{now, AppState};

pub const SESSION_DAYS: i64 = 30;

#[derive(Clone, Debug)]
pub struct User {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub role: String,
}

impl User {
    pub fn is_admin(&self) -> bool {
        self.role == "admin"
    }
}

pub fn hash_password(password: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .expect("hash password")
        .to_string()
}

pub fn verify_password(password: &str, hash: &str) -> bool {
    PasswordHash::new(hash)
        .map(|h| Argon2::default().verify_password(password.as_bytes(), &h).is_ok())
        .unwrap_or(false)
}

/// Creates the admin account, or brings it in line with the environment
/// (phone, password, role), so changing ADMIN_PHONE / ADMIN_PASSWORD and
/// restarting takes effect. The admin signs in with ADMIN_PHONE like everyone else.
pub fn ensure_admin(conn: &Connection, username: &str, phone: &str, password: &str) -> rusqlite::Result<()> {
    // Free the number if a different account holds it, so the admin can sign in with it.
    conn.execute(
        "UPDATE users SET phone = NULL WHERE phone = ?1 AND (username IS NULL OR username != ?2)",
        params![phone, username],
    )?;
    let existing: Option<(i64, String)> = conn
        .query_row(
            "SELECT id, password_hash FROM users WHERE username = ?1",
            params![username],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?;
    match existing {
        Some((id, hash)) => {
            let hash = if verify_password(password, &hash) { hash } else { hash_password(password) };
            conn.execute(
                "UPDATE users SET phone = ?1, password_hash = ?2, role = 'admin' WHERE id = ?3",
                params![phone, hash, id],
            )?;
        }
        None => {
            conn.execute(
                "INSERT INTO users (name, username, phone, password_hash, role, created_at) VALUES (?1, ?1, ?2, ?3, 'admin', ?4)",
                params![username, phone, hash_password(password), now()],
            )?;
        }
    }
    Ok(())
}

pub fn new_session(conn: &Connection, user_id: i64) -> rusqlite::Result<String> {
    let mut bytes = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut bytes);
    let token = hex::encode(bytes);
    let t = now();
    conn.execute(
        "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)",
        params![token, user_id, t, t + SESSION_DAYS * 86400],
    )?;
    Ok(token)
}

pub fn token_from_headers(headers: &HeaderMap) -> Option<String> {
    if let Some(v) = headers.get("authorization").and_then(|v| v.to_str().ok()) {
        if let Some(t) = v.strip_prefix("Bearer ") {
            return Some(t.trim().to_string());
        }
    }
    let cookies = headers.get("cookie").and_then(|v| v.to_str().ok())?;
    cookies.split(';').find_map(|c| {
        let c = c.trim();
        c.strip_prefix("pr_session=").map(|t| t.to_string())
    })
}

pub fn current_user(state: &AppState, headers: &HeaderMap) -> Option<User> {
    let token = token_from_headers(headers)?;
    let conn = state.db.lock().ok()?;
    conn.query_row(
        "SELECT u.id, u.name, u.phone, u.role FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token = ?1 AND s.expires_at > ?2",
        params![token, now()],
        |r| {
            Ok(User {
                id: r.get(0)?,
                name: r.get(1)?,
                phone: r.get(2)?,
                role: r.get(3)?,
            })
        },
    )
    .optional()
    .ok()
    .flatten()
}

pub fn session_cookie(token: &str, secure: bool) -> String {
    format!(
        "pr_session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={}{}",
        SESSION_DAYS * 86400,
        if secure { "; Secure" } else { "" }
    )
}

pub fn clear_cookie() -> String {
    "pr_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0".to_string()
}

/// The 10 digits a person typed to sign in (optional +91 / 91 / 0 prefix).
/// Looser than `normalize_phone`: any 10 digits, so the admin number works.
pub fn login_phone(raw: &str) -> Option<String> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    let d = if digits.len() == 12 && digits.starts_with("91") {
        &digits[2..]
    } else if digits.len() == 11 && digits.starts_with('0') {
        &digits[1..]
    } else {
        &digits[..]
    };
    (d.len() == 10).then(|| d.to_string())
}

/// Indian mobile number: 10 digits starting 6-9, optional +91 / 91 / 0 prefix.
pub fn normalize_phone(raw: &str) -> Option<String> {
    let digits: String = raw.chars().filter(|c| c.is_ascii_digit()).collect();
    let d = if digits.len() == 12 && digits.starts_with("91") {
        &digits[2..]
    } else if digits.len() == 11 && digits.starts_with('0') {
        &digits[1..]
    } else {
        &digits[..]
    };
    if d.len() == 10 && matches!(d.as_bytes()[0], b'6'..=b'9') {
        Some(d.to_string())
    } else {
        None
    }
}
