from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.database_models import Tag, DocumentTag, Document
from models.schemas import TagCreate, TagUpdate, TagResponse, DocumentTagCreate, DocumentTagResponse

router = APIRouter(prefix="/api/tags", tags=["tags"])


def tag_to_response(tag: Tag, db: Session) -> dict:
    doc_count = db.query(func.count(DocumentTag.id)).filter(DocumentTag.tag_id == tag.id).scalar()
    return {
        "id": tag.id,
        "name": tag.name,
        "color": tag.color,
        "description": tag.description,
        "document_count": doc_count,
        "created_at": tag.created_at,
    }


@router.get("/", response_model=list[TagResponse])
def list_tags(db: Session = Depends(get_db)):
    tags = db.query(Tag).order_by(Tag.name).all()
    return [TagResponse(**tag_to_response(t, db)) for t in tags]


@router.get("/{tag_id}", response_model=TagResponse)
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return TagResponse(**tag_to_response(tag, db))


@router.post("/", response_model=TagResponse)
def create_tag(data: TagCreate, db: Session = Depends(get_db)):
    existing = db.query(Tag).filter(Tag.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    tag = Tag(name=data.name, color=data.color or "#6366f1", description=data.description, user_id=1)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return TagResponse(**tag_to_response(tag, db))


@router.put("/{tag_id}", response_model=TagResponse)
def update_tag(tag_id: int, data: TagUpdate, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    if data.name is not None:
        tag.name = data.name
    if data.color is not None:
        tag.color = data.color
    if data.description is not None:
        tag.description = data.description
    db.commit()
    db.refresh(tag)
    return TagResponse(**tag_to_response(tag, db))


@router.delete("/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    db.delete(tag)
    db.commit()
    return {"message": "Tag deleted successfully"}


# --- Document-Tag Assignments ---
@router.get("/{tag_id}/documents", response_model=list[DocumentTagResponse])
def get_tag_documents(tag_id: int, db: Session = Depends(get_db)):
    links = db.query(DocumentTag).filter(DocumentTag.tag_id == tag_id).all()
    result = []
    for link in links:
        doc = db.query(Document).filter(Document.id == link.document_id).first()
        tag = db.query(Tag).filter(Tag.id == link.tag_id).first()
        result.append(DocumentTagResponse(
            id=link.id, document_id=link.document_id, tag_id=link.tag_id,
            document_title=doc.title if doc else None, tag_name=tag.name if tag else None,
            created_at=link.created_at,
        ))
    return result


@router.post("/assign", response_model=DocumentTagResponse)
def assign_tag(data: DocumentTagCreate, db: Session = Depends(get_db)):
    existing = db.query(DocumentTag).filter(
        DocumentTag.document_id == data.document_id,
        DocumentTag.tag_id == data.tag_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already assigned to this document")
    link = DocumentTag(document_id=data.document_id, tag_id=data.tag_id)
    db.add(link)
    db.commit()
    db.refresh(link)
    doc = db.query(Document).filter(Document.id == link.document_id).first()
    tag = db.query(Tag).filter(Tag.id == link.tag_id).first()
    return DocumentTagResponse(
        id=link.id, document_id=link.document_id, tag_id=link.tag_id,
        document_title=doc.title if doc else None, tag_name=tag.name if tag else None,
        created_at=link.created_at,
    )


@router.delete("/assign/{link_id}")
def unassign_tag(link_id: int, db: Session = Depends(get_db)):
    link = db.query(DocumentTag).filter(DocumentTag.id == link_id).first()
    if not link:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(link)
    db.commit()
    return {"message": "Tag unassigned successfully"}
