import json
import os
import urllib.error
import urllib.request
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from config import settings
from database import get_db
from services.ai_output import normalized_ai_output, record_ai_activity

router = APIRouter(tags=["custom-ai-features"])

FEATURES = {
    "cf-multisource-rag": {
        "title": "Multi-source RAG",
        "focus": "Fuse documents, APIs, databases, and web context into one grounded answer workflow.",
    },
    "cf-conversational-document-analyst": {
        "title": "Conversational document analyst",
        "focus": "Answer business questions from document context with clear recommendations and caveats.",
    },
    "cf-comparison-contradiction-detection": {
        "title": "Comparison & contradiction detection",
        "focus": "Compare sources and identify conflicting, missing, or weakly supported claims.",
    },
    "cf-knowledge-graph-extraction": {
        "title": "Knowledge graph extraction",
        "focus": "Extract entities, relationships, responsibilities, risks, dates, and dependencies.",
    },
    "cf-citation-source-tracking": {
        "title": "Citation & source tracking",
        "focus": "Track answer provenance, source evidence, and citation quality.",
    },
    "cf-realtime-document-monitoring": {
        "title": "Real-time document monitoring",
        "focus": "Monitor changing documents and recommend alerts, owners, and follow-up actions.",
    },
}


def _mock_result(feature, user_input):
    return {
        "summary": f"{feature['title']} analysis is ready in mock mode because OPENROUTER_API_KEY is not configured.",
        "findings": [
            "The workflow is reachable from the AI Hub and sidebar.",
            "The request was accepted and normalized for AI processing.",
            "Configure OpenRouter to receive live model output.",
        ],
        "recommendations": [
            "Add a valid OPENROUTER_API_KEY in .env.",
            "Restart ./start.sh after changing model credentials.",
            "Use the sample buttons to populate realistic input before running.",
        ],
        "input_preview": str(user_input)[:500],
        "confidence": 0.72,
        "mock": True,
    }


def _call_openrouter(feature, user_input):
    api_key = settings.OPENROUTER_API_KEY
    if not api_key or api_key == "your-openrouter-api-key-here":
        return _mock_result(feature, user_input)

    prompt = (
        f"Feature: {feature['title']}\n"
        f"Focus: {feature['focus']}\n"
        f"User input:\n{user_input if isinstance(user_input, str) else json.dumps(user_input, default=str)}\n\n"
        "Return strict JSON with keys: summary, findings, recommendations, risks, next_actions, confidence."
    )
    body = json.dumps({
        "model": settings.OPENROUTER_MODEL or "anthropic/claude-haiku-4.5",
        "messages": [
            {"role": "system", "content": "You are an expert RAG platform advisor. Return only valid JSON, no markdown fences."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 1800,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
            "HTTP-Referer": "http://localhost:3056",
            "X-Title": "AIRAGPlatform",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", "ignore")[:300]
        return {"summary": "OpenRouter request failed", "error": f"LLM {exc.code}: {detail}", "mock": False}

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    parsed = normalized_ai_output(data.get("model") or settings.OPENROUTER_MODEL or "anthropic/claude-haiku-4.5", content)
    return {"mock": False, **parsed}


def _register_feature(slug, feature):
    async def run(request: Request, db: Session = Depends(get_db)):
        try:
            body = await request.json()
        except Exception:
            body = {}
        user_input = body.get("input", body) if isinstance(body, dict) else body
        result = _call_openrouter(feature, user_input)
        record_ai_activity(db, slug, feature["title"], user_input, ok=not bool(result.get("error")))
        return {
            "ok": not bool(result.get("error")),
            "slug": slug,
            "title": feature["title"],
            "result": result,
        }

    async def info():
        return {"ok": True, "slug": slug, "title": feature["title"], "focus": feature["focus"]}

    router.add_api_route(f"/api/{slug}", run, methods=["POST"], name=f"run_{slug.replace('-', '_')}")
    router.add_api_route(f"/api/{slug}", info, methods=["GET"], name=f"info_{slug.replace('-', '_')}")


for _slug, _feature in FEATURES.items():
    _register_feature(_slug, _feature)
