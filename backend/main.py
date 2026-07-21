import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from routers import auth, documents, chat, knowledge, ai_features, tags, prompts, activity, favorites, users
from routers import workspaces, analytics
from routers import platform_ops
from routers import system_chat
from routers import governance
from database import create_tables

limiter = Limiter(key_func=get_remote_address, default_limits=["200/hour"])

app = FastAPI(
    title="AI RAG Platform",
    description="AI-powered document knowledge base with RAG",
    version="1.0.0",
)


@app.on_event("startup")
def initialize_schema():
    create_tables()

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

CLIENT_URL = os.environ.get("CLIENT_URL", "http://localhost:3056")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        CLIENT_URL,
        "http://localhost:3056",
        "http://127.0.0.1:3056",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
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
app.include_router(platform_ops.router)
app.include_router(system_chat.router)
app.include_router(governance.router)

if os.environ.get("ENABLE_GENERATED_ROUTES") == "true" and os.environ.get("ENVIRONMENT") != "production":
    from routers import cf_custom_ai_features
    app.include_router(cf_custom_ai_features.router)


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "message": "AI RAG Platform is running"}

# AI feature mount: multi-source-rag
if os.environ.get("ENABLE_GENERATED_ROUTES") == "true" and os.environ.get("ENVIRONMENT") != "production":
    from routers import ai_multi_source_rag
    app.include_router(ai_multi_source_rag.router, prefix='/ai', tags=['ai-multi-source-rag'])

# === Custom Views (RAG Views) ===
from routers import custom_views as _custom_views
app.include_router(_custom_views.router)
# === End Custom Views ===
