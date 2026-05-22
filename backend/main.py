import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from database import create_tables
from routers import auth, documents, chat, knowledge, ai_features, tags, prompts, activity, favorites, users
from routers import workspaces, analytics

limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])

app = FastAPI(
    title="AI RAG Platform",
    description="AI-powered document knowledge base with RAG",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CLIENT_URL = os.environ.get("CLIENT_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CLIENT_URL, "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(ai_features.router)
app.include_router(tags.router)
app.include_router(prompts.router)
app.include_router(activity.router)
app.include_router(favorites.router)
app.include_router(users.router)
app.include_router(workspaces.router)
app.include_router(analytics.router)


@app.on_event("startup")
def startup():
    create_tables()


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "message": "AI RAG Platform is running"}

# AI feature mount: multi-source-rag
from routers import ai_multi_source_rag
app.include_router(ai_multi_source_rag.router, prefix='/ai', tags=['ai-multi-source-rag'])
# === Batch 07 Gaps & Frontend Mounts ===
from routers import gap_no_explicit_embed_ingestion_route_exposed as _b07_gap_no_explicit_embed_ingestion_route_exposed
app.include_router(_b07_gap_no_explicit_embed_ingestion_route_exposed.router)
from routers import gap_no_summarize_collectionlevel_overview as _b07_gap_no_summarize_collectionlevel_overview
app.include_router(_b07_gap_no_summarize_collectionlevel_overview.router)
from routers import gap_no_recommendsources_crossdocument_discovery as _b07_gap_no_recommendsources_crossdocument_discovery
app.include_router(_b07_gap_no_recommendsources_crossdocument_discovery.router)
from routers import gap_no_multisource_rag_apis_dbs_live_web as _b07_gap_no_multisource_rag_apis_dbs_live_web
app.include_router(_b07_gap_no_multisource_rag_apis_dbs_live_web.router)
from routers import gap_no_contradictiondetection_across_docs as _b07_gap_no_contradictiondetection_across_docs
app.include_router(_b07_gap_no_contradictiondetection_across_docs.router)
from routers import gap_no_citationprovenance_route as _b07_gap_no_citationprovenance_route
app.include_router(_b07_gap_no_citationprovenance_route.router)
from routers import gap_no_teamlevel_access_control_role_permissions as _b07_gap_no_teamlevel_access_control_role_permissions
app.include_router(_b07_gap_no_teamlevel_access_control_role_permissions.router)
from routers import gap_no_public_webhookintegration_system as _b07_gap_no_public_webhookintegration_system
app.include_router(_b07_gap_no_public_webhookintegration_system.router)
from routers import gap_no_bulk_import_s3_google_drive_sharepoint_co as _b07_gap_no_bulk_import_s3_google_drive_sharepoint_co
app.include_router(_b07_gap_no_bulk_import_s3_google_drive_sharepoint_co.router)
from routers import gap_no_notification_system as _b07_gap_no_notification_system
app.include_router(_b07_gap_no_notification_system.router)
from routers import gap_no_audit_log_of_who_queried_what as _b07_gap_no_audit_log_of_who_queried_what
app.include_router(_b07_gap_no_audit_log_of_who_queried_what.router)
from routers import gap_no_exportshare_workflow as _b07_gap_no_exportshare_workflow
app.include_router(_b07_gap_no_exportshare_workflow.router)
# === End Batch 07 ===

# === Custom Views (RAG Views) ===
from routers import custom_views as _custom_views
app.include_router(_custom_views.router)
# === End Custom Views ===
