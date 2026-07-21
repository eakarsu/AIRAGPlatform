import os
import uuid
from fastapi import APIRouter, Depends, Header, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import get_db
from governance_policy import KEY, canonical_digest, contains_secret, evaluate
from routers.auth import verify_token

router = APIRouter(prefix="/api/governed-rag", tags=["governed-rag"])
bearer = HTTPBearer(auto_error=False)
APPROVERS = {"knowledge_reviewer", "privacy_officer", "admin"}
PROVIDERS = {"object-storage", "parser", "embedding-index", "repository", "webhook"}

def context(credentials: HTTPAuthorizationCredentials = Security(bearer)):
    payload = verify_token(credentials.credentials) if credentials else None
    if not payload or not payload.get("user_id") or not payload.get("tenantId") or not payload.get("role"):
        raise HTTPException(403, "signed actor, tenant, and role claims required")
    subjects = list(dict.fromkeys(str(value) for value in payload.get("subjectIds", []) if value))
    if payload["role"] in {"admin", "integration_worker", "privacy_officer", "data_owner"}: subjects.append("*")
    if not subjects: raise HTTPException(403, "signed subject scope required")
    return {"actor": str(payload["user_id"]), "tenant": payload["tenantId"], "role": payload["role"], "subjects": list(dict.fromkeys(subjects))}

def can_access(ctx, subject):
    return "*" in ctx["subjects"] or subject in ctx["subjects"]

def require_item_scope(item_id, ctx, db):
    row = db.execute(text("SELECT subject_id FROM governed_rag_work_items WHERE id=:id AND tenant_id=:t"), {"id": item_id, "t": ctx["tenant"]}).mappings().first()
    if not row or not can_access(ctx, row["subject_id"]): raise HTTPException(404, "not found")

@router.post("/work-items")
def create_work_item(body: dict, idempotency_key: str = Header(None, alias="Idempotency-Key"), ctx=Depends(context), db: Session = Depends(get_db)):
    if not idempotency_key or not KEY.match(idempotency_key): raise HTTPException(422, "valid Idempotency-Key required")
    subject = str(body.get("subjectId", "")).strip()
    if not KEY.match(subject) or not can_access(ctx, subject): raise HTTPException(403, "signed subject scope required")
    if contains_secret(body): raise HTTPException(422, "use secret references, not credentials")
    review = evaluate(body)
    if review["errors"]: raise HTTPException(422, review)
    digest = canonical_digest(body)
    row = db.execute(text("""INSERT INTO governed_rag_work_items(tenant_id,subject_id,input,result,uncertainty,created_by,idempotency_key,request_hash)
      VALUES(:t,:s,CAST(:i AS jsonb),CAST(:r AS jsonb),CAST(:u AS jsonb),:a,:k,:h)
      ON CONFLICT(tenant_id,idempotency_key) DO NOTHING RETURNING *"""), {"t":ctx["tenant"],"s":subject,"i":__import__('json').dumps(body),"r":__import__('json').dumps(review["result"]),"u":__import__('json').dumps(review["uncertainty"]),"a":ctx["actor"],"k":idempotency_key,"h":digest}).mappings().first()
    if not row:
        row = db.execute(text("SELECT * FROM governed_rag_work_items WHERE tenant_id=:t AND subject_id=:s AND idempotency_key=:k AND request_hash=:h"), {"t":ctx["tenant"],"s":subject,"k":idempotency_key,"h":digest}).mappings().first()
        if not row: raise HTTPException(409, "Idempotency-Key reused for different request")
    else:
        db.execute(text("INSERT INTO governed_rag_events(tenant_id,work_item_id,actor_id,event_type) VALUES(:t,:id,:a,'evaluated')"), {"t":ctx["tenant"],"id":row["id"],"a":ctx["actor"]})
    db.commit(); return dict(row)

@router.post("/work-items/{item_id}/submit")
def submit(item_id: int, body: dict, ctx=Depends(context), db: Session=Depends(get_db)):
    require_item_scope(item_id, ctx, db)
    row=db.execute(text("UPDATE governed_rag_work_items SET status='submitted',version=version+1 WHERE id=:id AND tenant_id=:t AND status='draft' AND version=:v RETURNING *"),{"id":item_id,"t":ctx["tenant"],"v":body.get("version")}).mappings().first()
    if not row: raise HTTPException(409,"stale or not draft")
    db.execute(text("INSERT INTO governed_rag_events(tenant_id,work_item_id,actor_id,event_type) VALUES(:t,:id,:a,'submitted')"),{"t":ctx["tenant"],"id":item_id,"a":ctx["actor"]});db.commit();return dict(row)

@router.post("/work-items/{item_id}/decision")
def decision(item_id:int,body:dict,ctx=Depends(context),db:Session=Depends(get_db)):
    require_item_scope(item_id, ctx, db)
    if ctx["role"] not in APPROVERS or body.get("decision") not in {"approved","rejected"} or not body.get("note"):raise HTTPException(403,"independent approver and decision note required")
    row=db.execute(text("UPDATE governed_rag_work_items SET status=:d,approved_by=:a,version=version+1 WHERE id=:id AND tenant_id=:t AND status='submitted' AND version=:v AND created_by<>:a RETURNING *"),{"d":body["decision"],"a":ctx["actor"],"id":item_id,"t":ctx["tenant"],"v":body.get("version")}).mappings().first()
    if not row:raise HTTPException(409,"stale or self-approval denied")
    db.execute(text("INSERT INTO governed_rag_events(tenant_id,work_item_id,actor_id,event_type,details) VALUES(:t,:id,:a,:d,jsonb_build_object('note',:n))"),{"t":ctx["tenant"],"id":item_id,"a":ctx["actor"],"d":body["decision"],"n":body["note"]});db.commit();return dict(row)

@router.post("/work-items/{item_id}/integrations")
def integration(item_id:int,body:dict,idempotency_key:str=Header(None,alias="Idempotency-Key"),ctx=Depends(context),db:Session=Depends(get_db)):
    require_item_scope(item_id, ctx, db)
    if body.get("provider") not in PROVIDERS or not idempotency_key or not KEY.match(idempotency_key):raise HTTPException(422,"allow-listed provider and idempotency required")
    digest=canonical_digest(body);row=db.execute(text("""INSERT INTO governed_rag_outbox(tenant_id,work_item_id,provider,operation,payload,idempotency_key,request_hash)
      SELECT tenant_id,id,:p,:o,CAST(:x AS jsonb),:k,:h FROM governed_rag_work_items WHERE id=:id AND tenant_id=:t AND status='approved'
      ON CONFLICT(tenant_id,provider,idempotency_key) DO NOTHING RETURNING *"""),{"p":body["provider"],"o":body.get("operation","synchronize"),"x":__import__('json').dumps(body.get("payload",{})),"k":idempotency_key,"h":digest,"id":item_id,"t":ctx["tenant"]}).mappings().first()
    if not row:raise HTTPException(409,"approved matching request required")
    db.commit();return dict(row)

@router.post("/integrations/claim")
def claim(ctx=Depends(context),db:Session=Depends(get_db)):
    if ctx["role"] not in {"integration_worker","admin"}:raise HTTPException(403,"worker role required")
    token=str(uuid.uuid4());row=db.execute(text("""WITH c AS (SELECT id FROM governed_rag_outbox WHERE tenant_id=:t AND attempts<5 AND ((status IN('queued','failed') AND next_attempt_at<=NOW()) OR(status='processing' AND lease_expires_at<NOW())) ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 1)
      UPDATE governed_rag_outbox o SET status='processing',claim_token=:c,lease_expires_at=NOW()+INTERVAL '2 minutes' FROM c WHERE o.id=c.id RETURNING o.*"""),{"t":ctx["tenant"],"c":token}).mappings().first();db.commit();return dict(row) if row else None

@router.post("/integrations/{outbox_id}/result")
def result(outbox_id:int,body:dict,claim_token:str=Header(None,alias="X-Claim-Token"),ctx=Depends(context),db:Session=Depends(get_db)):
    if ctx["role"] not in {"integration_worker","admin"} or body.get("status") not in {"delivered","failed"} or not claim_token:raise HTTPException(403,"worker claim and result required")
    row=db.execute(text("""UPDATE governed_rag_outbox SET status=CASE WHEN :s='delivered' THEN 'delivered' WHEN attempts+1>=5 THEN 'dead_letter' ELSE 'failed' END,attempts=attempts+1,last_error=:e,next_attempt_at=NOW()+INTERVAL '2 minutes',claim_token=NULL,lease_expires_at=NULL WHERE id=:id AND tenant_id=:t AND status='processing' AND claim_token=:c AND lease_expires_at>=NOW() RETURNING *"""),{"s":body["status"],"e":body.get("error"),"id":outbox_id,"t":ctx["tenant"],"c":claim_token}).mappings().first()
    if not row:raise HTTPException(409,"missing or expired claim")
    db.commit();return dict(row)
