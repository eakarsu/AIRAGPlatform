from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from database import get_db
from models.database_models import (
    DocumentEvent, Document, User, KnowledgeChunk,
    ChatSession, ChatMessage, AISummary, Tag, PromptTemplate, ActivityLog, Favorite,
)
from models.schemas import UsageAnalyticsResponse
from routers.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/usage", response_model=UsageAnalyticsResponse)
def get_usage_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_events = db.query(func.count(DocumentEvent.id)).scalar()

    # Events by type
    type_groups = db.query(
        DocumentEvent.event_type,
        func.count(DocumentEvent.id).label("count"),
    ).group_by(DocumentEvent.event_type).all()
    events_by_type = {row.event_type: row.count for row in type_groups}

    # Top documents by event count
    top_docs_query = (
        db.query(
            DocumentEvent.document_id,
            func.count(DocumentEvent.id).label("event_count"),
        )
        .group_by(DocumentEvent.document_id)
        .order_by(func.count(DocumentEvent.id).desc())
        .limit(5)
        .all()
    )
    top_documents = []
    for row in top_docs_query:
        doc = db.query(Document).filter(Document.id == row.document_id).first()
        top_documents.append({
            "document_id": row.document_id,
            "document_title": doc.title if doc else "Unknown",
            "event_count": row.event_count,
        })

    # Daily events for last 14 days
    daily_query = (
        db.query(
            func.date_trunc("day", DocumentEvent.created_at).label("day"),
            func.count(DocumentEvent.id).label("count"),
        )
        .group_by(func.date_trunc("day", DocumentEvent.created_at))
        .order_by(func.date_trunc("day", DocumentEvent.created_at).desc())
        .limit(14)
        .all()
    )
    daily_events = [
        {"day": str(row.day)[:10], "count": row.count}
        for row in reversed(daily_query)
    ]

    total_documents = db.query(func.count(Document.id)).scalar()
    total_users = db.query(func.count(User.id)).scalar()

    return UsageAnalyticsResponse(
        total_events=total_events,
        events_by_type=events_by_type,
        top_documents=top_documents,
        daily_events=daily_events,
        total_documents=total_documents,
        total_users=total_users,
    )


@router.post("/events")
def log_event(
    document_id: int,
    event_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    event = DocumentEvent(
        document_id=document_id,
        user_id=current_user.id,
        event_type=event_type,
    )
    db.add(event)
    db.commit()
    return {"message": "Event logged"}
