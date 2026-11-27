//! Question bank import, status updates written back to the bank files,
//! and paper listing/loading (free papers from the static build folder,
//! paid papers from content/papers, which is never in the public build).

use rusqlite::params;
use serde_json::Value;
use std::path::{Path, PathBuf};

use crate::{now, AppState};

pub const EXAMS: [&str; 7] = ["bpsc-tre", "bpsc-cce", "mppsc", "ras", "bihar-stet", "ctet", "cg-tet"];

pub fn valid_exam(exam: &str) -> bool {
    EXAMS.contains(&exam)
}

fn safe_segment(s: &str) -> bool {
    !s.is_empty() && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn json_files(dir: &Path) -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = std::fs::read_dir(dir)
        .map(|rd| {
            rd.filter_map(|e| e.ok())
                .map(|e| e.path())
                .filter(|p| p.extension().map(|x| x == "json").unwrap_or(false))
                .collect()
        })
        .unwrap_or_default();
    out.sort();
    out
}

fn en(v: &Value) -> String {
    v.get("en").and_then(|x| x.as_str()).unwrap_or("").to_string()
}

/// Loads every question in content/bank/<exam>/*.json into SQLite (replacing
/// what was there) and remembers which file each question lives in.
pub fn import_bank(state: &AppState) -> Result<usize, String> {
    let root = &state.cfg.bank_dir;
    if !root.exists() {
        return Err(format!("{} does not exist yet", root.display()));
    }
    let mut map = std::collections::HashMap::new();
    let mut rows: Vec<(String, String, String, String, String, String, String, String)> = Vec::new();
    for exam in EXAMS {
        for file in json_files(&root.join(exam)) {
            let text = match std::fs::read_to_string(&file) {
                Ok(t) => t,
                Err(_) => continue,
            };
            let arr: Vec<Value> = match serde_json::from_str(&text) {
                Ok(a) => a,
                Err(e) => {
                    tracing::warn!("skipping {}: {e}", file.display());
                    continue;
                }
            };
            for q in arr {
                let Some(id) = q.get("id").and_then(|x| x.as_str()).map(String::from) else { continue };
                map.insert(id.clone(), file.clone());
                rows.push((
                    id,
                    exam.to_string(),
                    en(&q["subject"]),
                    en(&q["topic"]),
                    q["difficulty"].as_str().unwrap_or("").to_string(),
                    q["type"].as_str().unwrap_or("single").to_string(),
                    q["status"].as_str().unwrap_or("draft").to_string(),
                    q.to_string(),
                ));
            }
        }
    }
    let n = rows.len();
    {
        let mut conn = state.db.lock().map_err(|_| "db lock")?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        tx.execute("DELETE FROM questions", []).map_err(|e| e.to_string())?;
        {
            let mut stmt = tx
                .prepare(
                    "INSERT OR REPLACE INTO questions (id, exam, subject, topic, difficulty, qtype, status, body, updated_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                )
                .map_err(|e| e.to_string())?;
            let t = now();
            for r in &rows {
                stmt.execute(params![r.0, r.1, r.2, r.3, r.4, r.5, r.6, r.7, t]).map_err(|e| e.to_string())?;
            }
        }
        tx.commit().map_err(|e| e.to_string())?;
    }
    *state.qfiles.lock().map_err(|_| "lock")? = map;
    Ok(n)
}

/// Sets a question's status in SQLite and in its bank file, so the pipeline
/// (which reads the files) sees the admin's decision.
pub fn set_question_status(state: &AppState, id: &str, status: &str) -> Result<(), String> {
    let file = state
        .qfiles
        .lock()
        .map_err(|_| "lock")?
        .get(id)
        .cloned()
        .ok_or("question not found")?;
    let text = std::fs::read_to_string(&file).map_err(|e| e.to_string())?;
    let mut arr: Vec<Value> = serde_json::from_str(&text).map_err(|e| e.to_string())?;
    let mut found = false;
    for q in arr.iter_mut() {
        if q.get("id").and_then(|x| x.as_str()) == Some(id) {
            q["status"] = Value::String(status.to_string());
            found = true;
        }
    }
    if !found {
        return Err("question not found in its file".into());
    }
    let tmp = file.with_extension("json.tmp");
    let pretty = serde_json::to_string_pretty(&arr).map_err(|e| e.to_string())?;
    std::fs::write(&tmp, pretty + "\n").map_err(|e| e.to_string())?;
    std::fs::rename(&tmp, &file).map_err(|e| e.to_string())?;

    let conn = state.db.lock().map_err(|_| "db lock")?;
    let body: String = conn
        .query_row("SELECT body FROM questions WHERE id = ?1", params![id], |r| r.get(0))
        .map_err(|e| e.to_string())?;
    let mut v: Value = serde_json::from_str(&body).map_err(|e| e.to_string())?;
    v["status"] = Value::String(status.to_string());
    conn.execute(
        "UPDATE questions SET status = ?1, body = ?2, updated_at = ?3 WHERE id = ?4",
        params![status, v.to_string(), now(), id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

pub struct PaperFile {
    pub path: PathBuf,
    pub free: bool,
}

fn paper_dirs(state: &AppState, exam: &str) -> [(PathBuf, bool); 2] {
    [
        (state.cfg.free_papers_dir.join(exam), true),
        (state.cfg.paid_papers_dir.join(exam), false),
    ]
}

pub fn list_papers(state: &AppState, exam: &str) -> Vec<Value> {
    let mut out = Vec::new();
    for (dir, from_free_dir) in paper_dirs(state, exam) {
        for file in json_files(&dir) {
            let Ok(text) = std::fs::read_to_string(&file) else { continue };
            let Ok(p) = serde_json::from_str::<Value>(&text) else { continue };
            let questions: usize = p["sections"]
                .as_array()
                .map(|s| s.iter().map(|sec| sec["questions"].as_array().map(|q| q.len()).unwrap_or(0)).sum())
                .unwrap_or(0);
            out.push(serde_json::json!({
                "id": p["id"],
                "kind": p["kind"],
                "title": p["title"],
                "free": from_free_dir && p["free"].as_bool().unwrap_or(true),
                "status": p["status"],
                "questions": questions,
                "duration_minutes": p["duration_minutes"],
            }));
        }
    }
    out
}

pub fn find_paper(state: &AppState, exam: &str, id: &str) -> Option<PaperFile> {
    if !valid_exam(exam) || !safe_segment(id) {
        return None;
    }
    for (dir, from_free_dir) in paper_dirs(state, exam) {
        let path = dir.join(format!("{id}.json"));
        if path.exists() {
            return Some(PaperFile { path, free: from_free_dir });
        }
    }
    None
}
