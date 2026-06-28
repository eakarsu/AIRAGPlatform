"""AI Multi-source RAG — Ingest documents, APIs, databases, live web; fuse results"""
import os
import json
import httpx
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from config import settings

# TODO: configure credentials — set OPENROUTER_API_KEY env var
MODEL = settings.OPENROUTER_MODEL or "anthropic/claude-haiku-4.5"
BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")

router = APIRouter(prefix="", tags=["ai", "multi-source-rag"])

# Try to wire existing auth dependency if available
try:
    from ..routers.auth import get_current_user  # type: ignore
except Exception:  # pragma: no cover
    def get_current_user():
        return {"id": None, "anonymous": True}


class FeatureRequest(BaseModel):
    context: Optional[Any] = None
    data: Optional[Any] = None
    sources: Optional[list[str]] = None


def parse_json_loose(text: str):
    if not text:
        return None
    try:
        return json.loads(text)
    except Exception:
        pass
    stripped = text.strip().lstrip("`")
    if stripped.lower().startswith("json"):
        stripped = stripped[4:]
    stripped = stripped.strip("`\n ")
    try:
        return json.loads(stripped)
    except Exception:
        pass
    a = min([i for i in [stripped.find("{"), stripped.find("[")] if i >= 0] or [-1])
    b = max(stripped.rfind("}"), stripped.rfind("]"))
    if a >= 0 and b > a:
        try:
            return json.loads(stripped[a:b + 1])
        except Exception:
            pass
    return None


async def call_llm(system_prompt: str, user_prompt: str):
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        raise HTTPException(status_code=503, detail="OPENROUTER_API_KEY not configured")
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AIRAGPlatform",
    }
    body = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 2000,
        "temperature": 0.4,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{BASE_URL}/chat/completions", json=body, headers=headers)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"LLM error {resp.status_code}")
    data = resp.json()
    return data.get("choices", [{}])[0].get("message", {}).get("content", "")


@router.post("/")
async def run_feature(req: FeatureRequest, user=Depends(get_current_user)):
    context = req.context or req.data or req.dict()
    system_prompt = (
        f"You are an expert AI assistant for AIRAGPlatform. Focus area: Multi-source RAG. Ingest documents, APIs, databases, live web; fuse results. "
        f"Respond ONLY with valid JSON (no markdown fences)."
    )
    user_prompt = (
        f"Task: Multi-source RAG.\nIngest documents, APIs, databases, live web; fuse results\n\n"
        f"Input payload (JSON):\n{json.dumps(context, default=str, indent=2)}\n\n"
        f'Return JSON with shape: { "summary": "...", "findings": ["..."], "recommendations": ["..."], "score": 0, "confidence": 0 }'
    )
    content = await call_llm(system_prompt, user_prompt)
    parsed = parse_json_loose(content) or {"raw": content}
    return {"feature": "multi-source-rag", "model": MODEL, "result": parsed}


@router.get("/health")
async def health():
    return {"ok": True, "feature": "multi-source-rag"}
