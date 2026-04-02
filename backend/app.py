from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import requests
from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timezone
load_dotenv()

app = Flask(__name__)

ALLOWED_ORIGINS = [
    "chrome-extension://kmmfimalgpemdflbkefkeefaphdmhpoi",
    "https://leetcode.com",
    "http://localhost:5000",
]
CORS(app, origins=ALLOWED_ORIGINS)

def get_uid_from_request():
    data = request.get_json(silent=True)
    if data and data.get("uid"):
        return data["uid"]
    return request.args.get("uid", get_remote_address())

# Rate Limiting
limiter = Limiter(
    key_func=get_uid_from_request,
    app=app,
    default_limits=["60 per minute"],
    storage_uri="memory://",
)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

history_collection = None

MONGODB_URI = os.environ.get("MONGODB_URI")
if MONGODB_URI:
    mongo_client = MongoClient(MONGODB_URI)
    db = mongo_client["leetstar"]
    history_collection = db["summaries"]


SYSTEM_PROMPT = """You are a helpful coding tutor assistant for LeetCode problems. 
You respond ONLY in valid JSON with no markdown or extra text."""

USER_PROMPT_TEMPLATE = """Analyze this LeetCode problem and respond with ONLY a JSON object in this exact format:
{{
  "summary": "1-2 simple sentences explaining what the problem is asking in plain English",
  "data_structure": "The primary data structure or algorithm to use (e.g. Hash Map, Two Pointers, BFS, Dynamic Programming)",
  "data_structure_reason": "One sentence explaining why this approach works",
  "practice_first": {{
    "title": "Name of an easier foundational LeetCode problem",
    "slug": "slug-of-the-easier-problem",
    "number": 123,
    "reason": "One sentence on why this easier problem helps build the foundation"
  }}
}}

IMPORTANT: The practice_first problem must be completely different from the current problem "{problem_slug}". Do NOT suggest the same problem. Suggest a genuinely easier and different foundational problem.

Problem:
{problem_text}"""


def verify_slug(slug):
    try:
        response = requests.get(
            f"https://alfa-leetcode-api.onrender.com/select?titleSlug={slug}",
            timeout=5
        )
        data = response.json()
        if data.get("titleSlug"):
            return data["titleSlug"]
    except:
        pass
    return slug # Fall back to GPT's slug


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/summarize", methods=["POST"])
@limiter.limit("10 per minute; 100 per day")  # per-minute + daily caps for expensive API
def summarize():
    data = request.get_json()
    if not data or "problem_text" not in data:
        return jsonify({"error": "Missing problem_text in request body"}), 400

    problem_text = data["problem_text"][:3000]  # Limit to avoid token overflow
    problem_slug = data.get("problem_slug", "")
    uid = data.get("uid", "anonymous")

    # Check MongoDB cache first to avoid redundant API calls
    if history_collection is not None:
        existing = history_collection.find_one({"problem_slug": problem_slug})
        if existing:
            existing.pop("_id", None)  # removes _id (MongoDB ObjectId can't be JSON'd)
            if "timestamp" in existing:
                existing["timestamp"] = existing["timestamp"].isoformat()  # converts datetime to string
            # Save to this user's history even if cached
            if uid != existing.get("uid"):
                history_collection.insert_one({
                    "uid": uid,
                    "problem_slug": problem_slug,
                    "summary": existing.get("summary"),
                    "data_structure": existing.get("data_structure"),
                    "data_structure_reason": existing.get("data_structure_reason"),
                    "practice_first": existing.get("practice_first"),
                    "timestamp": datetime.now(timezone.utc)
                })
            return jsonify(existing)

    if not OPENAI_API_KEY:
        return jsonify({"error": "OpenAI API key not configured on server"}), 500

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {OPENAI_API_KEY}"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": USER_PROMPT_TEMPLATE.format(problem_text=problem_text, problem_slug=problem_slug)}
                ],
                "max_tokens": 500,
                "temperature": 0.5,
                "response_format": {"type": "json_object"}
            },
            timeout=20
        )

        if not response.ok:
            error_data = response.json()
            return jsonify({"error": error_data.get("error", {}).get("message", "OpenAI request failed")}), 502

        result = response.json()
        content = result["choices"][0]["message"]["content"]

        import json
        parsed = json.loads(content)

        # Validate and correct practice problem slug before returning to client
        if parsed.get("practice_first") and parsed["practice_first"].get("slug"):
            parsed["practice_first"]["slug"] = verify_slug(parsed["practice_first"]["slug"])

        # Store summary in database(MongoDB)
        if history_collection is not None:
            history_collection.insert_one({
                "uid": uid,
                "problem_slug": problem_slug,
                "summary": parsed["summary"],
                "data_structure": parsed["data_structure"],
                "data_structure_reason": parsed["data_structure_reason"],
                "practice_first": parsed["practice_first"],
                "timestamp": datetime.now(timezone.utc)
            })


        return jsonify(parsed)

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request to OpenAI timed out. Please try again."}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Get History: Returns last 20 summaries for a user ─────────────────────
@app.route("/history", methods=["GET"])
def get_history():
    uid = request.args.get("uid")
    if not uid:
        return jsonify({"error": "Missing uid"}), 400
    if history_collection is None:
        return jsonify({"error": "Database not configured"}), 500
        
    results = list(history_collection.find(
        {"uid": uid},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20)) 

    # Convert datetime objects to strings for JSON serialization to avoid TypeError
    for r in results:
        r["timestamp"] = r["timestamp"].isoformat() if "timestamp" in r else None
    
    return jsonify(results)

# ─── Delete History: Remove one summary by slug, or all for a user ─────────
@app.route("/history", methods=["DELETE"])
def delete_history():
    uid = request.args.get("uid")
    slug = request.args.get("slug")
    if not uid:
        return jsonify({"error": "Missing uid"}), 400
    if history_collection is None:
        return jsonify({"error": "Database not configured"}), 500

    if slug:
        history_collection.delete_one({"uid": uid, "problem_slug": slug})
    else:
        history_collection.delete_many({"uid": uid})

    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
