# WhatsApp Marketing Dashboard

A lightweight, self-hosted WhatsApp campaign dashboard built with **Python FastAPI** and **TailwindCSS**. Send bulk template messages, receive customer replies, and manage contacts — all without third-party SaaS platforms.

---

## Features

| Feature | Description |
|---|---|
| **Authentication** | Username/password login via environment variables |
| **Template Sender** | Send a single WhatsApp template message with dynamic variables |
| **Bulk Campaign** | Upload Excel → send to thousands of contacts with a real-time progress bar |
| **Campaign History** | Full log of every campaign with per-message success/failure status |
| **Webhook Receiver** | `/webhook` endpoint for Meta verification and inbound message storage |
| **Chat Inbox** | View all customer conversations and reply inline |
| **Settings** | View API configuration and webhook setup instructions |

---

## Tech Stack

- **Backend**: Python 3.11, FastAPI, Uvicorn
- **Frontend**: Jinja2 templates, TailwindCSS (CDN), Vanilla JS
- **Database**: SQLite (local file, zero setup)
- **Hosting**: Render Web Service (free tier supported)
- **API**: WhatsApp Cloud API v19.0 (Meta)

---

## Quick Start (Local)

### 1. Clone & set up environment

```bash
git clone <your-repo-url>
cd <repo-directory>

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in your credentials
```

Required variables:

| Variable | Description |
|---|---|
| `WHATSAPP_TOKEN` | Meta WhatsApp Cloud API access token |
| `PHONE_NUMBER_ID` | WhatsApp Phone Number ID from Meta |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | WhatsApp Business Account ID |
| `VERIFY_TOKEN` | Your chosen webhook verify token |
| `ADMIN_USERNAME` | Dashboard login username |
| `ADMIN_PASSWORD` | Dashboard login password |
| `SECRET_KEY` | Random secret for session cookies |

### 3. Run the app

```bash
uvicorn main:app --host 0.0.0.0 --port 10000 --reload
```

Open `http://localhost:10000` in your browser.

---

## Deployment on Render

### Step 1 – Push to GitHub

```bash
git add .
git commit -m "Add WhatsApp Marketing Dashboard"
git push origin main
```

### Step 2 – Create a Render Web Service

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
   - **Root Directory**: *(leave blank if files are at repo root)*

### Step 3 – Set Environment Variables

In Render dashboard → **Environment**:

```
WHATSAPP_TOKEN          = <your Meta access token>
PHONE_NUMBER_ID         = <your phone number ID>
WHATSAPP_BUSINESS_ACCOUNT_ID = <your WABA ID>
VERIFY_TOKEN            = <any string, e.g. myverifytoken2024>
ADMIN_USERNAME          = admin
ADMIN_PASSWORD          = your_secure_password
SECRET_KEY              = <random 32+ char string>
```

### Step 4 – Add a Persistent Disk (for SQLite)

In Render dashboard → **Disks** → **Add Disk**:
- **Name**: `whatsapp-data`
- **Mount Path**: `/opt/render/project/src`
- **Size**: 1 GB

> Without a disk, the SQLite database resets on every deploy. Render's free tier supports 1 GB persistent disk.

### Step 5 – Deploy

Click **Deploy** and wait for the build to complete. Your app will be live at `https://<service-name>.onrender.com`.

---

## Webhook Setup (Meta WhatsApp Cloud API)

### Step 1 – Configure Webhook in Meta App Dashboard

1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App
2. Navigate to **WhatsApp → Configuration**
3. In the **Webhook** section, click **Edit**
4. Enter:
   - **Callback URL**: `https://<your-render-url>/webhook`
   - **Verify Token**: Same value as your `VERIFY_TOKEN` env var
5. Click **Verify and Save**
6. Under **Webhook Fields**, subscribe to **messages**

### Step 2 – Test Verification

Once saved, Meta will send a GET request to `/webhook` with your verify token. The app will respond with the challenge automatically.

### Step 3 – Test Incoming Messages

Send a WhatsApp message to your business number. It will appear in the **Inbox** section of the dashboard within seconds.

---

## Excel File Format (Bulk Campaigns)

Create an `.xlsx` file with these columns:

| Name | Phone | Var1 | Var2 | … |
|---|---|---|---|---|
| John Doe | 14155552671 | Hello | 10% | … |
| Jane Smith | 447911123456 | Hi there | 25% | … |

- **Name** – Contact display name (required)
- **Phone** – Phone number with country code, no `+` or spaces (required)
- **Var1, Var2, …** – Template variable values in order (`{{1}}`, `{{2}}`, …)

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Redirect to dashboard or login |
| `GET/POST` | `/login` | Authentication |
| `GET` | `/logout` | Clear session |
| `GET` | `/dashboard` | Overview stats |
| `GET` | `/send` | Single template sender UI |
| `POST` | `/api/send-template` | Send a single template (JSON) |
| `GET` | `/bulk` | Bulk campaign UI |
| `POST` | `/api/bulk-upload` | Upload Excel, start campaign |
| `GET` | `/api/bulk-status/{job_id}` | Poll campaign progress |
| `GET` | `/history` | Campaign list |
| `GET` | `/history/{campaign_id}` | Campaign detail |
| `GET/POST` | `/webhook` | Meta webhook (verify + receive) |
| `GET` | `/inbox` | Contacts/conversations list |
| `GET` | `/inbox/{phone}` | Full conversation thread |
| `POST` | `/api/reply` | Send reply message (JSON) |
| `GET` | `/settings` | Configuration reference |

### `POST /api/send-template` payload
```json
{
  "phone": "14155552671",
  "template_name": "hello_world",
  "language_code": "en_US",
  "variables": ["John", "your order #1234"]
}
```

### `POST /api/reply` payload
```json
{
  "phone": "14155552671",
  "message": "Thanks for reaching out! How can we help?"
}
```

---

## Docker (Optional)

```bash
# Build
docker build -t whatsapp-dashboard .

# Run
docker run -p 10000:10000 \
  -e WHATSAPP_TOKEN=xxx \
  -e PHONE_NUMBER_ID=xxx \
  -e VERIFY_TOKEN=xxx \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=secret \
  -e SECRET_KEY=random32chars \
  -v $(pwd)/data:/app/data \
  whatsapp-dashboard
```

---

## Security Notes

- All dashboard routes require session-based login
- Credentials are stored exclusively in environment variables (never in code)
- Use a strong, random `SECRET_KEY` and `ADMIN_PASSWORD` in production
- Use a **System User token** with `whatsapp_business_messaging` permission for production (not a temporary token)
- Consider adding HTTPS-only enforcement if deploying outside Render

---

## Project Structure

```
.
├── main.py              # FastAPI application (routes, API helpers)
├── database.py          # SQLite database layer
├── templates/
│   ├── base.html        # Sidebar layout
│   ├── login.html       # Login page
│   ├── dashboard.html   # Overview/stats
│   ├── send.html        # Single template sender
│   ├── bulk.html        # Bulk campaign + progress bar
│   ├── history.html     # Campaign list
│   ├── campaign_detail.html  # Per-campaign message log
│   ├── inbox.html       # Contacts list
│   └── conversation.html # Full chat thread + reply
├── requirements.txt     # Python dependencies
├── render.yaml          # Render deployment config
├── Dockerfile           # Docker build config
└── .env.example         # Environment variable template
```
