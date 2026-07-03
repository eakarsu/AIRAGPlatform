from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.database_models import KnowledgeChunk, Document, User
from models.schemas import KnowledgeChunkResponse, KnowledgeChunkCreate, KnowledgeChunkUpdate
from services.embedding_service import embed_texts
from services import vector_store
from routers.auth import get_optional_user
from services.workspace_access import can_access_document, document_scope_filter, normalize_workspace_id

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


def chunk_to_response(chunk: KnowledgeChunk, db: Session) -> dict:
    doc = db.query(Document).filter(Document.id == chunk.document_id).first()
    return {
        "id": chunk.id,
        "document_id": chunk.document_id,
        "document_title": doc.title if doc else "Unknown",
        "chunk_text": chunk.chunk_text,
        "chunk_index": chunk.chunk_index,
        "tokens": chunk.tokens or 0,
        "created_at": chunk.created_at,
    }


def assert_chunk_access(db: Session, user: User | None, chunk: KnowledgeChunk, workspace_id=None):
    doc = db.query(Document).filter(Document.id == chunk.document_id).first()
    if not can_access_document(db, user, doc, workspace_id):
        raise HTTPException(status_code=403, detail="You do not have access to this chunk")
    return doc


@router.get("/", response_model=list[KnowledgeChunkResponse])
def list_chunks(
    document_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
    active_workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
):
    workspace_id = normalize_workspace_id(active_workspace_id)
    query = db.query(KnowledgeChunk).join(Document, Document.id == KnowledgeChunk.document_id)
    if document_id:
        query = query.filter(KnowledgeChunk.document_id == document_id)
    query = query.filter(document_scope_filter(db, current_user, workspace_id))
    chunks = query.order_by(KnowledgeChunk.id.desc()).limit(200).all()
    return [KnowledgeChunkResponse(**chunk_to_response(c, db)) for c in chunks]


@router.get("/{chunk_id}", response_model=KnowledgeChunkResponse)
def get_chunk(
    chunk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
    active_workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
):
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    assert_chunk_access(db, current_user, chunk, normalize_workspace_id(active_workspace_id))
    return KnowledgeChunkResponse(**chunk_to_response(chunk, db))


@router.post("/", response_model=KnowledgeChunkResponse)
def create_chunk(
    data: KnowledgeChunkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
    active_workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
):
    doc = db.query(Document).filter(Document.id == data.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not can_access_document(db, current_user, doc, normalize_workspace_id(active_workspace_id)):
        raise HTTPException(status_code=403, detail="You do not have access to this document")

    chunk = KnowledgeChunk(
        document_id=data.document_id,
        chunk_text=data.chunk_text,
        chunk_index=data.chunk_index,
        tokens=len(data.chunk_text.split()),
    )
    db.add(chunk)
    db.commit()
    db.refresh(chunk)
    return KnowledgeChunkResponse(**chunk_to_response(chunk, db))


@router.put("/{chunk_id}", response_model=KnowledgeChunkResponse)
def update_chunk(
    chunk_id: int,
    data: KnowledgeChunkUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
    active_workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
):
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    assert_chunk_access(db, current_user, chunk, normalize_workspace_id(active_workspace_id))

    if data.chunk_text is not None:
        chunk.chunk_text = data.chunk_text
        chunk.tokens = len(data.chunk_text.split())

    db.commit()
    db.refresh(chunk)

    # Re-embed the updated chunk in vector store to prevent desync
    if data.chunk_text is not None:
        try:
            new_embeddings = embed_texts([chunk.chunk_text])
            chroma_id = f"doc{chunk.document_id}_chunk{chunk.id}"
            collection = vector_store.get_collection()
            collection.update(
                ids=[chroma_id],
                embeddings=new_embeddings,
                documents=[chunk.chunk_text],
                metadatas=[{"document_id": chunk.document_id, "chunk_id": chunk.id, "chunk_index": chunk.chunk_index}],
            )
        except Exception:
            pass  # Vector store update failure is non-fatal

    return KnowledgeChunkResponse(**chunk_to_response(chunk, db))


@router.delete("/{chunk_id}")
def delete_chunk(
    chunk_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_optional_user),
    active_workspace_id: str | None = Header(default=None, alias="X-Workspace-ID"),
):
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    assert_chunk_access(db, current_user, chunk, normalize_workspace_id(active_workspace_id))
    db.delete(chunk)
    db.commit()
    return {"message": "Chunk deleted successfully"}
