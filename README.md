# LeetStar v2.0

A Chrome extension that summarizes LeetCode problems using GPT, now with a secure Flask backend.

---

## Features

- **★ Glowy Star Button** — fixed in the top-right corner of any LeetCode problem page
- **Summary Card** — plain English explanation of what the problem is asking
- **Data Structure Card** — suggests the best algorithm/DS to use with a reason why
- **Practice First Card** — recommends an easier related LeetCode problem to build up to it

---

## Setup

### 1. Backend (Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set your OpenAI API key as an environment variable (never hardcode it):

```bash
# Mac/Linux
export OPENAI_API_KEY=sk-...

# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."
```

Run the server:

```bash
python app.py
```

The server runs on `http://localhost:5000`.

---

### 2. Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked** and select the `/extension` folder
4. Navigate to any `leetcode.com/problems/...` page
5. Click the ★ star button in the top-right corner

> ⚠️ The Flask server must be running locally for the extension to work. When you deploy the backend, update `BACKEND_URL` in `content.js`.

---

## Deploying the Backend

You can deploy the Flask app to **Railway**, **Render**, or **Fly.io** for free:

### Railway (recommended)
1. Push `backend/` to a GitHub repo
2. Create a new project on [railway.app](https://railway.app)
3. Add `OPENAI_API_KEY` as an environment variable in Railway's dashboard
4. Railway auto-detects Flask and deploys it

Once deployed, update `content.js`:
```js
const BACKEND_URL = 'https://your-app.railway.app/summarize';
```

And update `manifest.json` host_permissions to include your deployed URL.

---

## Project Structure

```
leetstar/
├── backend/
│   ├── app.py              # Flask API
│   └── requirements.txt
└── extension/
    ├── content.js          # Chrome extension logic
    ├── styles.css          # Star button + popup styles
    └── manifest.json
```

---

## Security Notes

- API key lives only in the backend environment variable — never in extension code
- CORS is restricted to `chrome-extension://` origins only
- Problem text is capped at 3000 characters before sending to OpenAI
