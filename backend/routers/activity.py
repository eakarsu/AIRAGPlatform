from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.database_models import ActivityLog
from models.schemas import ActivityLogResponse

router = APIRouter(prefix="/api/activity", tags=["activity"])


@router.get("/", response_model=list[ActivityLogResponse])
def list_activities(
    action: str = None,
    entity_type: str = None,
    limit: int = 100,
    db: Session = Depends(get_db),
):
    query = db.query(ActivityLog)
    if action:
        query = query.filter(ActivityLog.action == action)
    if entity_type:
        query = query.filter(ActivityLog.entity_type == entity_type)
    logs = query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return [ActivityLogResponse.model_validate(log) for log in logs]


@router.get("/actions")
def list_action_types(db: Session = Depends(get_db)):
    actions = db.query(ActivityLog.action).distinct().all()
    return [a[0] for a in actions if a[0]]


@router.get("/{log_id}", response_model=ActivityLogResponse)
def get_activity(log_id: int, db: Session = Depends(get_db)):
    log = db.query(ActivityLog).filter(ActivityLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")
    return ActivityLogResponse.model_validate(log)


@router.delete("/{log_id}")
def delete_activity(log_id: int, db: Session = Depends(get_db)):
    log = db.query(ActivityLog).filter(ActivityLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Activity log not found")
    db.delete(log)
    db.commit()
    return {"message": "Activity log deleted successfully"}


@router.delete("/")
def clear_all_activities(db: Session = Depends(get_db)):
    db.query(ActivityLog).delete()
    db.commit()
    return {"message": "All activity logs cleared"}
