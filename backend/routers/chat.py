from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from database import get_db
from models.database_models import ChatSession, ChatMessage, Document, KnowledgeChunk, User
from models.schemas import (
    ChatRequest, ChatResponse, ChatMessageResponse,
    ChatSessionCreate, ChatSessionUpdate, ChatSessionResponse,
)
from services.embedding_service import embed_query
from services import vector_store, llm_service
from routers.auth import get_current_user
from services.workspace_access import can_access_document, document_scope_filter, normalize_workspace_id

router = APIRouter(prefix="/api/chat", tags=["chat"])


def session_to_response(session: ChatSession, db: Session) -> dict:
    msg_count = db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.session_id == session.id
    ).scalar()
    last_msg = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at.desc()).first()

    return {
        "id": session.id,
        "title": session.title,
        "user_id": session.user_id,
        "message_count": msg_count,
        "last_message": last_msg.content[:100] if last_msg else None,
        "created_at": session.created_at,
        "updated_at": session.updated_at,
    }


@router.post("/", response_model=ChatResponse)
def send_message(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    active_workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
):
    workspace_id = normalize_workspace_id(data.workspace_id if data.workspace_id is not None else active_workspace_id)
    # Get or create session
    if data.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == data.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        title = data.message[:50] + ("..." if len(data.message) > 50 else "")
        session = ChatSession(title=title, user_id=current_user.id)
        db.add(session)
        db.commit()
        db.refresh(session)

    # Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)
    db.commit()

    # Retrieve relevant context via vector search
    context_chunks = []
    sources = []
    try:
        query_embedding = embed_query(data.message)
        results = vector_store.query(query_embedding, top_k=15)

        if results["documents"] and results["documents"][0]:
            for i, doc_text in enumerate(results["documents"][0]):
                meta = results["metadatas"][0][i] if results["metadatas"][0] else {}
                distance = results["distances"][0][i] if results["distances"][0] else 0

                doc_id = meta.get("document_id")
                doc = db.query(Document).filter(Document.id == doc_id).first() if doc_id else None
                if not can_access_document(db, current_user, doc, workspace_id):
                    continue

                context_chunks.append(doc_text)
                sources.append({
                    "document_id": doc_id,
                    "document_title": doc.title if doc else "Unknown",
                    "chunk_preview": doc_text[:150] + "..." if len(doc_text) > 150 else doc_text,
                    "relevance_score": round(1 - distance, 3) if distance else 0,
                })
                if len(context_chunks) >= 5:
                    break
    except Exception:
        pass  # Proceed without context if vector search fails

    if not context_chunks:
        query_words = [word for word in data.message.strip().split() if len(word) >= 3][:5]
        if query_words:
            chunks_query = db.query(KnowledgeChunk).join(
                Document, Document.id == KnowledgeChunk.document_id
            ).filter(document_scope_filter(db, current_user, workspace_id))
            conditions = [KnowledgeChunk.chunk_text.ilike(f"%{word}%") for word in query_words]
            chunks = chunks_query.filter(or_(*conditions)).limit(5).all()
            for chunk in chunks:
                doc = db.query(Document).filter(Document.id == chunk.document_id).first()
                context_chunks.append(chunk.chunk_text)
                sources.append({
                    "document_id": chunk.document_id,
                    "document_title": doc.title if doc else "Unknown",
                    "chunk_preview": chunk.chunk_text[:150] + "..." if len(chunk.chunk_text) > 150 else chunk.chunk_text,
                    "relevance_score": 0.5,
                })

    # Get conversation history
    history = db.query(ChatMessage).filter(
        ChatMessage.session_id == session.id
    ).order_by(ChatMessage.created_at).all()
    conversation_history = [{"role": m.role, "content": m.content} for m in history]

    # Call LLM
    try:
        result = llm_service.chat_with_context(
            query=data.message,
            context_chunks=context_chunks,
            conversation_history=conversation_history,
            source_info=sources,
        )
        answer = result["answer"]
        model_used = result["model_used"]
        response_time = result["response_time"]
    except Exception as e:
        answer = f"I apologize, but I encountered an error while processing your request. Please check your OpenRouter API key in the .env file.\n\nError: {str(e)}"
        model_used = None
        response_time = None

    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=session.id,
        role="assistant",
        content=answer,
        sources=sources if sources else None,
        model_used=model_used,
        response_time=response_time,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return ChatResponse(
        message=ChatMessageResponse.model_validate(assistant_msg),
        session_id=session.id,
    )


@router.get("/sessions", response_model=list[ChatSessionResponse])
def list_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).order_by(ChatSession.updated_at.desc()).all()
    return [ChatSessionResponse(**session_to_response(s, db)) for s in sessions]


@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(data: ChatSessionCreate, db: Session = Depends(get_db)):
    session = ChatSession(title=data.title, user_id=1)
    db.add(session)
    db.commit()
    db.refresh(session)
    return ChatSessionResponse(**session_to_response(session, db))


@router.get("/sessions/{session_id}", response_model=ChatSessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return ChatSessionResponse(**session_to_response(session, db))


@router.put("/sessions/{session_id}", response_model=ChatSessionResponse)
def update_session(session_id: int, data: ChatSessionUpdate, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = data.title
    db.commit()
    db.refresh(session)
    return ChatSessionResponse(**session_to_response(session, db))


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully"}


@router.get("/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
def get_messages(session_id: int, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.query(ChatMessage).filter(
        ChatMessage.session_id == session_id
    ).order_by(ChatMessage.created_at).all()
    return [ChatMessageResponse.model_validate(m) for m in messages]
