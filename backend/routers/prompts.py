from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.database_models import PromptTemplate
from models.schemas import PromptTemplateCreate, PromptTemplateUpdate, PromptTemplateResponse

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("/", response_model=list[PromptTemplateResponse])
def list_prompts(category: str = None, db: Session = Depends(get_db)):
    query = db.query(PromptTemplate)
    if category:
        query = query.filter(PromptTemplate.category == category)
    prompts = query.order_by(PromptTemplate.category, PromptTemplate.title).all()
    return [PromptTemplateResponse.model_validate(p) for p in prompts]


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(PromptTemplate.category).distinct().all()
    return [c[0] for c in cats if c[0]]


@router.get("/{prompt_id}", response_model=PromptTemplateResponse)
def get_prompt(prompt_id: int, db: Session = Depends(get_db)):
    p = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    return PromptTemplateResponse.model_validate(p)


@router.post("/", response_model=PromptTemplateResponse)
def create_prompt(data: PromptTemplateCreate, db: Session = Depends(get_db)):
    prompt = PromptTemplate(
        title=data.title,
        description=data.description,
        template_text=data.template_text,
        category=data.category or "General",
        is_active=data.is_active if data.is_active is not None else True,
        user_id=1,
    )
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return PromptTemplateResponse.model_validate(prompt)


@router.put("/{prompt_id}", response_model=PromptTemplateResponse)
def update_prompt(prompt_id: int, data: PromptTemplateUpdate, db: Session = Depends(get_db)):
    p = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    if data.title is not None:
        p.title = data.title
    if data.description is not None:
        p.description = data.description
    if data.template_text is not None:
        p.template_text = data.template_text
    if data.category is not None:
        p.category = data.category
    if data.is_active is not None:
        p.is_active = data.is_active
    db.commit()
    db.refresh(p)
    return PromptTemplateResponse.model_validate(p)


@router.delete("/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    p = db.query(PromptTemplate).filter(PromptTemplate.id == prompt_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Prompt template not found")
    db.delete(p)
    db.commit()
    return {"message": "Prompt template deleted successfully"}
