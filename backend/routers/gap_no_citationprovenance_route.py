# === Batch 07 Gaps & Frontend Mounts ===
import os
import json
import urllib.request
import urllib.error
from fastapi import APIRouter, Request
from config import settings

router = APIRouter(prefix="/api/gap-no-citationprovenance-route", tags=["gap-no-citationprovenance-route"])

FEATURE_SLUG = "no-citationprovenance-route"
FEATURE_TITLE = "No citation/provenance route"
PROJECT = "AIRAGPlatform"


def _ensure_table(db):
    if db is None:
        return
    try:
        db.execute(
            "CREATE TABLE IF NOT EXISTS gap_features ("
            "id SERIAL PRIMARY KEY, slug TEXT, title TEXT, project TEXT, "
            "input JSONB, output JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
        )
        db.commit()
    except Exception:
        pass


def _log(db, input_val, output_val):
    if db is None:
        return
    try:
        db.execute(
            "INSERT INTO gap_features(slug,title,project,input,output) VALUES(:s,:t,:p,:i,:o)",
            {"s": FEATURE_SLUG, "t": FEATURE_TITLE, "p": PROJECT,
             "i": json.dumps(input_val), "o": json.dumps(output_val)},
        )
        db.commit()
    except Exception:
        pass


def _call_llm(prompt: str):
    api_key = settings.OPENROUTER_API_KEY or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"note": "OPENROUTER_API_KEY not set; returning mock", "mock": True, "prompt": prompt[:400]}
    body = json.dumps({
        "model": settings.OPENROUTER_MODEL or "openai/gpt-4o-mini",
        "messages": [
            {"role": "system", "content": f"You implement the {PROJECT} feature: {FEATURE_TITLE}. Respond with strict JSON only. Do not use markdown fences."},
            {"role": "user", "content": prompt},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        msg = e.read().decode("utf-8", "ignore")[:200]
        raise RuntimeError(f"LLM {e.code}: {msg}")
    choices = data.get("choices") or []
    content = choices[0]["message"]["content"] if choices and "message" in choices[0] else data
    return {"model": data.get("model"), "content": content}


@router.get("/")
def get_info():
    return {"ok": True, "slug": FEATURE_SLUG, "title": FEATURE_TITLE, "project": PROJECT}


@router.post("/")
async def run(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    user_input = body.get("input", "") if isinstance(body, dict) else ""
    prompt = f"Feature: {FEATURE_TITLE}\nProject: {PROJECT}\nUser input:\n{user_input if isinstance(user_input, str) else json.dumps(user_input)}"
    try:
        output = _call_llm(prompt)
        return {"ok": True, "slug": FEATURE_SLUG, "title": FEATURE_TITLE, "output": output}
    except Exception as e:
        return {"ok": False, "error": str(e)}
