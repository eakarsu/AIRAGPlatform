from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.database_models import Favorite
from models.schemas import FavoriteCreate, FavoriteUpdate, FavoriteResponse

router = APIRouter(prefix="/api/favorites", tags=["favorites"])


@router.get("/", response_model=list[FavoriteResponse])
def list_favorites(entity_type: str = None, db: Session = Depends(get_db)):
    query = db.query(Favorite)
    if entity_type:
        query = query.filter(Favorite.entity_type == entity_type)
    favs = query.order_by(Favorite.created_at.desc()).all()
    return [FavoriteResponse.model_validate(f) for f in favs]


@router.get("/{fav_id}", response_model=FavoriteResponse)
def get_favorite(fav_id: int, db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.id == fav_id).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return FavoriteResponse.model_validate(fav)


@router.post("/", response_model=FavoriteResponse)
def create_favorite(data: FavoriteCreate, db: Session = Depends(get_db)):
    existing = db.query(Favorite).filter(
        Favorite.entity_type == data.entity_type,
        Favorite.entity_id == data.entity_id,
        Favorite.user_id == 1,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already in favorites")
    fav = Favorite(
        user_id=1,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        entity_name=data.entity_name,
        note=data.note,
    )
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return FavoriteResponse.model_validate(fav)


@router.put("/{fav_id}", response_model=FavoriteResponse)
def update_favorite(fav_id: int, data: FavoriteUpdate, db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.id == fav_id).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    if data.note is not None:
        fav.note = data.note
    db.commit()
    db.refresh(fav)
    return FavoriteResponse.model_validate(fav)


@router.delete("/{fav_id}")
def delete_favorite(fav_id: int, db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(Favorite.id == fav_id).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(fav)
    db.commit()
    return {"message": "Favorite removed successfully"}


@router.get("/check/{entity_type}/{entity_id}")
def check_favorite(entity_type: str, entity_id: int, db: Session = Depends(get_db)):
    fav = db.query(Favorite).filter(
        Favorite.entity_type == entity_type,
        Favorite.entity_id == entity_id,
        Favorite.user_id == 1,
    ).first()
    return {"is_favorite": fav is not None, "favorite_id": fav.id if fav else None}
