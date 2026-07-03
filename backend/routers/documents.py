import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.database_models import Document, KnowledgeChunk, User, DocumentEvent, Workspace
from models.schemas import DocumentEventResponse, DocumentResponse, DocumentUpdate
from services.document_processor import extract_text, chunk_text, get_file_type
from services.embedding_service import embed_texts
from services import vector_store
from services.workspace_access import assert_workspace_access, document_scope_filter
from config import settings
from routers.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/documents", tags=["documents"])


def doc_to_response(doc: Document, db: Session) -> dict:
    chunk_count = db.query(func.count(KnowledgeChunk.id)).filter(
        KnowledgeChunk.document_id == doc.id
    ).scalar()
    workspace = db.query(Workspace).filter(Workspace.id == doc.workspace_id).first() if doc.workspace_id else None
    return {
        "id": doc.id,
        "title": doc.title,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "content": doc.content,
        "file_size": doc.file_size,
        "status": doc.status,
        "user_id": doc.user_id,
        "workspace_id": doc.workspace_id,
        "workspace_name": workspace.name if workspace else None,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "chunk_count": chunk_count,
    }


def assert_document_access(db: Session, user: User | None, doc: Document):
    assert_workspace_access(db, user, doc.workspace_id)


def event_to_response(event: DocumentEvent, db: Session) -> dict:
    user = db.query(User).filter(User.id == event.user_id).first() if event.user_id else None
    return {
        "id": event.id,
        "document_id": event.document_id,
        "user_id": event.user_id,
        "user_name": user.name if user else None,
        "event_type": event.event_type,
        "metadata": event.event_metadata,
        "created_at": event.created_at,
    }


def record_document_event(db: Session, doc_id: int, user_id: int | None, event_type: str, metadata: dict | None = None):
    try:
        db.add(DocumentEvent(
            document_id=doc_id,
            user_id=user_id,
            event_type=event_type,
            event_metadata=metadata or {},
        ))
        db.commit()
    except Exception:
        db.rollback()


def rebuild_document_chunks(doc: Document, db: Session):
    db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == doc.id).delete()
    db.commit()

    chunks = chunk_text(doc.content or "")
    chunk_records = []
    for i, chunk in enumerate(chunks):
        chunk_records.append(KnowledgeChunk(
            document_id=doc.id,
            chunk_text=chunk,
            chunk_index=i,
            tokens=len(chunk.split()),
        ))

    if chunk_records:
        db.add_all(chunk_records)
        db.commit()
        for record in chunk_records:
            db.refresh(record)

    try:
        vector_store.delete_document(doc.id)
    except Exception:
        pass

    try:
        if chunks:
            embeddings = embed_texts(chunks)
            vector_store.add_document(doc.id, chunks, embeddings, [record.id for record in chunk_records])
        doc.status = "processed"
    except Exception:
        doc.status = "failed"

    db.commit()
    db.refresh(doc)
    return len(chunk_records)


@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    file: UploadFile = File(...),
    title: str = Form(None),
    workspace_id: int = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assert_workspace_access(db, current_user, workspace_id)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    file_type = get_file_type(file.filename)
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        content = extract_text(file_path, file_type)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")

    file_size = os.path.getsize(file_path)
    doc_title = title or os.path.splitext(file.filename)[0]

    doc = Document(
        title=doc_title,
        filename=file.filename,
        file_type=file_type,
        content=content,
        file_size=file_size,
        status="processing",
        user_id=current_user.id,
        workspace_id=workspace_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Chunk and embed
    chunks = chunk_text(content)
    if chunks:
        chunk_records = []
        for i, chunk in enumerate(chunks):
            cr = KnowledgeChunk(
                document_id=doc.id,
                chunk_text=chunk,
                chunk_index=i,
                tokens=len(chunk.split()),
            )
            chunk_records.append(cr)
        db.add_all(chunk_records)
        db.commit()

        # Refresh to get IDs
        for cr in chunk_records:
            db.refresh(cr)

        try:
            embeddings = embed_texts(chunks)
            chunk_ids = [cr.id for cr in chunk_records]
            vector_store.add_document(doc.id, chunks, embeddings, chunk_ids)
            doc.status = "processed"
        except Exception as e:
            # Mark document as failed if vector store errors
            doc.status = "failed"
        db.commit()
        db.refresh(doc)
    else:
        doc.status = "processed"
        db.commit()
        db.refresh(doc)

    record_document_event(db, doc.id, current_user.id, "upload", {
        "filename": doc.filename,
        "file_type": doc.file_type,
        "file_size": doc.file_size,
        "workspace_id": doc.workspace_id,
        "chunk_count": db.query(func.count(KnowledgeChunk.id)).filter(KnowledgeChunk.document_id == doc.id).scalar(),
        "status": doc.status,
    })

    return DocumentResponse(**doc_to_response(doc, db))


@router.get("/", response_model=list[DocumentResponse])
def list_documents(
    workspace_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    query = db.query(Document)
    if workspace_id is not None:
        assert_workspace_access(db, current_user, workspace_id)
        query = query.filter(Document.workspace_id == workspace_id)
    else:
        query = query.filter(document_scope_filter(db, current_user))
    docs = query.order_by(Document.created_at.desc()).all()
    return [DocumentResponse(**doc_to_response(d, db)) for d in docs]


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_document_access(db, current_user, doc)
    return DocumentResponse(**doc_to_response(doc, db))


@router.get("/{doc_id}/events", response_model=list[DocumentEventResponse])
def get_document_events(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_document_access(db, current_user, doc)
    events = db.query(DocumentEvent).filter(DocumentEvent.document_id == doc_id).order_by(DocumentEvent.created_at.desc()).all()
    return [DocumentEventResponse(**event_to_response(event, db)) for event in events]


@router.post("/{doc_id}/reindex", response_model=DocumentResponse)
def reindex_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_document_access(db, current_user, doc)
    chunk_count = rebuild_document_chunks(doc, db)
    record_document_event(db, doc.id, current_user.id if current_user else doc.user_id, "reindex", {
        "chunk_count": chunk_count,
        "status": doc.status,
    })
    return DocumentResponse(**doc_to_response(doc, db))


@router.put("/{doc_id}", response_model=DocumentResponse)
def update_document(
    doc_id: int,
    data: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    changed_fields = []
    if data.title is not None:
        doc.title = data.title
        changed_fields.append("title")
    if data.content is not None:
        doc.content = data.content
        changed_fields.append("content")
    if data.workspace_id is not None:
        assert_workspace_access(db, current_user, data.workspace_id)
        doc.workspace_id = data.workspace_id
        changed_fields.append("workspace_id")

    db.commit()
    db.refresh(doc)
    if changed_fields:
        record_document_event(db, doc.id, current_user.id if current_user else doc.user_id, "update", {
            "changed_fields": changed_fields,
            "requires_reindex": "content" in changed_fields,
        })
    return DocumentResponse(**doc_to_response(doc, db))


@router.delete("/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    assert_document_access(db, current_user, doc)

    # Remove from vector store
    try:
        vector_store.delete_document(doc_id)
    except Exception:
        pass

    # Remove uploaded file
    file_path = os.path.join(settings.UPLOAD_DIR, doc.filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted successfully"}
