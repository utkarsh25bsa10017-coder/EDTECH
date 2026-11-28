//! Question bank import, status updates written back to the bank files,
//! and paper listing/loading (free papers from the static build folder,
//! paid papers from content/papers, which is never in the public build).

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

/// Loads every question in content/bank/<exam>/*.json into the database
/// (replacing what was there) and remembers which file each question lives in.
/// If an id appears twice, the later file wins.
pub async fn import_bank(state: &AppState) -> Result<usize, String> {
    let root = &state.cfg.bank_dir;
    if !root.exists() {
        return Err(format!("{} does not exist yet", root.display()));
    }
    let mut map = std::collections::HashMap::new();
    let mut index: std::collections::HashMap<String, usize> = std::collections::HashMap::new();
    let mut rows: Vec<[String; 8]> = Vec::new();
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
                let row = [
                    id.clone(),
                    exam.to_string(),
                    en(&q["subject"]),
                    en(&q["topic"]),
                    q["difficulty"].as_str().unwrap_or("").to_string(),
                    q["type"].as_str().unwrap_or("single").to_string(),
                    q["status"].as_str().unwrap_or("draft").to_string(),
                    q.to_string(),
                ];
                match index.get(&id) {
                    Some(&i) => rows[i] = row,
                    None => {
                        index.insert(id, rows.len());
                        rows.push(row);
                    }
                }
            }
        }
    }
    let n = rows.len();
    let t = now();
    let mut tx = state.db.begin().await.map_err(|e| e.to_string())?;
    sqlx::query("DELETE FROM questions").execute(&mut *tx).await.map_err(|e| e.to_string())?;
    for chunk in rows.chunks(500) {
        let col = |i: usize| chunk.iter().map(|r| r[i].clone()).collect::<Vec<String>>();
        sqlx::query(
            "INSERT INTO questions (id, exam, subject, topic, difficulty, qtype, status, body, updated_at)
             SELECT id, exam, subject, topic, difficulty, qtype, status, body::jsonb, $9
             FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[])
                  AS u(id, exam, subject, topic, difficulty, qtype, status, body)",
        )
        .bind(col(0))
        .bind(col(1))
        .bind(col(2))
        .bind(col(3))
        .bind(col(4))
        .bind(col(5))
        .bind(col(6))
        .bind(col(7))
        .bind(t)
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    *state.qfiles.lock().map_err(|_| "lock")? = map;
    Ok(n)
}

/// Sets a question's status in the database and in its bank file, so the
/// pipeline (which reads the files) sees the admin's decision.
pub async fn set_question_status(state: &AppState, id: &str, status: &str) -> Result<(), String> {
    let file = state
        .qfiles
        .lock()
        .map_err(|_| "lock")?
        .get(id)
        .cloned()
        .ok_or("question not found")?;
    {
        // No await while this is held (std mutex): the whole read-edit-write is synchronous.
        let _guard = state.bank_write.lock().map_err(|_| "bank lock")?;
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
    }

    sqlx::query(
        "UPDATE questions SET status = $1, body = jsonb_set(body, '{status}', to_jsonb($1::text)), updated_at = $2 WHERE id = $3",
    )
    .bind(status)
    .bind(now())
    .bind(id)
    .execute(&state.db)
    .await
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
