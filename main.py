import os
import json
import uuid
import asyncio
from datetime import datetime
from typing import Optional, List

import requests
import pandas as pd
from io import BytesIO

from fastapi import FastAPI, Request, Form, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import database

load_dotenv()

app = FastAPI(title="WhatsApp Marketing Dashboard")

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SECRET_KEY", "whatsapp-dashboard-secret-key-change-in-prod"),
    max_age=3600,
)

templates = Jinja2Templates(directory="templates")

# In-memory job storage for bulk campaigns
bulk_jobs: dict = {}

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def get_whatsapp_config():
    return {
        "token": os.getenv("WHATSAPP_TOKEN", ""),
        "phone_number_id": os.getenv("PHONE_NUMBER_ID", ""),
        "waba_id": os.getenv("WHATSAPP_BUSINESS_ACCOUNT_ID", ""),
        "verify_token": os.getenv("VERIFY_TOKEN", "myverifytoken"),
    }


def is_logged_in(request: Request) -> bool:
    return bool(request.session.get("logged_in"))


# ──────────────────────────── Auth Routes ────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    if is_logged_in(request):
        return RedirectResponse("/dashboard")
    return RedirectResponse("/login")


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    if is_logged_in(request):
        return RedirectResponse("/dashboard")
    return templates.TemplateResponse("login.html", {"request": request, "error": None})


@app.post("/login")
async def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
):
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        request.session["logged_in"] = True
        request.session["username"] = username
        return RedirectResponse("/dashboard", status_code=302)
    return templates.TemplateResponse(
        "login.html", {"request": request, "error": "Invalid username or password."}
    )


@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse("/login")


# ──────────────────────────── Dashboard ────────────────────────────

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request):
    if not is_logged_in(request):
        return RedirectResponse("/login")
    stats = database.get_dashboard_stats()
    recent_campaigns = database.get_campaigns(limit=5)
    recent_messages = database.get_recent_inbound(limit=5)
    return templates.TemplateResponse(
        "dashboard.html",
        {
            "request": request,
            "stats": stats,
            "recent_campaigns": recent_campaigns,
            "recent_messages": recent_messages,
            "username": request.session.get("username", "Admin"),
        },
    )


# ──────────────────────────── Settings ────────────────────────────

@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    if not is_logged_in(request):
        return RedirectResponse("/login")
    cfg = get_whatsapp_config()

    def mask(val: str) -> str:
        if not val:
            return "(not set)"
        return val[:6] + "••••••" + val[-4:] if len(val) > 10 else "••••••"

    return templates.TemplateResponse(
        "settings.html",
        {
            "request": request,
            "token_masked": mask(cfg["token"]),
            "phone_id": cfg["phone_number_id"] or "(not set)",
            "waba_id": cfg["waba_id"] or "(not set)",
            "verify_token": cfg["verify_token"],
            "webhook_url": str(request.base_url) + "webhook",
            "username": request.session.get("username", "Admin"),
        },
    )


# ──────────────────────────── Send Template ────────────────────────────

@app.get("/send", response_class=HTMLResponse)
async def send_page(request: Request):
    if not is_logged_in(request):
        return RedirectResponse("/login")
    return templates.TemplateResponse(
        "send.html", {"request": request, "username": request.session.get("username", "Admin")}
    )


class SendTemplateRequest(BaseModel):
    phone: str
    template_name: str
    language_code: str = "en_US"
    variables: List[str] = []


@app.post("/api/send-template")
async def api_send_template(request: Request, payload: SendTemplateRequest):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="Not authenticated")
    result = send_whatsapp_template(
        payload.phone,
        payload.template_name,
        payload.language_code,
        payload.variables,
    )
    return result


# ──────────────────────────── Bulk Campaign ────────────────────────────

@app.get("/bulk", response_class=HTMLResponse)
async def bulk_page(request: Request):
    if not is_logged_in(request):
        return RedirectResponse("/login")
    return templates.TemplateResponse(
        "bulk.html", {"request": request, "username": request.session.get("username", "Admin")}
    )


@app.post("/api/bulk-upload")
async def bulk_upload(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    template_name: str = Form(...),
    language_code: str = Form("en_US"),
):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="Not authenticated")

    content = await file.read()
    try:
        df = pd.read_excel(BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Excel file: {e}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Excel file is empty")

    # Normalise column names
    df.columns = [str(c).strip() for c in df.columns]

    if "Phone" not in df.columns and "phone" not in df.columns:
        raise HTTPException(status_code=400, detail="Excel must contain a 'Phone' column")

    job_id = str(uuid.uuid4())
    campaign_id = str(uuid.uuid4())

    database.create_campaign(campaign_id, template_name, len(df))

    records = df.to_dict(orient="records")

    bulk_jobs[job_id] = {
        "status": "pending",
        "campaign_id": campaign_id,
        "template_name": template_name,
        "language_code": language_code,
        "total": len(records),
        "sent": 0,
        "success": 0,
        "failed": 0,
        "records": records,
        "errors": [],
    }

    background_tasks.add_task(process_bulk_job, job_id)

    return {"job_id": job_id, "campaign_id": campaign_id, "total": len(records)}


async def process_bulk_job(job_id: str):
    job = bulk_jobs.get(job_id)
    if not job:
        return

    job["status"] = "processing"

    for i, record in enumerate(job["records"]):
        phone_val = record.get("Phone") or record.get("phone") or ""
        phone = str(phone_val).strip()
        name_val = record.get("Name") or record.get("name") or phone
        name = str(name_val).strip()

        # All non-Name/Phone columns become template variables
        variables = []
        for col, val in record.items():
            if col.lower() not in ("name", "phone"):
                variables.append(str(val) if val is not None else "")

        result = send_whatsapp_template(phone, job["template_name"], job["language_code"], variables)

        if result.get("success"):
            job["success"] += 1
            status = "sent"
            error = None
        else:
            job["failed"] += 1
            status = "failed"
            error = result.get("error", "Unknown error")
            job["errors"].append({"phone": phone, "error": error})

        job["sent"] = i + 1
        database.add_campaign_message(job["campaign_id"], phone, name, status, error)

        # Respect WhatsApp rate limits (~80 msg/sec max, use 0.05s between)
        await asyncio.sleep(0.05)

    job["status"] = "completed"
    database.update_campaign_status(
        job["campaign_id"], "completed", job["success"], job["failed"]
    )


@app.get("/api/bulk-status/{job_id}")
async def bulk_status(request: Request, job_id: str):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="Not authenticated")
    job = bulk_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    total = job["total"] or 1
    return {
        "status": job["status"],
        "total": job["total"],
        "sent": job["sent"],
        "success": job["success"],
        "failed": job["failed"],
        "percent": int((job["sent"] / total) * 100),
        "campaign_id": job["campaign_id"],
    }


# ──────────────────────────── Campaign History ────────────────────────────

@app.get("/history", response_class=HTMLResponse)
async def history_page(request: Request):
    if not is_logged_in(request):
        return RedirectResponse("/login")
    campaigns = database.get_campaigns()
    return templates.TemplateResponse(
        "history.html",
        {
            "request": request,
            "campaigns": campaigns,
            "username": request.session.get("username", "Admin"),
        },
    )


@app.get("/history/{campaign_id}", response_class=HTMLResponse)
async def campaign_detail(request: Request, campaign_id: str):
    if not is_logged_in(request):
        return RedirectResponse("/login")
    campaign = database.get_campaign(campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    messages = database.get_campaign_messages(campaign_id)
    return templates.TemplateResponse(
        "campaign_detail.html",
        {
            "request": request,
            "campaign": campaign,
            "messages": messages,
            "username": request.session.get("username", "Admin"),
        },
    )


# ──────────────────────────── Webhook ────────────────────────────

@app.get("/webhook")
async def webhook_verify(request: Request):
    params = dict(request.query_params)
    mode = params.get("hub.mode")
    token = params.get("hub.verify_token")
    challenge = params.get("hub.challenge")

    verify_token = os.getenv("VERIFY_TOKEN", "myverifytoken")
    if mode == "subscribe" and token == verify_token:
        return HTMLResponse(content=challenge, status_code=200)
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@app.post("/webhook")
async def webhook_receive(request: Request):
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"status": "ok"})

    try:
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})

                for message in value.get("messages", []):
                    phone = message.get("from", "")
                    msg_id = message.get("id", "")
                    ts_raw = message.get("timestamp", "")
                    msg_type = message.get("type", "text")

                    if msg_type == "text":
                        content = message.get("text", {}).get("body", "")
                    elif msg_type == "image":
                        content = "[Image received]"
                    elif msg_type == "audio":
                        content = "[Audio received]"
                    elif msg_type == "video":
                        content = "[Video received]"
                    elif msg_type == "document":
                        content = "[Document received]"
                    elif msg_type == "location":
                        loc = message.get("location", {})
                        content = f"[Location: {loc.get('latitude')}, {loc.get('longitude')}]"
                    else:
                        content = f"[{msg_type}]"

                    contacts = value.get("contacts", [])
                    name = (
                        contacts[0].get("profile", {}).get("name", phone)
                        if contacts
                        else phone
                    )

                    try:
                        dt = datetime.fromtimestamp(int(ts_raw)).strftime("%Y-%m-%d %H:%M:%S")
                    except Exception:
                        dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                    database.save_inbound_message(phone, name, msg_id, content, dt)

    except Exception as exc:
        print(f"Webhook processing error: {exc}")

    return JSONResponse({"status": "ok"})


# ──────────────────────────── Inbox ────────────────────────────

@app.get("/inbox", response_class=HTMLResponse)
async def inbox_page(request: Request):
    if not is_logged_in(request):
        return RedirectResponse("/login")
    contacts = database.get_inbox_contacts()
    return templates.TemplateResponse(
        "inbox.html",
        {
            "request": request,
            "contacts": contacts,
            "username": request.session.get("username", "Admin"),
        },
    )


@app.get("/inbox/{phone}", response_class=HTMLResponse)
async def conversation_page(request: Request, phone: str):
    if not is_logged_in(request):
        return RedirectResponse("/login")
    contact = database.get_contact(phone)
    messages = database.get_conversation(phone)
    return templates.TemplateResponse(
        "conversation.html",
        {
            "request": request,
            "contact": contact,
            "messages": messages,
            "phone": phone,
            "username": request.session.get("username", "Admin"),
        },
    )


class ReplyRequest(BaseModel):
    phone: str
    message: str


@app.post("/api/reply")
async def send_reply(request: Request, payload: ReplyRequest):
    if not is_logged_in(request):
        raise HTTPException(status_code=401, detail="Not authenticated")

    result = send_whatsapp_text(payload.phone, payload.message)
    if result.get("success"):
        database.save_outbound_message(payload.phone, payload.message)
    return result


# ──────────────────────────── WhatsApp API Helpers ────────────────────────────

def send_whatsapp_template(
    phone: str,
    template_name: str,
    language_code: str = "en_US",
    variables: list = [],
) -> dict:
    cfg = get_whatsapp_config()
    token = cfg["token"]
    phone_number_id = cfg["phone_number_id"]

    if not token or not phone_number_id:
        return {"success": False, "error": "WhatsApp credentials not configured"}

    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    payload: dict = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
        },
    }

    if variables:
        payload["template"]["components"] = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": str(v)} for v in variables],
            }
        ]

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        data = resp.json()
        if resp.status_code == 200:
            msg_id = data.get("messages", [{}])[0].get("id", "")
            return {"success": True, "message_id": msg_id}
        err_msg = data.get("error", {}).get("message", str(data))
        return {"success": False, "error": err_msg}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timed out"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def send_whatsapp_text(phone: str, message: str) -> dict:
    cfg = get_whatsapp_config()
    token = cfg["token"]
    phone_number_id = cfg["phone_number_id"]

    if not token or not phone_number_id:
        return {"success": False, "error": "WhatsApp credentials not configured"}

    url = f"https://graph.facebook.com/v19.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message},
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        data = resp.json()
        if resp.status_code == 200:
            return {"success": True}
        err_msg = data.get("error", {}).get("message", str(data))
        return {"success": False, "error": err_msg}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timed out"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


# ──────────────────────────── Startup ────────────────────────────

@app.on_event("startup")
async def startup_event():
    database.init_db()
    print("WhatsApp Marketing Dashboard started.")
    print(f"Admin username: {ADMIN_USERNAME}")
