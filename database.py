import sqlite3
import uuid
from datetime import datetime
from typing import Optional, List

DB_PATH = "whatsapp_dashboard.db"


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS campaigns (
            id          TEXT PRIMARY KEY,
            timestamp   TEXT NOT NULL,
            template_name TEXT NOT NULL,
            total_messages INTEGER DEFAULT 0,
            success_count  INTEGER DEFAULT 0,
            failure_count  INTEGER DEFAULT 0,
            status      TEXT DEFAULT 'pending'
        );

        CREATE TABLE IF NOT EXISTS campaign_messages (
            id          TEXT PRIMARY KEY,
            campaign_id TEXT NOT NULL,
            phone       TEXT NOT NULL,
            name        TEXT,
            status      TEXT DEFAULT 'pending',
            error       TEXT,
            timestamp   TEXT,
            FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
        );

        CREATE TABLE IF NOT EXISTS contacts (
            phone            TEXT PRIMARY KEY,
            name             TEXT,
            last_message     TEXT,
            last_message_time TEXT
        );

        CREATE TABLE IF NOT EXISTS messages (
            id           TEXT PRIMARY KEY,
            phone        TEXT NOT NULL,
            wa_message_id TEXT,
            content      TEXT,
            direction    TEXT,
            timestamp    TEXT
        );
        """
    )
    conn.commit()
    conn.close()


# ──────────────────────────── Campaigns ────────────────────────────

def create_campaign(campaign_id: str, template_name: str, total: int):
    conn = get_db()
    conn.execute(
        "INSERT INTO campaigns (id, timestamp, template_name, total_messages, status) VALUES (?,?,?,?,?)",
        (campaign_id, _now(), template_name, total, "processing"),
    )
    conn.commit()
    conn.close()


def add_campaign_message(
    campaign_id: str, phone: str, name: str, status: str, error: Optional[str]
):
    conn = get_db()
    conn.execute(
        """INSERT INTO campaign_messages
           (id, campaign_id, phone, name, status, error, timestamp)
           VALUES (?,?,?,?,?,?,?)""",
        (str(uuid.uuid4()), campaign_id, phone, name, status, error, _now()),
    )
    conn.commit()
    conn.close()


def update_campaign_status(campaign_id: str, status: str, success: int, failed: int):
    conn = get_db()
    conn.execute(
        "UPDATE campaigns SET status=?, success_count=?, failure_count=? WHERE id=?",
        (status, success, failed, campaign_id),
    )
    conn.commit()
    conn.close()


def get_campaigns(limit: int = 200) -> List[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM campaigns ORDER BY timestamp DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_campaign(campaign_id: str) -> Optional[dict]:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM campaigns WHERE id=?", (campaign_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_campaign_messages(campaign_id: str) -> List[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM campaign_messages WHERE campaign_id=? ORDER BY timestamp DESC",
        (campaign_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ──────────────────────────── Messages / Inbox ────────────────────────────

def save_inbound_message(
    phone: str, name: str, wa_message_id: str, content: str, timestamp: str
):
    conn = get_db()
    conn.execute(
        """INSERT OR IGNORE INTO messages (id, phone, wa_message_id, content, direction, timestamp)
           VALUES (?,?,?,?,?,?)""",
        (str(uuid.uuid4()), phone, wa_message_id, content, "inbound", timestamp),
    )
    conn.execute(
        """INSERT INTO contacts (phone, name, last_message, last_message_time)
           VALUES (?,?,?,?)
           ON CONFLICT(phone) DO UPDATE SET
               name=excluded.name,
               last_message=excluded.last_message,
               last_message_time=excluded.last_message_time""",
        (phone, name, content, timestamp),
    )
    conn.commit()
    conn.close()


def save_outbound_message(phone: str, content: str):
    ts = _now()
    conn = get_db()
    conn.execute(
        "INSERT INTO messages (id, phone, content, direction, timestamp) VALUES (?,?,?,?,?)",
        (str(uuid.uuid4()), phone, content, "outbound", ts),
    )
    conn.execute(
        "UPDATE contacts SET last_message=?, last_message_time=? WHERE phone=?",
        (content, ts, phone),
    )
    conn.commit()
    conn.close()


def get_inbox_contacts() -> List[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM contacts ORDER BY last_message_time DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_contact(phone: str) -> dict:
    conn = get_db()
    row = conn.execute(
        "SELECT * FROM contacts WHERE phone=?", (phone,)
    ).fetchone()
    conn.close()
    return dict(row) if row else {"phone": phone, "name": phone, "last_message": ""}


def get_conversation(phone: str) -> List[dict]:
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM messages WHERE phone=? ORDER BY timestamp ASC", (phone,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_recent_inbound(limit: int = 5) -> List[dict]:
    conn = get_db()
    rows = conn.execute(
        """SELECT m.*, c.name FROM messages m
           LEFT JOIN contacts c ON m.phone = c.phone
           WHERE m.direction='inbound'
           ORDER BY m.timestamp DESC LIMIT ?""",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ──────────────────────────── Dashboard Stats ────────────────────────────

def get_dashboard_stats() -> dict:
    conn = get_db()

    total_campaigns = conn.execute(
        "SELECT COUNT(*) FROM campaigns"
    ).fetchone()[0]

    messages_sent = conn.execute(
        "SELECT COALESCE(SUM(success_count), 0) FROM campaigns"
    ).fetchone()[0]

    total_contacts = conn.execute(
        "SELECT COUNT(*) FROM contacts"
    ).fetchone()[0]

    inbound_messages = conn.execute(
        "SELECT COUNT(*) FROM messages WHERE direction='inbound'"
    ).fetchone()[0]

    conn.close()
    return {
        "total_campaigns": total_campaigns,
        "messages_sent": messages_sent,
        "total_contacts": total_contacts,
        "inbound_messages": inbound_messages,
    }


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
