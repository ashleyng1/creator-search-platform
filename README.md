# CreatorFind — Influencer Discovery Platform

Full-stack local MVP for brand marketing teams: natural-language creator search, team collaboration, approver workflow, customizable outreach templates, and performance analytics.

## Quick start

### 1. Backend (Terminal 1)

```powershell
cd backend
pip install -r requirements.txt
python scripts/seed_db.py
python -m uvicorn main:app --reload --port 8000
```

### 2. Frontend (Terminal 2)

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

### Auth environment (optional)

Copy `backend/.env.example` to `backend/.env` and fill in keys as needed.

| Feature | Dev without keys | With keys |
|---------|------------------|-----------|
| Email OTP register | Code printed in backend terminal (`[DEV OTP]`) | Resend sends real email |
| Google / Apple / Instagram sign-in | Buttons return 503 until configured | OAuth redirects work |

**Provider setup (one-time):**

1. **Resend** — [resend.com](https://resend.com) API key + verified sender domain
2. **Google** — [Google Cloud Console](https://console.cloud.google.com) → OAuth 2.0 Web client → redirect `http://localhost:8000/api/auth/google/callback`
3. **Apple** — [Apple Developer](https://developer.apple.com) → Sign in with Apple service ID + `.p8` key
4. **Instagram button** — [Meta for Developers](https://developers.facebook.com) → Facebook Login app → redirect `http://localhost:8000/api/auth/meta/callback`

Registration flow: email → OTP → password + profile. Passwords are bcrypt-hashed in the database (never stored in plaintext).

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| demo@brand.com | demo1234 | Campaign owner (marketing manager) |
| manager@brand.com | demo1234 | Approver on demo campaign |
| member@brand.com | demo1234 | Team member (can add feedback) |

## Demo flow

1. Sign in as `demo@brand.com`
2. Go to **Search** — run the pre-filled gloss lipstick / GCC brief
3. Add creators to shortlist → opens campaign
4. Sign in as `member@brand.com` in another browser — add feedback on creators
5. Sign in as `manager@brand.com` — **Approve for outreach**
6. Back as demo user — pick an email template, customize, save outreach
7. Check **Analytics** tab — log post metrics, compare normalized ER
8. Visit **Insights** for weekly category benchmarks

## Data source

[Instagram Global Top 1000 CSV](https://github.com/niteshkuwarbi/instagram-data-analysis/blob/main/instagram_global_top_1000.csv) — 1,000 creators with categories, followers, audience country, engagement.

## Features

- NL brief → structured filters (rule-based mock parser)
- K-Means clustering + ranked recommendations
- Campaign shortlist with team feedback
- Manager/approver gate before outreach
- System + custom email templates with variable substitution
- Post performance comparison (follower-normalized ER)
- Weekly insights dashboard

## Share with friends

See **[SHARE.md](./SHARE.md)** for full instructions.

**Remote friend (pip only, no app install):**
```powershell
$env:NGROK_AUTHTOKEN="your_token_from_dashboard.ngrok.com"
.\scripts\share-public.ps1
```

**Same WiFi:** `.\scripts\share-same-wifi.ps1`

Demo login: `demo@brand.com` / `demo1234`

## Project structure

```
creator-search-platform/
├── backend/          FastAPI + SQLite + scikit-learn
├── frontend/         Next.js 14 + Tailwind
└── data/raw/         Downloaded CSV (gitignored)
```
