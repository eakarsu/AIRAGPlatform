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
    WorkspaceMember,
)
from routers.auth import get_current_user
from routers.custom_views import (
    _rule_payload,
    create_retrieval_rule_record,
    delete_retrieval_rule_record,
    get_retrieval_rule_record,
    list_retrieval_rule_records,
    update_retrieval_rule_record,
)
from routers.platform_ops import MODULES, run_module_action
from routers.users import hash_password
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


def extract_id(text: str, labels: list[str] | tuple[str, ...] = ()):
    if labels:
        label_pattern = "|".join(re.escape(label) for label in labels)
        match = re.search(rf"\b(?:{label_pattern})\s*(?:id)?\s*#?\s*(\d+)\b", text, re.I)
        if match:
            return int(match.group(1))
    match = re.search(r"\b(?:id|#)\s*(\d+)\b", text, re.I)
    return int(match.group(1)) if match else None


def needs_confirm(text: str) -> bool:
    return "delete" in text and "confirm" not in text


def text_after_colon(message: str):
    return clean(message.split(":", 1)[1]) if ":" in message else None


def quoted_value(message: str):
    quoted = re.findall(r'"([^"]+)"|\'([^\']+)\'', message)
    return clean(next((a or b for a, b in quoted if a or b), "")) or None


def value_after(message: str, labels: list[str] | tuple[str, ...]):
    for label in labels:
        match = re.search(rf"\b{re.escape(label)}\b\s*(?:to|as|=|:)?\s+(.+)$", message, re.I)
        if match:
            return clean(match.group(1))
    return None


def rename_value(message: str, labels: list[str] | tuple[str, ...]):
    label_pattern = "|".join(re.escape(label) for label in labels)
    match = re.search(rf"\brename\s+(?:{label_pattern})\s*(?:id)?\s*#?\s*\d*\s*(?:to|as)\s+(.+)$", message, re.I)
    return clean(match.group(1)) if match else None


def token_count(text: str) -> int:
    return len((text or "").split())


def make_slug(name: str):
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return (slug or "workspace")[:100]


def user_payload(user: User, db: Session):
    doc_count = db.query(func.count(Document.id)).filter(Document.user_id == user.id).scalar()
    session_count = db.query(func.count(ChatSession.id)).filter(ChatSession.user_id == user.id).scalar()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": user.is_active,
        "document_count": doc_count,
        "session_count": session_count,
        "created_at": user.created_at,
    }


def workspace_payload(row: Workspace, db: Session):
    member_count = db.query(func.count(WorkspaceMember.id)).filter(WorkspaceMember.workspace_id == row.id).scalar()
    return {
        "id": row.id,
        "name": row.name,
        "slug": row.slug,
        "description": row.description,
        "owner_id": row.owner_id,
        "is_active": row.is_active,
        "member_count": member_count,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def prompt_payload(row: PromptTemplate):
    return {
        "id": row.id,
        "title": row.title,
        "description": row.description,
        "template_text": row.template_text,
        "category": row.category,
        "is_active": row.is_active,
        "updated_at": row.updated_at,
    }


def favorite_payload(row: Favorite):
    return {
        "id": row.id,
        "entity_type": row.entity_type,
        "entity_id": row.entity_id,
        "entity_name": row.entity_name,
        "note": row.note,
        "created_at": row.created_at,
    }


def chunk_payload(row: KnowledgeChunk, db: Session):
    doc = db.query(Document).filter(Document.id == row.document_id).first()
    return {
        "id": row.id,
        "document_id": row.document_id,
        "document_title": doc.title if doc else "Unknown",
        "chunk_index": row.chunk_index,
        "tokens": row.tokens or token_count(row.chunk_text),
        "chunk_text": row.chunk_text,
        "created_at": row.created_at,
    }


def summary_payload(row: AISummary, db: Session):
    doc = db.query(Document).filter(Document.id == row.document_id).first()
    return {
        "id": row.id,
        "document_id": row.document_id,
        "document_title": doc.title if doc else "Unknown",
        "title": row.title,
        "summary": row.summary,
        "model_used": row.model_used,
        "created_at": row.created_at,
    }


def session_payload(row: ChatSession, db: Session):
    message_count = db.query(func.count(ChatMessage.id)).filter(ChatMessage.session_id == row.id).scalar()
    last = db.query(ChatMessage).filter(ChatMessage.session_id == row.id).order_by(ChatMessage.created_at.desc()).first()
    return {
        "id": row.id,
        "title": row.title,
        "user_id": row.user_id,
        "message_count": message_count,
        "last_message": last.content[:160] if last else None,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def entity_name_for_favorite(db: Session, entity_type: str, entity_id: int):
    entity_type = (entity_type or "").lower()
    model_map = {
        "document": (Document, "title"),
        "prompt": (PromptTemplate, "title"),
        "summary": (AISummary, "title"),
        "chunk": (KnowledgeChunk, "chunk_text"),
        "workspace": (Workspace, "name"),
        "user": (User, "name"),
    }
    config = model_map.get(entity_type)
    if not config:
        return f"{entity_type} {entity_id}".strip()
    model, label_attr = config
    row = db.query(model).filter(model.id == entity_id).first()
    if not row:
        return None
    value = getattr(row, label_attr, None) or f"{entity_type} {entity_id}"
    return value[:120] if isinstance(value, str) else str(value)


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
        {"name": "Documents", "examples": ["List documents", "Show document 3", "Rename document 2 to Vendor Policy", "Search documents for retention", "Summarize document 2"]},
        {"name": "Knowledge", "examples": ["List knowledge chunks", "Create chunk for document 1: escalation policy text", "Update chunk 4: corrected text", "Confirm delete chunk 4"]},
        {"name": "Summaries", "examples": ["List summaries", "Show summary 2", "Update summary 2: revised executive summary", "Confirm delete summary 2"]},
        {"name": "Tags", "examples": ["List tags", "Create tag Customer Risk", "Confirm delete tag 4"]},
        {"name": "Prompts", "examples": ["Create prompt Risk Review: Identify material risks", "Update prompt 3 category Legal", "Confirm delete prompt 3"]},
        {"name": "Favorites", "examples": ["Favorite document 1", "Update favorite 2 note high priority", "Confirm delete favorite 2"]},
        {"name": "Workspaces", "examples": ["Create workspace Legal Review", "Invite user 3 to workspace 1 as admin", "Confirm delete workspace 2"]},
        {"name": "Users", "examples": ["List users", "Create user Jane Doe email jane@example.com password StrongPass123 role analyst", "Deactivate user 4"]},
        {"name": "Chat Sessions", "examples": ["List chat sessions", "Create chat session Policy Review", "Show messages for chat session 2", "Confirm delete chat session 2"]},
        {"name": "AI Hub", "examples": ["Run citation validation for this answer", "Run contradiction detection on policy versions"]},
        {"name": "Platform Ops", "examples": ["Show connector status", "Run sync check for Legal SharePoint Library", "Show cost analytics"]},
        {"name": "Retrieval Rules", "examples": ["List retrieval rules", "Create retrieval rule Precise Lookup chunk size 256 top k 3 reranking mmr", "Confirm delete retrieval rule 3"]},
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
        reply = "I can operate documents, knowledge chunks, summaries, tags, prompts, favorites, workspaces, users, chat sessions, retrieval rules, AI Hub tools, Platform Ops modules, analytics, activity, and navigation."

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

    elif "user" in text and "workspace" not in text and "favorite" not in text:
        user_id = extract_id(message, ("user",))
        if ("create" in text or "add" in text) and "email" in text:
            email_match = re.search(r"\bemail\s+([^\s]+@[^\s]+)", message, re.I)
            password_match = re.search(r"\bpassword\s+([^\s]+)", message, re.I)
            role_match = re.search(r"\brole\s+([a-zA-Z0-9_-]+)", message, re.I)
            name_match = re.search(r"(?:create|add)\s+user\s+(.+?)\s+email\b", message, re.I)
            if not email_match or not password_match or not name_match:
                action = "needs_more_information"
                reply = "To create a user, include name, email, password, and optional role. Example: create user Jane Doe email jane@example.com password StrongPass123 role analyst."
            elif db.query(User).filter(User.email == email_match.group(1)).first():
                action = "user_exists"
                reply = "A user with that email already exists."
            else:
                user = User(
                    name=clean(name_match.group(1)),
                    email=email_match.group(1),
                    password_hash=hash_password(password_match.group(1)),
                    role=role_match.group(1) if role_match else "user",
                    is_active=True,
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                data = user_payload(user, db)
                action = "create_user"
                reply = f"Created user {user.name}."
        elif user_id and ("activate" in text or "deactivate" in text or "disable" in text or "enable" in text or "update" in text or "edit" in text):
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                action = "not_found"
                reply = "I could not find that user."
            else:
                if "deactivate" in text or "disable" in text:
                    user.is_active = False
                if "activate" in text or "enable" in text:
                    user.is_active = True
                role_match = re.search(r"\brole\s+([a-zA-Z0-9_-]+)", message, re.I)
                email_match = re.search(r"\bemail\s+([^\s]+@[^\s]+)", message, re.I)
                name_match = re.search(r"\bname\s+(?:to|as)?\s*(.+?)(?:\s+email|\s+role|$)", message, re.I)
                if role_match:
                    user.role = role_match.group(1)
                if email_match:
                    user.email = email_match.group(1)
                if name_match:
                    user.name = clean(name_match.group(1))
                db.commit()
                db.refresh(user)
                data = user_payload(user, db)
                action = "update_user"
                reply = f"Updated user {user.name}."
        elif user_id and "delete" in text:
            if needs_confirm(text):
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete user <id>."
            else:
                user = db.query(User).filter(User.id == user_id).first()
                if not user:
                    action = "not_found"
                    reply = "I could not find that user."
                elif user.id == 1:
                    action = "blocked"
                    reply = "I will not delete the demo/admin user."
                else:
                    data = user_payload(user, db)
                    db.delete(user)
                    db.commit()
                    action = "delete_user"
                    reply = f"Deleted user {data['name']}."
        else:
            users = db.query(User).order_by(User.created_at.desc()).limit(50).all()
            data = [user_payload(user, db) for user in users]
            action = "list_users"
            reply = f"Found {len(data)} users."

    elif "workspace" in text and "favorite" not in text:
        workspace_id = extract_id(message, ("workspace",))
        if "member" in text or "invite" in text:
            if workspace_id and ("list" in text or "show" in text):
                members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
                data = []
                for member in members:
                    user = db.query(User).filter(User.id == member.user_id).first()
                    data.append({
                        "id": member.id,
                        "workspace_id": member.workspace_id,
                        "user_id": member.user_id,
                        "user_name": user.name if user else None,
                        "user_email": user.email if user else None,
                        "role": member.role,
                        "created_at": member.created_at,
                    })
                action = "list_workspace_members"
                reply = f"Found {len(data)} workspace members."
            elif workspace_id and ("invite" in text or "add" in text):
                user_id = extract_id(message, ("user",))
                role_match = re.search(r"\bas\s+([a-zA-Z0-9_-]+)", message, re.I)
                user = db.query(User).filter(User.id == user_id).first() if user_id else None
                workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
                if not user or not workspace:
                    action = "not_found"
                    reply = "I need a valid workspace id and user id. Example: invite user 3 to workspace 1 as admin."
                elif db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id).first():
                    action = "workspace_member_exists"
                    reply = f"{user.name} is already a member of {workspace.name}."
                else:
                    member = WorkspaceMember(
                        workspace_id=workspace_id,
                        user_id=user_id,
                        role=role_match.group(1) if role_match else "member",
                        invited_by=current_user.id,
                    )
                    db.add(member)
                    db.commit()
                    db.refresh(member)
                    data = {"id": member.id, "workspace_id": workspace_id, "user_id": user_id, "role": member.role}
                    action = "invite_workspace_member"
                    reply = f"Added {user.name} to {workspace.name} as {member.role}."
            elif workspace_id and "remove" in text:
                if "confirm" not in text:
                    action = "needs_confirmation"
                    reply = "Member removal needs explicit confirmation. Say: confirm remove user <id> from workspace <id>."
                else:
                    user_id = extract_id(message, ("user",))
                    member = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == user_id).first() if user_id else None
                    if not member:
                        action = "not_found"
                        reply = "I could not find that workspace member."
                    else:
                        data = {"id": member.id, "workspace_id": member.workspace_id, "user_id": member.user_id, "role": member.role}
                        db.delete(member)
                        db.commit()
                        action = "remove_workspace_member"
                        reply = "Removed the workspace member."
            else:
                action = "needs_more_information"
                reply = "Use a workspace member command like: list members for workspace 1, invite user 3 to workspace 1 as admin, or confirm remove user 3 from workspace 1."
        elif "create" in text or "add" in text:
            name_match = re.search(r"(?:create|add)\s+workspace\s+(.+?)(?:\s+description\b|$)", message, re.I)
            description = value_after(message, ("description",))
            name = clean(name_match.group(1)) if name_match else "New Workspace"
            slug = make_slug(name)
            if db.query(Workspace).filter(Workspace.slug == slug).first():
                slug = f"{slug}-{current_user.id}"
            workspace = Workspace(name=name, description=description, owner_id=current_user.id, slug=slug, is_active=True)
            db.add(workspace)
            db.commit()
            db.refresh(workspace)
            db.add(WorkspaceMember(workspace_id=workspace.id, user_id=current_user.id, role="owner"))
            db.commit()
            data = workspace_payload(workspace, db)
            action = "create_workspace"
            reply = f"Created workspace {workspace.name}."
        elif workspace_id and ("update" in text or "edit" in text or "rename" in text or "activate" in text or "deactivate" in text):
            workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if not workspace:
                action = "not_found"
                reply = "I could not find that workspace."
            else:
                name = rename_value(message, ("workspace",)) or value_after(message, ("name", "title"))
                description = value_after(message, ("description",))
                if name:
                    workspace.name = name
                    workspace.slug = make_slug(name)
                if description:
                    workspace.description = description
                if "deactivate" in text:
                    workspace.is_active = False
                if "activate" in text:
                    workspace.is_active = True
                db.commit()
                db.refresh(workspace)
                data = workspace_payload(workspace, db)
                action = "update_workspace"
                reply = f"Updated workspace {workspace.name}."
        elif workspace_id and "delete" in text:
            if needs_confirm(text):
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete workspace <id>."
            else:
                workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
                if not workspace:
                    action = "not_found"
                    reply = "I could not find that workspace."
                else:
                    data = workspace_payload(workspace, db)
                    db.delete(workspace)
                    db.commit()
                    action = "delete_workspace"
                    reply = f"Deleted workspace {data['name']}."
        elif workspace_id and ("show" in text or "detail" in text):
            workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if workspace:
                data = workspace_payload(workspace, db)
                action = "get_workspace"
                reply = f"Loaded workspace {workspace.name}."
            else:
                action = "not_found"
                reply = "I could not find that workspace."
        else:
            rows = db.query(Workspace).order_by(Workspace.created_at.desc()).limit(50).all()
            data = [workspace_payload(row, db) for row in rows]
            action = "list_workspaces"
            reply = f"Found {len(data)} workspaces."

    elif "prompt" in text and "favorite" not in text:
        prompt_id = extract_id(message, ("prompt",))
        if "create" in text or "add" in text:
            match = re.search(r"(?:create|add)\s+prompt\s+(.+?)(?::|\s+template\b|$)", message, re.I)
            title = clean(match.group(1)) if match else "New Prompt"
            template_text = text_after_colon(message) or value_after(message, ("template", "text")) or "Describe the expected AI output here."
            category_match = re.search(r"\bcategory\s+([a-zA-Z0-9 _-]+)", message, re.I)
            prompt = PromptTemplate(
                title=title,
                description="Created from System Chat",
                template_text=template_text,
                category=clean(category_match.group(1)) if category_match else "General",
                is_active=True,
                user_id=current_user.id,
            )
            db.add(prompt)
            db.commit()
            db.refresh(prompt)
            data = prompt_payload(prompt)
            action = "create_prompt"
            reply = f"Created prompt {prompt.title}."
        elif prompt_id and ("update" in text or "edit" in text):
            prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
            if not prompt:
                action = "not_found"
                reply = "I could not find that prompt."
            else:
                title = value_after(message, ("title", "name"))
                template_text = text_after_colon(message) or value_after(message, ("template", "text"))
                category_match = re.search(r"\bcategory\s+([a-zA-Z0-9 _-]+)", message, re.I)
                if title:
                    prompt.title = title
                if template_text:
                    prompt.template_text = template_text
                if category_match:
                    prompt.category = clean(category_match.group(1))
                if "deactivate" in text:
                    prompt.is_active = False
                if "activate" in text:
                    prompt.is_active = True
                db.commit()
                db.refresh(prompt)
                data = prompt_payload(prompt)
                action = "update_prompt"
                reply = f"Updated prompt {prompt.title}."
        elif prompt_id and "delete" in text:
            if needs_confirm(text):
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete prompt <id>."
            else:
                prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
                if not prompt:
                    action = "not_found"
                    reply = "I could not find that prompt."
                else:
                    data = prompt_payload(prompt)
                    db.delete(prompt)
                    db.commit()
                    action = "delete_prompt"
                    reply = f"Deleted prompt {data['title']}."
        elif prompt_id and ("show" in text or "detail" in text):
            prompt = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
            if prompt:
                data = prompt_payload(prompt)
                action = "get_prompt"
                reply = f"Loaded prompt {prompt.title}."
            else:
                action = "not_found"
                reply = "I could not find that prompt."
        else:
            rows = db.query(PromptTemplate).order_by(PromptTemplate.updated_at.desc()).limit(50).all()
            data = [prompt_payload(row) for row in rows]
            action = "list_prompts"
            reply = f"Found {len(data)} prompt templates."

    elif "activity" in text or "audit log" in text:
        action = "list_activity"
        rows = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(20).all()
        data = [{"id": row.id, "user_name": row.user_name, "action": row.action, "entity_name": row.entity_name, "details": row.details, "created_at": row.created_at} for row in rows]
        reply = f"Loaded {len(data)} recent activity records."

    elif "favorite" in text:
        favorite_id = extract_id(message, ("favorite",))
        if "create" in text or "add" in text or text.startswith("favorite "):
            entity_match = re.search(r"\b(document|prompt|summary|chunk|workspace|user)\s*(?:id)?\s*#?\s*(\d+)\b", message, re.I)
            if not entity_match:
                action = "needs_more_information"
                reply = "Tell me what to favorite. Example: favorite document 1."
            else:
                entity_type = entity_match.group(1).lower()
                entity_id = int(entity_match.group(2))
                entity_name = entity_name_for_favorite(db, entity_type, entity_id)
                if not entity_name:
                    action = "not_found"
                    reply = f"I could not find {entity_type} {entity_id}."
                elif db.query(Favorite).filter(Favorite.user_id == current_user.id, Favorite.entity_type == entity_type, Favorite.entity_id == entity_id).first():
                    action = "favorite_exists"
                    reply = f"{entity_name} is already in favorites."
                else:
                    note = value_after(message, ("note",))
                    fav = Favorite(user_id=current_user.id, entity_type=entity_type, entity_id=entity_id, entity_name=entity_name, note=note)
                    db.add(fav)
                    db.commit()
                    db.refresh(fav)
                    data = favorite_payload(fav)
                    action = "create_favorite"
                    reply = f"Favorited {entity_name}."
        elif favorite_id and ("update" in text or "edit" in text or "note" in text):
            fav = db.query(Favorite).filter(Favorite.id == favorite_id).first()
            if not fav:
                action = "not_found"
                reply = "I could not find that favorite."
            else:
                fav.note = value_after(message, ("note",)) or text_after_colon(message) or fav.note
                db.commit()
                db.refresh(fav)
                data = favorite_payload(fav)
                action = "update_favorite"
                reply = "Updated the favorite note."
        elif favorite_id and "delete" in text:
            if needs_confirm(text):
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete favorite <id>."
            else:
                fav = db.query(Favorite).filter(Favorite.id == favorite_id).first()
                if not fav:
                    action = "not_found"
                    reply = "I could not find that favorite."
                else:
                    data = favorite_payload(fav)
                    db.delete(fav)
                    db.commit()
                    action = "delete_favorite"
                    reply = f"Removed favorite {data['entity_name']}."
        else:
            rows = db.query(Favorite).order_by(Favorite.created_at.desc()).limit(50).all()
            data = [favorite_payload(row) for row in rows]
            action = "list_favorites"
            reply = f"Found {len(data)} favorites."

    elif "chat session" in text or "conversation" in text:
        session_id = extract_id(message, ("chat session", "session", "conversation"))
        if "create" in text or "add" in text:
            title_match = re.search(r"(?:create|add)\s+(?:chat session|conversation)\s+(.+)$", message, re.I)
            title = clean(title_match.group(1)) if title_match else "New Chat Session"
            session = ChatSession(title=title, user_id=current_user.id)
            db.add(session)
            db.commit()
            db.refresh(session)
            data = session_payload(session, db)
            action = "create_chat_session"
            reply = f"Created chat session {session.title}."
        elif session_id and ("message" in text or "messages" in text or "show" in text or "detail" in text):
            session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
            if not session:
                action = "not_found"
                reply = "I could not find that chat session."
            elif "message" in text or "messages" in text:
                rows = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at).limit(50).all()
                data = [{"id": row.id, "role": row.role, "content": row.content, "model_used": row.model_used, "created_at": row.created_at} for row in rows]
                action = "list_chat_messages"
                reply = f"Loaded {len(data)} messages from {session.title}."
            else:
                data = session_payload(session, db)
                action = "get_chat_session"
                reply = f"Loaded chat session {session.title}."
        elif session_id and ("rename" in text or "update" in text or "edit" in text):
            session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
            if not session:
                action = "not_found"
                reply = "I could not find that chat session."
            else:
                title = rename_value(message, ("chat session", "session", "conversation")) or value_after(message, ("title", "name")) or text_after_colon(message)
                if title:
                    session.title = title
                    db.commit()
                    db.refresh(session)
                data = session_payload(session, db)
                action = "update_chat_session"
                reply = f"Updated chat session {session.title}."
        elif session_id and "delete" in text:
            if needs_confirm(text):
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete chat session <id>."
            else:
                session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
                if not session:
                    action = "not_found"
                    reply = "I could not find that chat session."
                else:
                    data = session_payload(session, db)
                    db.delete(session)
                    db.commit()
                    action = "delete_chat_session"
                    reply = f"Deleted chat session {data['title']}."
        else:
            rows = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).limit(50).all()
            data = [session_payload(row, db) for row in rows]
            action = "list_chat_sessions"
            reply = f"Found {len(data)} chat sessions."

    elif "knowledge chunk" in text or "knowledge chunks" in text or " chunk" in text or text.startswith("chunk"):
        chunk_id = extract_id(message, ("knowledge chunk", "chunk"))
        if "create" in text or "add" in text:
            doc_id = extract_id(message, ("document", "doc"))
            chunk_text = text_after_colon(message)
            doc = db.query(Document).filter(Document.id == doc_id).first() if doc_id else None
            if not doc or not chunk_text:
                action = "needs_more_information"
                reply = "To create a chunk, include a document id and text. Example: create chunk for document 1: policy text."
            else:
                max_index = db.query(func.max(KnowledgeChunk.chunk_index)).filter(KnowledgeChunk.document_id == doc.id).scalar()
                chunk = KnowledgeChunk(document_id=doc.id, chunk_text=chunk_text, chunk_index=(max_index or 0) + 1, tokens=token_count(chunk_text))
                db.add(chunk)
                db.commit()
                db.refresh(chunk)
                data = chunk_payload(chunk, db)
                action = "create_knowledge_chunk"
                reply = f"Created knowledge chunk {chunk.id} for {doc.title}."
        elif chunk_id and ("update" in text or "edit" in text):
            chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
            chunk_text = text_after_colon(message) or value_after(message, ("text", "content"))
            if not chunk:
                action = "not_found"
                reply = "I could not find that chunk."
            elif not chunk_text:
                action = "needs_more_information"
                reply = "Include the revised chunk text after a colon. Example: update chunk 4: corrected text."
            else:
                chunk.chunk_text = chunk_text
                chunk.tokens = token_count(chunk_text)
                db.commit()
                db.refresh(chunk)
                data = chunk_payload(chunk, db)
                action = "update_knowledge_chunk"
                reply = f"Updated knowledge chunk {chunk.id}."
        elif chunk_id and "delete" in text:
            if needs_confirm(text):
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete chunk <id>."
            else:
                chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
                if not chunk:
                    action = "not_found"
                    reply = "I could not find that chunk."
                else:
                    data = chunk_payload(chunk, db)
                    db.delete(chunk)
                    db.commit()
                    action = "delete_knowledge_chunk"
                    reply = f"Deleted knowledge chunk {data['id']}."
        elif chunk_id and ("show" in text or "detail" in text):
            chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
            if chunk:
                data = chunk_payload(chunk, db)
                action = "get_knowledge_chunk"
                reply = f"Loaded knowledge chunk {chunk.id}."
            else:
                action = "not_found"
                reply = "I could not find that chunk."
        else:
            doc_id = extract_id(message, ("document", "doc"))
            query = db.query(KnowledgeChunk)
            if doc_id:
                query = query.filter(KnowledgeChunk.document_id == doc_id)
            rows = query.order_by(KnowledgeChunk.id.desc()).limit(50).all()
            data = [chunk_payload(row, db) for row in rows]
            action = "list_knowledge_chunks"
            reply = f"Found {len(data)} knowledge chunks."

    elif "summary" in text or "summaries" in text:
        summary_id = extract_id(message, ("summary",))
        if summary_id and ("update" in text or "edit" in text):
            summary = db.query(AISummary).filter(AISummary.id == summary_id).first()
            summary_text = text_after_colon(message) or value_after(message, ("summary", "text", "content"))
            title = value_after(message, ("title",))
            if not summary:
                action = "not_found"
                reply = "I could not find that summary."
            else:
                if title:
                    summary.title = title
                if summary_text:
                    summary.summary = summary_text
                db.commit()
                db.refresh(summary)
                data = summary_payload(summary, db)
                action = "update_summary"
                reply = f"Updated summary {summary.id}."
        elif summary_id and "delete" in text:
            if needs_confirm(text):
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete summary <id>."
            else:
                summary = db.query(AISummary).filter(AISummary.id == summary_id).first()
                if not summary:
                    action = "not_found"
                    reply = "I could not find that summary."
                else:
                    data = summary_payload(summary, db)
                    db.delete(summary)
                    db.commit()
                    action = "delete_summary"
                    reply = f"Deleted summary {data['title'] or data['id']}."
        elif summary_id and ("show" in text or "detail" in text):
            summary = db.query(AISummary).filter(AISummary.id == summary_id).first()
            if summary:
                data = summary_payload(summary, db)
                action = "get_summary"
                reply = f"Loaded summary {summary.id}."
            else:
                action = "not_found"
                reply = "I could not find that summary."
        else:
            rows = db.query(AISummary).order_by(AISummary.created_at.desc()).limit(50).all()
            data = [summary_payload(row, db) for row in rows]
            action = "list_summaries"
            reply = f"Found {len(data)} summaries."

    elif "retrieval rule" in text or "retrieval rules" in text:
        rule_id = extract_id(message, ("retrieval rule", "rule"))
        if "create" in text or "add" in text:
            name_match = re.search(r"(?:create|add)\s+retrieval rule\s+(.+?)(?:\s+chunk size|\s+top k|\s+reranking|\s+description|$)", message, re.I)
            payload_rule = {"name": clean(name_match.group(1)) if name_match else "New Retrieval Rule"}
            chunk_match = re.search(r"\bchunk size\s+(\d+)", message, re.I)
            top_k_match = re.search(r"\btop k\s+(\d+)", message, re.I)
            rerank_match = re.search(r"\breranking\s+([a-zA-Z0-9_-]+)", message, re.I)
            description = value_after(message, ("description",))
            if chunk_match:
                payload_rule["chunk_size"] = int(chunk_match.group(1))
            if top_k_match:
                payload_rule["top_k"] = int(top_k_match.group(1))
            if rerank_match:
                payload_rule["reranking"] = rerank_match.group(1)
            if description:
                payload_rule["description"] = description
            rule = create_retrieval_rule_record(db, payload_rule)
            data = _rule_payload(rule)
            action = "create_retrieval_rule"
            reply = f"Created retrieval rule {rule.name}."
        elif rule_id and ("update" in text or "edit" in text):
            rule = get_retrieval_rule_record(db, rule_id)
            if not rule:
                action = "not_found"
                reply = "I could not find that retrieval rule."
            else:
                payload_rule = {}
                name = value_after(message, ("name", "title"))
                chunk_match = re.search(r"\bchunk size\s+(\d+)", message, re.I)
                top_k_match = re.search(r"\btop k\s+(\d+)", message, re.I)
                rerank_match = re.search(r"\breranking\s+([a-zA-Z0-9_-]+)", message, re.I)
                description = value_after(message, ("description",))
                if name:
                    payload_rule["name"] = name
                if chunk_match:
                    payload_rule["chunk_size"] = int(chunk_match.group(1))
                if top_k_match:
                    payload_rule["top_k"] = int(top_k_match.group(1))
                if rerank_match:
                    payload_rule["reranking"] = rerank_match.group(1)
                if description:
                    payload_rule["description"] = description
                rule = update_retrieval_rule_record(db, rule_id, payload_rule)
                data = _rule_payload(rule)
                action = "update_retrieval_rule"
                reply = f"Updated retrieval rule {rule.name}."
        elif rule_id and "delete" in text:
            if needs_confirm(text):
                action = "needs_confirmation"
                reply = "Deletion needs explicit confirmation. Say: confirm delete retrieval rule <id>."
            elif not get_retrieval_rule_record(db, rule_id):
                action = "not_found"
                reply = "I could not find that retrieval rule."
            else:
                data = delete_retrieval_rule_record(db, rule_id)
                action = "delete_retrieval_rule"
                reply = f"Deleted retrieval rule {data['name']}."
        else:
            data = [_rule_payload(rule) for rule in list_retrieval_rule_records(db)]
            action = "list_retrieval_rules"
            reply = f"Found {len(data)} retrieval rules."

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
        elif "update" in text or "edit" in text or "rename" in text:
            doc = find_document(db, message)
            if not doc:
                action = "not_found"
                reply = "I could not identify the document to update. Try: rename document 3 to Vendor Policy."
            else:
                title = rename_value(message, ("document", "doc", "file")) or value_after(message, ("title", "name"))
                status_match = re.search(r"\bstatus\s+(?:to|as)?\s*([a-zA-Z0-9_-]+)", message, re.I)
                content = text_after_colon(message) if "content" in text else None
                if title:
                    doc.title = title
                if status_match:
                    doc.status = status_match.group(1)
                if content:
                    doc.content = content
                doc.updated_at = utcnow()
                db.commit()
                db.refresh(doc)
                data = doc_payload(doc, db)
                data["content_preview"] = (doc.content or "")[:1200]
                action = "update_document"
                reply = f"Updated document {doc.title}."
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
        reply = "I can operate app features from wording. Try: list documents, create chunk for document 1: policy text, create prompt Risk Review: identify risks, favorite document 1, run sync check for Legal SharePoint Library, or run citation validation."

    record_action(db, current_user, action, message)
    return {
        "reply": reply,
        "action": action,
        "route": route,
        "data": serialize(data),
        "suggestions": [
            "List knowledge chunks",
            "Create prompt Risk Review: Identify material risks",
            "Favorite document 1",
            "List chat sessions",
            "List retrieval rules",
            "Show connector status",
        ],
    }
