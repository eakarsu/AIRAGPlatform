import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models.database_models import Workspace, WorkspaceMember, User
from models.schemas import (
    WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse,
    WorkspaceMemberResponse, WorkspaceInviteRequest,
)
from routers.auth import get_current_user

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])


def make_slug(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:100]


def workspace_to_response(ws: Workspace, db: Session) -> dict:
    member_count = db.query(func.count(WorkspaceMember.id)).filter(
        WorkspaceMember.workspace_id == ws.id
    ).scalar()
    return {
        "id": ws.id,
        "name": ws.name,
        "description": ws.description,
        "owner_id": ws.owner_id,
        "slug": ws.slug,
        "is_active": ws.is_active,
        "member_count": member_count,
        "created_at": ws.created_at,
        "updated_at": ws.updated_at,
    }


@router.get("/", response_model=list[WorkspaceResponse])
def list_workspaces(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Return workspaces where user is owner or member
    owned = db.query(Workspace).filter(Workspace.owner_id == current_user.id)
    member_ws_ids = db.query(WorkspaceMember.workspace_id).filter(
        WorkspaceMember.user_id == current_user.id
    ).subquery()
    member_ws = db.query(Workspace).filter(Workspace.id.in_(member_ws_ids))
    all_ws = owned.union(member_ws).order_by(Workspace.created_at.desc()).all()
    return [WorkspaceResponse(**workspace_to_response(w, db)) for w in all_ws]


@router.post("/", response_model=WorkspaceResponse)
def create_workspace(
    data: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = data.slug or make_slug(data.name)
    # Ensure slug is unique
    existing = db.query(Workspace).filter(Workspace.slug == slug).first()
    if existing:
        slug = f"{slug}-{current_user.id}"

    ws = Workspace(
        name=data.name,
        description=data.description,
        owner_id=current_user.id,
        slug=slug,
    )
    db.add(ws)
    db.commit()
    db.refresh(ws)

    # Add owner as member
    member = WorkspaceMember(
        workspace_id=ws.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    db.commit()

    return WorkspaceResponse(**workspace_to_response(ws, db))


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return WorkspaceResponse(**workspace_to_response(ws, db))


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: int,
    data: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can update it")

    if data.name is not None:
        ws.name = data.name
    if data.description is not None:
        ws.description = data.description
    if data.is_active is not None:
        ws.is_active = data.is_active

    db.commit()
    db.refresh(ws)
    return WorkspaceResponse(**workspace_to_response(ws, db))


@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the workspace owner can delete it")
    db.delete(ws)
    db.commit()
    return {"message": "Workspace deleted successfully"}


@router.get("/{workspace_id}/members", response_model=list[WorkspaceMemberResponse])
def list_members(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    members = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append(WorkspaceMemberResponse(
            id=m.id,
            workspace_id=m.workspace_id,
            user_id=m.user_id,
            role=m.role,
            user_email=user.email if user else None,
            user_name=user.name if user else None,
            created_at=m.created_at,
        ))
    return result


@router.post("/{workspace_id}/invite", response_model=WorkspaceMemberResponse)
def invite_member(
    workspace_id: int,
    data: WorkspaceInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Check invoker is owner or admin
    invoker_membership = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == current_user.id,
    ).first()
    if not invoker_membership or invoker_membership.role not in ("owner", "admin"):
        raise HTTPException(status_code=403, detail="Only owners and admins can invite members")

    # Check user exists
    user = db.query(User).filter(User.id == data.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check not already a member
    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == data.user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=data.user_id,
        role=data.role or "member",
        invited_by=current_user.id,
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return WorkspaceMemberResponse(
        id=member.id,
        workspace_id=member.workspace_id,
        user_id=member.user_id,
        role=member.role,
        user_email=user.email,
        user_name=user.name,
        created_at=member.created_at,
    )


@router.delete("/{workspace_id}/members/{user_id}")
def remove_member(
    workspace_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if ws.owner_id != current_user.id and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to remove this member")

    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()
    return {"message": "Member removed successfully"}
