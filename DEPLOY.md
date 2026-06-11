# Deploy from a personal device (work laptop cannot install tools)

Use this after pushing the project to GitHub from your work machine.

## 1. Push to GitHub (work machine)

```powershell
cd creator-search-platform
git init
git add .
git commit -m "CreatorFind MVP"
git remote add origin https://github.com/YOUR_USERNAME/creator-search-platform.git
git push -u origin main
```

Do **not** commit `backend/creator_search.db` (already in `.gitignore`).

---

## 2. Deploy backend on Render (personal phone/laptop)

1. Go to [render.com](https://render.com) → New → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt && python scripts/seed_db.py`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment:** Python 3.11+
4. Deploy → copy URL, e.g. `https://creatorfind-api.onrender.com`

Update CORS on Render — add env var or ensure `allow_origin_regex` includes your Vercel domain (already supports trycloudflare; add Vercel URL to `main.py` if needed).

---

## 3. Deploy frontend on Vercel (personal device)

1. Go to [vercel.com](https://vercel.com) → Import Git repo
2. **Root directory:** `frontend`
3. **Environment variable:**
   - `NEXT_PUBLIC_API_URL` = `https://creatorfind-api.onrender.com` (your Render URL)
4. Deploy → copy URL, e.g. `https://creatorfind.vercel.app`

---

## 4. Fix CORS for production (one-time code change)

In `backend/main.py`, add your Vercel URL to CORS:

```python
allow_origins=[
    "http://localhost:3000",
    "https://creatorfind.vercel.app",  # your Vercel URL
],
```

Commit and push — Render redeploys automatically.

---

## 5. Share the Vercel link

Send your friend: `https://creatorfind.vercel.app`  
Login: `demo@brand.com` / `demo1234`

Render free tier sleeps after inactivity — first load may take ~30 seconds.
