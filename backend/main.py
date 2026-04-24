from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_tables
from routers import auth, documents, chat, knowledge, ai_features, tags, prompts, activity, favorites, users

app = FastAPI(
    title="AI RAG Platform",
    description="AI-powered document knowledge base with RAG",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
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


@app.on_event("startup")
def startup():
    create_tables()


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "message": "AI RAG Platform is running"}
