import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models.database_models import (
    ActivityLog,
    AISummary,
    ChatMessage,
    ChatSession,
    Document,
    Favorite,
    KnowledgeChunk,
    PromptTemplate,
    Tag,
    User,
    Workspace,
)
from routers.auth import get_current_user
from routers.platform_ops import MODULES, run_module_action
from services import llm_service

router = APIRouter(prefix="/api/system-chat", tags=["system-chat"])


class SystemChatRequest(BaseModel):
    message: str
    context: dict | None = None


def utcnow():
    return datetime.now(timezone.utc)


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip())


def lowered(text: str) -> str:
    return clean(text).lower()


def serialize(value):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize(item) for key, item in value.items()}
    return value


def record_action(db: Session, user: User, action: str, details: str):
    try:
        db.add(ActivityLog(
            user_id=user.id,
            user_name=user.name,
            action=action,
            entity_type="system_chat",
            entity_name="System Chat",
            details=details[:500],
        ))
        db.commit()
    except Exception:
        db.rollback()


def doc_payload(doc: Document, db: Session):
    chunk_count = db.query(func.count(KnowledgeChunk.id)).filter(KnowledgeChunk.document_id == doc.id).scalar()
    return {
        "id": doc.id,
        "title": doc.title,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "status": doc.status,
        "file_size": doc.file_size,
        "chunk_count": chunk_count,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


def find_document(db: Session, text: str):
    match = re.search(r"\b(?:document|doc)\s*(?:id)?\s*#?\s*(\d+)\b", text, re.I)
    if match:
        doc = db.query(Document).filter(Document.id == int(match.group(1))).first()
        if doc:
            return doc

    quoted = re.findall(r'"([^"]+)"|\'([^\']+)\'', text)
    terms = [a or b for a, b in quoted if a or b]
    if not terms:
        after = re.search(r"(?:document|doc|file)\s+(?:called|named|titled)?\s*([a-zA-Z0-9 _.-]{3,})", text, re.I)
        if after:
            terms.append(after.group(1).strip())

    for term in terms:
        doc = db.query(Document).filter(
            or_(Document.title.ilike(f"%{term}%"), Document.filename.ilike(f"%{term}%"))
        ).first()
        if doc:
            return doc
    return None


def list_documents(db: Session, limit: int = 10):
    docs = db.query(Document).order_by(Document.created_at.desc()).limit(limit).all()
    return [doc_payload(doc, db) for doc in docs]


def keyword_search(db: Session, query: str, limit: int = 5):
    words = [word for word in re.findall(r"[a-zA-Z0-9]{3,}", query) if word not in {
        "search", "find", "look", "for", "documents", "document", "knowledge", "show", "about"
    }]
    if not words:
        words = query.split()[:5]
    conditions = [KnowledgeChunk.chunk_text.ilike(f"%{word}%") for word in words[:6]]
    chunks = db.query(KnowledgeChunk).join(Document, Document.id == KnowledgeChunk.document_id).filter(or_(*conditions)).limit(limit).all()
    results = []
    for chunk in chunks:
        doc = db.query(Document).filter(Document.id == chunk.document_id).first()
        results.append({
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "document_title": doc.title if doc else "Unknown",
            "excerpt": chunk.chunk_text[:420],
            "score": 0.5,
        })
    return results


def platform_module_from_text(text: str):
    normalized = lowered(text)
    aliases = {
        "connector": "connectors",
        "sync": "connectors",
        "import": "connectors",
        "source": "connectors",
        "sharepoint": "connectors",
        "s3": "connectors",
        "drive": "connectors",
        "library": "connectors",
        "provenance": "provenance",
        "citation": "provenance",
        "monitor": "monitoring",
        "job": "monitoring",
        "notification": "notifications",
        "alert": "notifications",
        "query audit": "query-audit",
        "audit": "query-audit",
        "evaluation": "evaluations",
        "eval": "evaluations",
        "prompt": "prompt-versions",
        "cost": "cost-analytics",
        "spend": "cost-analytics",
        "billing": "tenant-billing",
        "tenant": "tenant-billing",
        "sso": "sso-scim",
        "scim": "sso-scim",
    }
    for alias, key in aliases.items():
        if alias in normalized:
            return key
    for key, module in MODULES.items():
        if key in normalized or module["title"].lower() in normalized:
            return key
        for item in module["items"]:
            label = str(item.get("name") or item.get("tenant") or item.get("query_id") or item.get("answer_id") or "").lower()
            if label and label in normalized:
                return key
    return None


def platform_item_from_text(module_key: str, text: str):
    module = MODULES.get(module_key)
    if not module:
        return None
    id_match = re.search(r"\b(?:item|record|id)\s*#?\s*(\d+)\b", text, re.I)
    if id_match:
        item_id = int(id_match.group(1))
        return next((item for item in module["items"] if item["id"] == item_id), None)
    normalized = lowered(text)
    ranked = []
    for item in module["items"]:
        label = str(item.get("name") or item.get("tenant") or item.get("query_id") or item.get("answer_id") or "")
        score = sum(1 for token in re.findall(r"[a-z0-9]+", label.lower()) if token in normalized)
        if label.lower() in normalized:
            score += 10
        if score:
            ranked.append((score, item))
    return sorted(ranked, key=lambda row: row[0], reverse=True)[0][1] if ranked else (module["items"][0] if module["items"] else None)


AI_FEATURES = {
    "multi-source rag": "Fuse document, API, database, and web context into one grounded RAG recommendation.",
    "document analyst": "Analyze document context, questions, obligations, decisions, and next steps.",
    "contradiction": "Find inconsistent claims, source drift, and policy conflicts across documents.",
    "knowledge graph": "Extract entities, relationships, owners, dependencies, and risks.",
    "citation": "Validate citations, provenance, source support, and unsupported claims.",
    "monitoring": "Analyze document monitoring, critical changes, owners, expirations, and alert routing.",
    "ingestion": "Plan ingestion, embedding, chunking, re-indexing, and connector import operations.",
    "source discovery": "Recommend sources and missing documents for a question.",
    "webhook": "Design webhook events, inbound automation, delivery reliability, and security.",
    "export": "Plan secure export, share links, approval workflow, and evidence reports.",
}


def ai_feature_from_text(text: str):
    normalized = lowered(text)
    for key in AI_FEATURES:
        if key in normalized:
            return key
    if "ai hub" in normalized or "run ai" in normalized:
        return "document analyst"
    return None


def call_openrouter(feature: str, message: str):
    if not settings.OPENROUTER_API_KEY:
        return {
            "mock": True,
            "summary": f"OpenRouter key is not configured. Prepared a structured plan for {feature}.",
            "recommendations": [
                {"priority": 1, "action": "Review the selected feature context"},
                {"priority": 2, "action": "Add missing source data"},
                {"priority": 3, "action": "Run the feature again with production context"},
            ],
            "confidence": 0.72,
        }
    body = json.dumps({
        "model": settings.OPENROUTER_MODEL or "anthropic/claude-haiku-4.5",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are the AIRAGPlatform system operator. Return strict JSON only. "
                    "Include summary, findings, recommendations, risks, assumptions, follow_up_questions, and confidence."
                ),
            },
            {
                "role": "user",
                "content": f"Feature: {feature}\nCapability: {AI_FEATURES[feature]}\nUser request: {message}",
            },
        ],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3056",
            "X-Title": "AIRAGPlatform System Chat",
        },
        method="POST",
    )
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
        content = payload["choices"][0]["message"]["content"]
        try:
            output = json.loads(content.strip().removeprefix("```json").removesuffix("```").strip())
        except Exception:
            output = {"summary": content}
        output["model"] = payload.get("model")
        output["response_time"] = round(time.time() - start, 2)
        return output
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, TimeoutError) as exc:
        return {"error": str(exc), "summary": "AI feature call failed.", "recommendations": [{"action": "Check OpenRouter configuration and retry."}]}


def capabilities():
    return [
        {"name": "Documents", "examples": ["List documents", "Show document 3", "Search documents for retention", "Summarize document 2"]},
        {"name": "Tags", "examples": ["List tags", "Create tag Customer Risk", "Confirm delete tag 4"]},
        {"name": "AI Hub", "examples": ["Run citation validation for this answer", "Run contradiction detection on policy versions"]},
        {"name": "Platform Ops", "examples": ["Show connector status", "Run sync check for Legal SharePoint Library", "Show cost analytics"]},
        {"name": "Admin Data", "examples": ["Show analytics", "List users", "List workspaces", "Show activity"]},
        {"name": "Navigation", "examples": ["Open Platform Ops", "Go to AI Hub", "Open documents"]},
    ]


@router.get("/capabilities")
def get_capabilities():
    return {"capabilities": capabilities()}


@router.post("/message")
def system_chat_message(
    payload: SystemChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = clean(payload.message)
    text = lowered(message)
    action = "answer"
    data = None
    route = None
    reply = ""

    if not message:
        return {"reply": "Type a request such as list documents, show connector status, or run citation validation.", "action": "help", "data": {"capabilities": capabilities()}}

    if any(word in text for word in ["what can you do", "help", "examples", "capabilities"]):
        action = "capabilities"
        data = {"capabilities": capabilities()}
        reply = "I can operate documents, search, summaries, tags, AI Hub tools, Platform Ops modules, analytics, users, workspaces, prompts, activity, favorites, and navigation."

    elif "open " in text or text.startswith("go to ") or text.startswith("navigate"):
        routes = {
            "platform ops": "/platform-ops",
            "ai hub": "/ai-hub",
            "documents": "/documents",
            "chat": "/chat",
            "search": "/search",
            "analytics": "/analytics",
            "settings": "/settings",
            "prompts": "/prompts",
            "workspaces": "/workspaces",
            "users": "/users",
            "activity": "/activity",
        }
        route = next((path for label, path in routes.items() if label in text), None)
        action = "navigate"
        reply = f"Opening {route or 'the requested area'}." if route else "I could not identify the destination. Try: open Platform Ops, open AI Hub, or open documents."
        data = {"route": route}

    elif "analytics" in text or "dashboard stats" in text or "counts" in text:
        action = "get_analytics"
        data = {
            "documents": db.query(func.count(Document.id)).scalar(),
            "chunks": db.query(func.count(KnowledgeChunk.id)).scalar(),
            "summaries": db.query(func.count(AISummary.id)).scalar(),
            "chat_sessions": db.query(func.count(ChatSession.id)).scalar(),
            "messages": db.query(func.count(ChatMessage.id)).scalar(),
            "tags": db.query(func.count(Tag.id)).scalar(),
            "users": db.query(func.count(User.id)).scalar(),
            "workspaces": db.query(func.count(Workspace.id)).scalar(),
            "prompts": db.query(func.count(PromptTemplate.id)).scalar(),
            "favorites": db.query(func.count(Favorite.id)).scalar(),
        }
        reply = f"Current platform totals: {data['documents']} documents, {data['chunks']} chunks, {data['summaries']} summaries, {data['chat_sessions']} chat sessions, and {data['users']} users."

    elif "list users" in text or "show users" in text:
        action = "list_users"
        users = db.query(User).order_by(User.created_at.desc()).limit(20).all()
        data = [{"id": user.id, "name": user.name, "email": user.email, "role": user.role, "is_active": user.is_active} for user in users]
        reply = f"Found {len(data)} users."

    elif "workspace" in text and ("list" in text or "show" in text):
        action = "list_workspaces"
        rows = db.query(Workspace).order_by(Workspace.created_at.desc()).limit(20).all()
        data = [{"id": row.id, "name": row.name, "slug": row.slug, "is_active": row.is_active, "created_at": row.created_at} for row in rows]
        reply = f"Found {len(data)} workspaces."

    elif "prompt" in text and ("list" in text or "show" in text):
        action = "list_prompts"
        rows = db.query(PromptTemplate).order_by(PromptTemplate.updated_at.desc()).limit(20).all()
        data = [{"id": row.id, "title": row.title, "category": row.category, "is_active": row.is_active, "updated_at": row.updated_at} for row in rows]
        reply = f"Found {len(data)} prompt templates."

    elif "activity" in text or "audit log" in text:
        action = "list_activity"
        rows = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(20).all()
        data = [{"id": row.id, "user_name": row.user_name, "action": row.action, "entity_name": row.entity_name, "details": row.details, "created_at": row.created_at} for row in rows]
        reply = f"Loaded {len(data)} recent activity records."

    elif "favorite" in text and ("list" in text or "show" in text):
        action = "list_favorites"
        rows = db.query(Favorite).order_by(Favorite.created_at.desc()).limit(20).all()
        data = [{"id": row.id, "entity_type": row.entity_type, "entity_id": row.entity_id, "entity_name": row.entity_name, "note": row.note} for row in rows]
        reply = f"Found {len(data)} favorites."

    elif "tag" in text:
        if "create" in text or "add" in text:
            name_match = re.search(r"(?:create|add)\s+tag\s+(.+)$", message, re.I)
            name = clean(name_match.group(1)) if name_match else "New Tag"
            color_match = re.search(r"(#[0-9a-fA-F]{6})", name)
            color = color_match.group(1) if color_match else "#6366f1"
            name = clean(name.replace(color, ""))
            existing = db.query(Tag).filter(Tag.name.ilike(name)).first()
            if existing:
                data = {"id": existing.id, "name": existing.name, "color": existing.color, "description": existing.description}
                reply = f"Tag already exists: {existing.name}."
                action = "tag_exists"
            else:
                tag = Tag(name=name, color=color, description="Created from System Chat", user_id=current_user.id)
                db.add(tag)
                db.commit()
                db.refresh(tag)
                data = {"id": tag.id, "name": tag.name, "color": tag.color, "description": tag.description}
                reply = f"Created tag {tag.name}."
                action = "create_tag"
        elif "delete" in text:
            if "confirm" not in text:
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete tag <id or name>."
            else:
                match = re.search(r"tag\s+(\d+)", text)
                tag = db.query(Tag).filter(Tag.id == int(match.group(1))).first() if match else None
                if not tag:
                    name = clean(re.sub(r".*delete tag", "", message, flags=re.I))
                    tag = db.query(Tag).filter(Tag.name.ilike(f"%{name}%")).first()
                if tag:
                    data = {"id": tag.id, "name": tag.name}
                    db.delete(tag)
                    db.commit()
                    action = "delete_tag"
                    reply = f"Deleted tag {data['name']}."
                else:
                    action = "not_found"
                    reply = "I could not find that tag."
        else:
            rows = db.query(Tag).order_by(Tag.name).limit(50).all()
            data = [{"id": row.id, "name": row.name, "color": row.color, "description": row.description} for row in rows]
            action = "list_tags"
            reply = f"Found {len(data)} tags."

    elif "summarize" in text and ("document" in text or "doc" in text):
        doc = find_document(db, message)
        if not doc:
            action = "not_found"
            reply = "I could not identify the document to summarize. Try: summarize document 3."
        else:
            try:
                result = llm_service.summarize_document(doc.content or "", doc.title)
                summary_text = result["summary"]
                model_used = result.get("model_used")
            except Exception:
                summary_text = (doc.content or "No content available.")[:1200]
                model_used = "extractive-fallback"
            summary = AISummary(document_id=doc.id, title=f"Summary of {doc.title}", summary=summary_text, model_used=model_used)
            db.add(summary)
            db.commit()
            db.refresh(summary)
            data = {"id": summary.id, "document_id": doc.id, "document_title": doc.title, "summary": summary.summary, "model_used": summary.model_used}
            action = "create_summary"
            reply = f"Created a summary for {doc.title}."

    elif "search" in text or "find" in text:
        data = keyword_search(db, message)
        action = "search_knowledge"
        reply = f"Found {len(data)} matching knowledge chunks." if data else "No matching knowledge chunks found."

    elif "document" in text or "doc" in text or "file" in text:
        if "delete" in text:
            if "confirm" not in text:
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete document <id or title>."
            else:
                doc = find_document(db, message)
                if doc:
                    data = doc_payload(doc, db)
                    db.delete(doc)
                    db.commit()
                    action = "delete_document"
                    reply = f"Deleted document {data['title']}."
                else:
                    action = "not_found"
                    reply = "I could not find that document."
        elif "show" in text or "open" in text or "detail" in text:
            doc = find_document(db, message)
            if doc:
                data = doc_payload(doc, db)
                data["content_preview"] = (doc.content or "")[:1200]
                route = f"/documents/{doc.id}"
                action = "get_document"
                reply = f"Loaded document {doc.title}."
            else:
                data = list_documents(db)
                action = "list_documents"
                reply = f"I could not identify a specific document, so I listed {len(data)} recent documents."
        else:
            data = list_documents(db)
            action = "list_documents"
            reply = f"Found {len(data)} recent documents."

    elif platform_module_from_text(message):
        module_key = platform_module_from_text(message)
        module = MODULES[module_key]
        if any(word in text for word in ["run", "test", "sync", "validate", "review", "analyze", "promote", "send"]):
            item = platform_item_from_text(module_key, message)
            result = run_module_action(module_key, item["id"])
            data = result["item"]
            action = f"run_platform_ops_{module_key}"
            reply = result["item"].get("action_result") or f"{module['primary_action']} completed."
        else:
            data = {"module": module_key, "title": module["title"], "items": module["items"]}
            action = f"list_platform_ops_{module_key}"
            route = "/platform-ops"
            reply = f"Loaded {len(module['items'])} records from {module['title']}."

    elif ai_feature_from_text(message):
        feature = ai_feature_from_text(message)
        data = call_openrouter(feature, message)
        action = f"run_ai_{feature.replace(' ', '_')}"
        route = "/ai-hub"
        reply = data.get("summary") or f"Ran {feature}."

    else:
        data = {"capabilities": capabilities()}
        action = "fallback_help"
        reply = "I can operate app features from wording. Try: list documents, search retention policy, run sync check for Legal SharePoint Library, show cost analytics, create tag Customer Risk, or run citation validation."

    record_action(db, current_user, action, message)
    return {
        "reply": reply,
        "action": action,
        "route": route,
        "data": serialize(data),
        "suggestions": [
            "Show connector status",
            "Search documents for retention",
            "Run citation validation",
            "Show cost analytics",
            "Create tag Customer Risk",
            "Open Platform Ops",
        ],
    }
