# Share CreatorFind with friends

## Best option: ngrok Python library (pip only — no app download)

Works for **remote friends** anywhere in the world. Only requires `pip install ngrok`.

### One-time setup (~2 minutes)

1. **Create a free ngrok account** (website only, no app):  
   https://dashboard.ngrok.com/signup

2. **Copy your authtoken**:  
   https://dashboard.ngrok.com/get-started/your-authtoken

3. **Install the Python library** (allowed on your machine):
   ```powershell
   cd creator-search-platform\backend
   pip install ngrok
   ```

### Every time you want to share

```powershell
cd creator-search-platform
$env:NGROK_AUTHTOKEN="paste_your_token_here"
.\scripts\share-public.ps1
```

Or manually:
```powershell
cd backend
$env:NGROK_AUTHTOKEN="paste_your_token_here"
python scripts/share_public.py
```

The script will:
- Start backend + frontend (if not already running)
- Open two public `https://....ngrok-free.app` URLs
- Print the **web link** to send your friend

**Send your friend:**
```
https://xxxx.ngrok-free.app
Login: demo@brand.com / demo1234
```

They may need to click **"Visit Site"** once on ngrok's free interstitial page.

**Keep the script running** while they try the demo. Press `Ctrl+C` to stop.

---

## Same WiFi (no ngrok account needed)

If your friend is **in the same room**:

```powershell
.\scripts\share-same-wifi.ps1
```

Send them the `http://192.168.x.x:3000` link.

---

## Cannot use ngrok at all?

- **Teams / Zoom screen share** — demo live while they watch
- **Push to GitHub** → deploy from personal phone/laptop → see [DEPLOY.md](./DEPLOY.md)

---

## Demo accounts

| Email | Password | Role |
|-------|----------|------|
| demo@brand.com | demo1234 | Campaign owner |
| manager@brand.com | demo1234 | Approver |
| member@brand.com | demo1234 | Team feedback |
