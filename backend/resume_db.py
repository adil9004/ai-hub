import os
import sqlite3
from datetime import datetime

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BACKEND_DIR, "resume_analyzer.db")

def init_db():
    """Initializes the SQLite database and creates the analyses table if it doesn't exist."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            resume_text TEXT NOT NULL,
            analysis_result TEXT NOT NULL,
            username TEXT NOT NULL DEFAULT ''
        )
    """)
    # Add username column if it doesn't exist (for existing databases)
    try:
        cursor.execute("ALTER TABLE analyses ADD COLUMN username TEXT NOT NULL DEFAULT ''")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()

def save_analysis(filename, resume_text, analysis_result, username):
    """Saves a resume analysis record to the database."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO analyses (filename, timestamp, resume_text, analysis_result, username)
        VALUES (?, ?, ?, ?, ?)
    """, (filename, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), resume_text, analysis_result, username))
    conn.commit()
    conn.close()

def get_all_analyses(username):
    """Retrieves past analyses for a specific user, ordered by timestamp descending."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, filename, timestamp, resume_text, analysis_result FROM analyses WHERE username = ? ORDER BY timestamp DESC",
        (username,)
    )
    rows = cursor.fetchall()
    conn.close()
    return rows

def delete_analysis(analysis_id, username):
    """Deletes a specific analysis record belonging to the given user."""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analyses WHERE id = ? AND username = ?", (analysis_id, username))
    conn.commit()
    conn.close()
