import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.database_models import Document, KnowledgeChunk, User, DocumentEvent
from models.schemas import DocumentResponse, DocumentUpdate
from services.document_processor import extract_text, chunk_text, get_file_type
from services.embedding_service import embed_texts
from services import vector_store
from config import settings
from routers.auth import get_current_user, get_optional_user

router = APIRouter(prefix="/api/documents", tags=["documents"])


def doc_to_response(doc: Document, db: Session) -> dict:
    chunk_count = db.query(func.count(KnowledgeChunk.id)).filter(
        KnowledgeChunk.document_id == doc.id
    ).scalar()
    return {
        "id": doc.id,
        "title": doc.title,
        "filename": doc.filename,
        "file_type": doc.file_type,
        "content": doc.content,
        "file_size": doc.file_size,
        "status": doc.status,
        "user_id": doc.user_id,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "chunk_count": chunk_count,
    }


@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    file: UploadFile = File(...),
    title: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    # Log document event
    try:
        event = DocumentEvent(document_id=doc.id, user_id=current_user.id, event_type="upload")
        db.add(event)
        db.commit()
    except Exception:
        pass

    return DocumentResponse(**doc_to_response(doc, db))


@router.get("/", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    return [DocumentResponse(**doc_to_response(d, db)) for d in docs]


@router.get("/{doc_id}", response_model=DocumentResponse)
def get_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**doc_to_response(doc, db))


@router.put("/{doc_id}", response_model=DocumentResponse)
def update_document(doc_id: int, data: DocumentUpdate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if data.title is not None:
        doc.title = data.title
    if data.content is not None:
        doc.content = data.content

    db.commit()
    db.refresh(doc)
    return DocumentResponse(**doc_to_response(doc, db))


@router.delete("/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

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
