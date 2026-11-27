use rusqlite::Connection;
use std::path::Path;

pub fn open(path: &Path) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            username TEXT UNIQUE,
            phone TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
        );
        -- Passes are keyed by phone so a payment can arrive before the account exists.
        CREATE TABLE IF NOT EXISTS passes (
            id INTEGER PRIMARY KEY,
            phone TEXT NOT NULL,
            exam TEXT NOT NULL,
            tier TEXT NOT NULL,
            payment_id TEXT UNIQUE,
            created_at INTEGER NOT NULL,
            expires_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY,
            phone TEXT NOT NULL,
            name TEXT,
            exam TEXT NOT NULL,
            score INTEGER,
            total INTEGER,
            source TEXT NOT NULL,
            consent INTEGER NOT NULL DEFAULT 0,
            opted_out INTEGER NOT NULL DEFAULT 0,
            followup_step INTEGER NOT NULL DEFAULT 0,
            next_followup_at INTEGER,
            created_at INTEGER NOT NULL,
            UNIQUE(phone, exam)
        );
        CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            exam TEXT NOT NULL,
            paper TEXT NOT NULL,
            score REAL NOT NULL,
            total INTEGER NOT NULL,
            answers TEXT NOT NULL,
            topics TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS questions (
            id TEXT PRIMARY KEY,
            exam TEXT NOT NULL,
            subject TEXT NOT NULL,
            topic TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            qtype TEXT NOT NULL,
            status TEXT NOT NULL,
            body TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS questions_exam_status ON questions(exam, status);
        CREATE TABLE IF NOT EXISTS wa_messages (
            id INTEGER PRIMARY KEY,
            phone TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS wa_messages_phone ON wa_messages(phone, id);
        "#,
    )?;
    Ok(conn)
}
