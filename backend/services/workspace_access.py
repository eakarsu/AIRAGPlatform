from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.database_models import Document, User, Workspace, WorkspaceMember


def user_workspace_ids(db: Session, user: User | None):
    if not user:
        return []
    owned = [row.id for row in db.query(Workspace.id).filter(Workspace.owner_id == user.id).all()]
    member = [row.workspace_id for row in db.query(WorkspaceMember.workspace_id).filter(WorkspaceMember.user_id == user.id).all()]
    return sorted(set(owned + member))


def normalize_workspace_id(workspace_id):
    if workspace_id in (None, "", "null", "undefined"):
        return None
    try:
        return int(workspace_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid workspace id")


def assert_workspace_access(db: Session, user: User | None, workspace_id):
    workspace_id = normalize_workspace_id(workspace_id)
    if workspace_id is not None and workspace_id not in user_workspace_ids(db, user):
        raise HTTPException(status_code=403, detail="You do not have access to this workspace")
    return workspace_id


def can_access_document(db: Session, user: User | None, doc: Document | None, workspace_id=None):
    if not doc:
        return False
    workspace_id = normalize_workspace_id(workspace_id)
    if workspace_id is not None:
        return doc.workspace_id == workspace_id and workspace_id in user_workspace_ids(db, user)
    if doc.workspace_id is None:
        return True
    return doc.workspace_id in user_workspace_ids(db, user)


def document_scope_filter(db: Session, user: User | None, workspace_id=None):
    workspace_id = normalize_workspace_id(workspace_id)
    if workspace_id is not None:
        assert_workspace_access(db, user, workspace_id)
        return Document.workspace_id == workspace_id
    if not user:
        return Document.workspace_id == None
    accessible_ids = user_workspace_ids(db, user)
    return or_(Document.workspace_id == None, Document.workspace_id.in_(accessible_ids))
