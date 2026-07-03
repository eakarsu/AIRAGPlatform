import json
from datetime import datetime, timezone

from models.database_models import ActivityLog


def strip_json_fence(text):
    if not isinstance(text, str):
        return text
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.removeprefix("```json").removeprefix("```").strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].strip()
    return cleaned


def parse_ai_content(content):
    if isinstance(content, dict):
        return content
    if not isinstance(content, str):
        return {"content": content}

    cleaned = strip_json_fence(content)
    try:
        return json.loads(cleaned)
    except Exception:
        first_object = cleaned.find("{")
        last_object = cleaned.rfind("}")
        first_array = cleaned.find("[")
        last_array = cleaned.rfind("]")
        starts = [index for index in (first_object, first_array) if index >= 0]
        start = min(starts) if starts else -1
        end = max(last_object, last_array)
        if start >= 0 and end > start:
            try:
                return json.loads(cleaned[start:end + 1])
            except Exception:
                pass
    return {"summary": cleaned, "raw_response": content}


def normalized_ai_output(model, content):
    parsed = parse_ai_content(content)
    return {"model": model, **parsed}


def record_ai_activity(db, slug, title, user_input, ok=True):
    if db is None:
        return
    try:
        preview = user_input if isinstance(user_input, str) else json.dumps(user_input, default=str)
        db.add(ActivityLog(
            user_id=1,
            user_name="System",
            action="ai_feature_run" if ok else "ai_feature_failed",
            entity_type="ai_feature",
            entity_name=title,
            details=json.dumps({
                "slug": slug,
                "input_preview": preview[:700],
                "ok": ok,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }),
        ))
        db.commit()
    except Exception:
        db.rollback()
