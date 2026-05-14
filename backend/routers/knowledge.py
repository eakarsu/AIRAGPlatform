from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.database_models import KnowledgeChunk, Document
from models.schemas import KnowledgeChunkResponse, KnowledgeChunkCreate, KnowledgeChunkUpdate
from services.embedding_service import embed_texts
from services import vector_store

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


@router.get("/", response_model=list[KnowledgeChunkResponse])
def list_chunks(document_id: int = None, db: Session = Depends(get_db)):
    query = db.query(KnowledgeChunk)
    if document_id:
        query = query.filter(KnowledgeChunk.document_id == document_id)
    chunks = query.order_by(KnowledgeChunk.id.desc()).limit(200).all()
    return [KnowledgeChunkResponse(**chunk_to_response(c, db)) for c in chunks]


@router.get("/{chunk_id}", response_model=KnowledgeChunkResponse)
def get_chunk(chunk_id: int, db: Session = Depends(get_db)):
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    return KnowledgeChunkResponse(**chunk_to_response(chunk, db))


@router.post("/", response_model=KnowledgeChunkResponse)
def create_chunk(data: KnowledgeChunkCreate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == data.document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

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
def update_chunk(chunk_id: int, data: KnowledgeChunkUpdate, db: Session = Depends(get_db)):
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")

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
def delete_chunk(chunk_id: int, db: Session = Depends(get_db)):
    chunk = db.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk_id).first()
    if not chunk:
        raise HTTPException(status_code=404, detail="Chunk not found")
    db.delete(chunk)
    db.commit()
    return {"message": "Chunk deleted successfully"}
