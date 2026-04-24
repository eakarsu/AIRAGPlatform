from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.database_models import Document, AISummary, KnowledgeChunk
from models.schemas import (
    AISummaryResponse, AISummaryCreate, AISummaryUpdate,
    SearchRequest, SearchResponse, SearchResult,
    AnalyticsResponse, DocumentResponse, ChatSessionResponse,
)
from models.database_models import ChatSession, ChatMessage
from services import llm_service, vector_store
from services.embedding_service import embed_query
from sqlalchemy import func

router = APIRouter(prefix="/api/ai", tags=["ai"])


# --- AI Summaries ---
def summary_to_response(s: AISummary, db: Session) -> dict:
    doc = db.query(Document).filter(Document.id == s.document_id).first()
    return {
        "id": s.id,
        "document_id": s.document_id,
        "document_title": doc.title if doc else "Unknown",
        "title": s.title,
        "summary": s.summary,
        "model_used": s.model_used,
        "created_at": s.created_at,
    }


@router.get("/summaries", response_model=list[AISummaryResponse])
def list_summaries(db: Session = Depends(get_db)):
    summaries = db.query(AISummary).order_by(AISummary.created_at.desc()).all()
    return [AISummaryResponse(**summary_to_response(s, db)) for s in summaries]


@router.get("/summaries/{summary_id}", response_model=AISummaryResponse)
def get_summary(summary_id: int, db: Session = Depends(get_db)):
    s = db.query(AISummary).filter(AISummary.id == summary_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Summary not found")
    return AISummaryResponse(**summary_to_response(s, db))


@router.post("/summaries", response_model=AISummaryResponse)
def create_summary(data: AISummaryCreate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == data.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not doc.content:
        raise HTTPException(status_code=400, detail="Document has no content to summarize")

    try:
        result = llm_service.summarize_document(doc.content, doc.title)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI summarization failed: {str(e)}")

    summary = AISummary(
        document_id=doc.id,
        title=f"Summary of {doc.title}",
        summary=result["summary"],
        model_used=result["model_used"],
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)
    return AISummaryResponse(**summary_to_response(summary, db))


@router.put("/summaries/{summary_id}", response_model=AISummaryResponse)
def update_summary(summary_id: int, data: AISummaryUpdate, db: Session = Depends(get_db)):
    s = db.query(AISummary).filter(AISummary.id == summary_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Summary not found")

    if data.title is not None:
        s.title = data.title
    if data.summary is not None:
        s.summary = data.summary

    db.commit()
    db.refresh(s)
    return AISummaryResponse(**summary_to_response(s, db))


@router.delete("/summaries/{summary_id}")
def delete_summary(summary_id: int, db: Session = Depends(get_db)):
    s = db.query(AISummary).filter(AISummary.id == summary_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Summary not found")
    db.delete(s)
    db.commit()
    return {"message": "Summary deleted successfully"}


# --- Smart Search ---
@router.post("/search", response_model=SearchResponse)
def smart_search(data: SearchRequest, db: Session = Depends(get_db)):
    results = []

    # Try vector search first
    try:
        query_embedding = embed_query(data.query)
        vector_results = vector_store.query(query_embedding, top_k=data.top_k)

        if vector_results["documents"] and vector_results["documents"][0]:
            for i, doc_text in enumerate(vector_results["documents"][0]):
                meta = vector_results["metadatas"][0][i] if vector_results["metadatas"][0] else {}
                distance = vector_results["distances"][0][i] if vector_results["distances"][0] else 0

                doc_id = meta.get("document_id", 0)
                chunk_id = meta.get("chunk_id", 0)
                doc = db.query(Document).filter(Document.id == doc_id).first()

                results.append(SearchResult(
                    chunk_text=doc_text,
                    document_title=doc.title if doc else "Unknown",
                    document_id=doc_id,
                    chunk_id=chunk_id,
                    score=round(1 - distance, 3) if distance else 0,
                ))
    except Exception:
        pass

    # Fallback to PostgreSQL text search if vector search returned nothing
    if not results:
        # Search by keyword across knowledge chunks
        query_words = data.query.strip().split()
        chunks_query = db.query(KnowledgeChunk).join(
            Document, Document.id == KnowledgeChunk.document_id
        )
        for word in query_words[:5]:
            chunks_query = chunks_query.filter(
                KnowledgeChunk.chunk_text.ilike(f"%{word}%")
            )
        chunks = chunks_query.limit(data.top_k).all()

        # If exact multi-word match found nothing, try individual words with OR logic
        if not chunks and len(query_words) > 1:
            from sqlalchemy import or_
            conditions = [KnowledgeChunk.chunk_text.ilike(f"%{w}%") for w in query_words[:5]]
            chunks = db.query(KnowledgeChunk).join(
                Document, Document.id == KnowledgeChunk.document_id
            ).filter(or_(*conditions)).limit(data.top_k).all()

        for chunk in chunks:
            doc = db.query(Document).filter(Document.id == chunk.document_id).first()
            results.append(SearchResult(
                chunk_text=chunk.chunk_text,
                document_title=doc.title if doc else "Unknown",
                document_id=chunk.document_id,
                chunk_id=chunk.id,
                score=0.5,
            ))

    # Get AI answer
    ai_answer = None
    model_used = None
    response_time = None
    if results:
        try:
            search_data = [{"document_title": r.document_title, "chunk_text": r.chunk_text} for r in results]
            ai_result = llm_service.smart_search_answer(data.query, search_data)
            ai_answer = ai_result["answer"]
            model_used = ai_result["model_used"]
            response_time = ai_result["response_time"]
        except Exception:
            pass

    return SearchResponse(
        query=data.query,
        results=results,
        ai_answer=ai_answer,
        model_used=model_used,
        response_time=response_time,
    )


# --- Analytics ---
@router.get("/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    from models.database_models import User, Tag, PromptTemplate, ActivityLog, Favorite

    total_docs = db.query(func.count(Document.id)).scalar()
    total_chunks = db.query(func.count(KnowledgeChunk.id)).scalar()
    total_sessions = db.query(func.count(ChatSession.id)).scalar()
    total_messages = db.query(func.count(ChatMessage.id)).scalar()
    total_summaries = db.query(func.count(AISummary.id)).scalar()
    total_users = db.query(func.count(User.id)).scalar()
    total_tags = db.query(func.count(Tag.id)).scalar()
    total_templates = db.query(func.count(PromptTemplate.id)).scalar()
    total_activities = db.query(func.count(ActivityLog.id)).scalar()
    total_favorites = db.query(func.count(Favorite.id)).scalar()

    recent_docs = db.query(Document).order_by(Document.created_at.desc()).limit(5).all()
    recent_sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).limit(5).all()

    return AnalyticsResponse(
        total_documents=total_docs,
        total_chunks=total_chunks,
        total_sessions=total_sessions,
        total_messages=total_messages,
        total_summaries=total_summaries,
        total_users=total_users,
        total_tags=total_tags,
        total_templates=total_templates,
        total_activities=total_activities,
        total_favorites=total_favorites,
        recent_documents=[DocumentResponse(
            id=d.id, title=d.title, filename=d.filename, file_type=d.file_type,
            file_size=d.file_size, status=d.status, created_at=d.created_at,
            updated_at=d.updated_at, chunk_count=0,
        ) for d in recent_docs],
        recent_sessions=[ChatSessionResponse(
            id=s.id, title=s.title, message_count=0,
            created_at=s.created_at, updated_at=s.updated_at,
        ) for s in recent_sessions],
    )
