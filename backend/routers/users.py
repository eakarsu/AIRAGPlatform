import bcrypt
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.database_models import User, Document, ChatSession, Favorite
from models.schemas import (
    UserManageResponse, UserManageUpdate, UserCreate, UserResponse,
    PasswordChange, SettingsResponse,
)
from routers.auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def user_to_response(user: User, db: Session) -> dict:
    doc_count = db.query(func.count(Document.id)).filter(Document.user_id == user.id).scalar()
    sess_count = db.query(func.count(ChatSession.id)).filter(ChatSession.user_id == user.id).scalar()
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role or "user",
        "is_active": user.is_active if user.is_active is not None else True,
        "created_at": user.created_at,
        "document_count": doc_count,
        "session_count": sess_count,
    }


# --- Settings (must come before /{user_id} routes) ---
@router.get("/settings/me", response_model=SettingsResponse)
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_docs = db.query(func.count(Document.id)).filter(Document.user_id == current_user.id).scalar()
    total_sess = db.query(func.count(ChatSession.id)).filter(ChatSession.user_id == current_user.id).scalar()
    total_favs = db.query(func.count(Favorite.id)).filter(Favorite.user_id == current_user.id).scalar()
    return SettingsResponse(
        id=current_user.id, email=current_user.email, name=current_user.name,
        role=current_user.role or "user",
        created_at=current_user.created_at,
        total_documents=total_docs, total_sessions=total_sess, total_favorites=total_favs,
    )


@router.put("/settings/me", response_model=UserResponse)
def update_settings(
    data: UserManageUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.name is not None:
        current_user.name = data.name
    if data.email is not None:
        current_user.email = data.email
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


@router.post("/settings/change-password")
def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# --- User CRUD ---
@router.get("/", response_model=list[UserManageResponse])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [UserManageResponse(**user_to_response(u, db)) for u in users]


@router.post("/", response_model=UserManageResponse)
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        role=data.role or "user",
        is_active=data.is_active if data.is_active is not None else True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserManageResponse(**user_to_response(user, db))


@router.get("/{user_id}", response_model=UserManageResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserManageResponse(**user_to_response(user, db))


@router.put("/{user_id}", response_model=UserManageResponse)
def update_user(user_id: int, data: UserManageUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.name is not None:
        user.name = data.name
    if data.email is not None:
        existing = db.query(User).filter(User.email == data.email, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        user.email = data.email
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.password is not None and data.password.strip():
        user.password_hash = hash_password(data.password)
    db.commit()
    db.refresh(user)
    return UserManageResponse(**user_to_response(user, db))


@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete the demo user")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully"}
