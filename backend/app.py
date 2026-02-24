from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import requests
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=False)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

SYSTEM_PROMPT = """You are a helpful coding tutor assistant for LeetCode problems. 
You respond ONLY in valid JSON with no markdown or extra text."""

USER_PROMPT_TEMPLATE = """Analyze this LeetCode problem and respond with ONLY a JSON object in this exact format:
{{
  "summary": "1-2 simple sentences explaining what the problem is asking in plain English",
  "data_structure": "The primary data structure or algorithm to use (e.g. Hash Map, Two Pointers, BFS, Dynamic Programming)",
  "data_structure_reason": "One sentence explaining why this approach works",
  "practice_first": {{
    "title": "Name of an EASIER related LeetCode problem to practice first (must be a DIFFERENT problem, not the current one)",
    "slug": "slug-of-the-easier-problem",
    "number": 123,
    "reason": "One sentence on why this easier problem helps build the foundation"
  }}
}}

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
def summarize():
    data = request.get_json()
    if not data or "problem_text" not in data:
        return jsonify({"error": "Missing problem_text in request body"}), 400

    problem_text = data["problem_text"][:3000]  # Limit to avoid token overflow

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
                    {"role": "user", "content": USER_PROMPT_TEMPLATE.format(problem_text=problem_text)}
                ],
                "max_tokens": 300,
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

        return jsonify(parsed)

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request to OpenAI timed out. Please try again."}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
