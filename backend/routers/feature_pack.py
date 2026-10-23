"""Feature pack (wave 43B): authenticated tasks, search/filter, CSV/JSON export,
domain summaries over the caller's own tasks. Deterministic fallback only -
never imports or calls an AI provider."""
import csv, io, itertools
from fastapi import APIRouter, Depends, HTTPException, Query, Security
from fastapi.responses import PlainTextResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from routers.auth import verify_token

router = APIRouter(prefix="/api/feature-pack", tags=["feature-pack"])
_bearer = HTTPBearer(auto_error=False)
_store: dict[str, list[dict]] = {}
_seq = itertools.count(1)
FEATURES = ["document-coverage-summary", "ingestion-readiness-summary", "query-workload-summary"]

class TaskIn(BaseModel):
    title: str
    status: str = "open"
    priority: str = "medium"
    notes: str = ""
    done: bool = False
    estimate: float = 0

class TaskPatch(BaseModel):
    title: str | None = None
    status: str | None = None
    priority: str | None = None
    notes: str | None = None
    done: bool | None = None
    estimate: float | None = None

def _owner(credentials: HTTPAuthorizationCredentials = Security(_bearer)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = verify_token(credentials.credentials)
    if not payload or "user_id" not in payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return str(payload["user_id"])

def _list(owner: str): return _store.setdefault(owner, [])
def filter_tasks(rows, search="", status="", priority=""):
    out = list(rows)
    if search:
        s = search.lower(); out = [r for r in out if s in f"{r.get('title','')} {r.get('notes','')}".lower()]
    if status: out = [r for r in out if r.get("status") == status]
    if priority: out = [r for r in out if r.get("priority") == priority]
    return out

def to_csv(rows):
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["id","title","status","priority","notes","done","estimate"])
    for r in rows: w.writerow([r.get("id"), r.get("title"), r.get("status"), r.get("priority"), r.get("notes",""), r.get("done", False), r.get("estimate", 0)])
    return buf.getvalue()

def labelled_sections(t):
    return [{"label":"Title","value":t.get("title")},{"label":"Status","value":t.get("status")},{"label":"Priority","value":t.get("priority")},{"label":"Notes","value":t.get("notes","")},{"label":"Done","value":bool(t.get("done", False))},{"label":"Estimate (hours)","value":t.get("estimate", 0)}]

def fallback(feature, tasks):
    rows = list(tasks or [])
    open_n = len([r for r in rows if r.get("status") != "done"]); done_n = len([r for r in rows if r.get("status") == "done" or r.get("done")]); high = len([r for r in rows if r.get("priority") == "high"])
    return {"feature": feature, "aiGenerated": False, "label": "Deterministic fallback (no AI provider called)", "summary": f"{len(rows)} task(s): {open_n} open, {done_n} done, {high} high-priority.", "counts": {"total": len(rows), "open": open_n, "done": done_n, "highPriority": high}, "sections": [{"label":"Total tasks","value":len(rows)},{"label":"Open tasks","value":open_n},{"label":"Done tasks","value":done_n},{"label":"High-priority tasks","value":high},{"label":"Has open work","value":open_n>0},{"label":"Notes","value":""}], "tasks": [{"title": r.get("title"), "sections": labelled_sections(r)} for r in rows]}

@router.get("/tasks")
def list_tasks(search: str = "", status: str = "", priority: str = "", owner: str = Depends(_owner)):
    rows = filter_tasks(_list(owner), search, status, priority); return {"data": rows, "total": len(rows)}

@router.get("/tasks/export")
def export_tasks(format: str = Query("json"), search: str = "", status: str = "", priority: str = "", owner: str = Depends(_owner)):
    rows = filter_tasks(_list(owner), search, status, priority)
    if format.lower() == "csv": return PlainTextResponse(to_csv(rows), media_type="text/csv", headers={"Content-Disposition": 'attachment; filename="tasks.csv"'})
    if format.lower() != "json": raise HTTPException(status_code=400, detail="format must be json or csv")
    return {"data": rows}

@router.post("/tasks", status_code=201)
def create_task(body: TaskIn, owner: str = Depends(_owner)):
    if not body.title.strip(): raise HTTPException(status_code=400, detail="title is required")
    t = {"id": next(_seq), **body.model_dump()}; _list(owner).insert(0, t); return t

@router.put("/tasks/{task_id}")
def update_task(task_id: int, body: TaskPatch, owner: str = Depends(_owner)):
    for t in _list(owner):
        if t["id"] == task_id:
            t.update({k: v for k, v in body.model_dump().items() if v is not None}); return t
    raise HTTPException(status_code=404, detail="Task not found")

def _ai(feature, tasks, owner):
    return fallback(feature, tasks if tasks is not None else _list(owner))

@router.post("/ai/{feature}")
def ai_post(feature: str, body: dict | None = None, owner: str = Depends(_owner)):
    if feature not in FEATURES: raise HTTPException(status_code=404, detail="Unknown feature")
    return _ai(feature, (body or {}).get("tasks"), owner)

@router.get("/ai/{feature}")
def ai_get(feature: str, owner: str = Depends(_owner)):
    if feature not in FEATURES: raise HTTPException(status_code=404, detail="Unknown feature")
    return _ai(feature, None, owner)
