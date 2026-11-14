# ChurnSense – Run locally and deploy

## A. Run on your laptop (VS Code, Windows)

Open **two terminals** (Terminal → New Terminal) in the project folder.

**Terminal 1 – backend**
```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
cd backend
uvicorn main:app --reload --port 8000
```
Check: open http://127.0.0.1:8000/ — you should see `"status":"running","customers":3000`.
Interactive API docs: http://127.0.0.1:8000/docs

**Terminal 2 – website**
```
cd websites
npm install
npm run dev
```
Open http://localhost:3000. (Both must stay running.)

## B. Put the project on GitHub
1. Create a free account and a new **empty** repository (e.g. `churnsense`) on github.com.
2. In VS Code terminal, in the project root:
```
git init
git add .
git commit -m "ChurnSense"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/churnsense.git
git push -u origin main
```
`.gitignore` already keeps `.venv`, `node_modules`, `.next`, `__pycache__` and `.env` files out.
Make sure `churn_model.pkl` and `2_b2b_saas_churn_ltv.csv` ARE uploaded (about 6.5 MB, fine for GitHub).

## C. Deploy the backend on Render (do this first)
1. Sign in at render.com with GitHub → **New → Web Service** → pick your repo.
2. Settings:
   - Root Directory: *(leave empty)*
   - Runtime: **Python 3**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Instance type: **Free**
   (Or choose **New → Blueprint**: Render reads `render.yaml` for you.)
3. Environment variables: `PYTHON_VERSION` = `3.13.5` (use the Python version you run locally if different, ≥ 3.11).
4. Create the service and wait for "Live". Your API address looks like `https://churnsense-api.onrender.com`.
5. Test: open `https://churnsense-api.onrender.com/api/stats` — you should see JSON with 3000 customers.

## D. Deploy the website on Vercel
1. Sign in at vercel.com with GitHub → **Add New → Project** → import the same repo.
2. **Root Directory: `websites`** (important). Framework: Next.js (auto-detected).
3. Environment Variables → add
   `NEXT_PUBLIC_API_URL` = `https://churnsense-api.onrender.com` (your Render address, no trailing slash).
4. Deploy. You get a link like `https://churnsense.vercel.app` — that is your public link.

## E. Connect them (CORS)
The backend only accepts calls from addresses you allow.
1. Render → your service → **Environment** → add
   `ALLOWED_ORIGINS` = `https://churnsense.vercel.app` (your exact Vercel address, no trailing slash).
2. Save (Render restarts). Reload the website: the top-right badge should say **Model API connected**.

If you change `NEXT_PUBLIC_API_URL` later, redeploy on Vercel (it is baked in at build time).

## F. Before the exhibition
- Render's free plan **sleeps after ~15 minutes idle**; the first load can take up to a minute (the site shows a "server is waking up" message and retries by itself). Open the site 5 minutes before you present, or ping `/health` every 10 minutes with a free service such as UptimeRobot.
- Have a backup: the local version (section A) works without internet.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Badge says "API offline" locally | Backend terminal not running, or not on port 8000 |
| Browser console says CORS error on the live site | `ALLOWED_ORIGINS` on Render doesn't exactly match your Vercel address |
| Render build fails on pandas/numpy | Set `PYTHON_VERSION` to 3.13.x (needs ≥ 3.11) |
| Model won't load ("incompatible"/pickle error) | Keep `scikit-learn==1.9.1` – the model was saved with it |
