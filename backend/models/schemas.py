from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# --- Auth ---
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: Optional[str] = "user"
    is_active: Optional[bool] = True


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: Optional[str] = "user"
    is_active: Optional[bool] = True
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Documents ---
class DocumentCreate(BaseModel):
    title: str
    content: Optional[str] = None


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    file_type: str
    content: Optional[str] = None
    file_size: int
    status: str
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    chunk_count: Optional[int] = 0

    model_config = {"from_attributes": True}


# --- Chat ---
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None


class ChatMessageResponse(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    sources: Optional[list] = None
    model_used: Optional[str] = None
    response_time: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatResponse(BaseModel):
    message: ChatMessageResponse
    session_id: int


class ChatSessionCreate(BaseModel):
    title: str


class ChatSessionUpdate(BaseModel):
    title: str


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    user_id: Optional[int] = None
    message_count: Optional[int] = 0
    last_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Knowledge Chunks ---
class KnowledgeChunkCreate(BaseModel):
    document_id: int
    chunk_text: str
    chunk_index: Optional[int] = 0


class KnowledgeChunkUpdate(BaseModel):
    chunk_text: Optional[str] = None


class KnowledgeChunkResponse(BaseModel):
    id: int
    document_id: int
    document_title: Optional[str] = None
    chunk_text: str
    chunk_index: int
    tokens: int
    created_at: datetime

    model_config = {"from_attributes": True}


# --- AI Summaries ---
class AISummaryCreate(BaseModel):
    document_id: int


class AISummaryUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None


class AISummaryResponse(BaseModel):
    id: int
    document_id: int
    document_title: Optional[str] = None
    title: Optional[str] = None
    summary: str
    model_used: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Search ---
class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


class SearchResult(BaseModel):
    chunk_text: str
    document_title: str
    document_id: int
    chunk_id: int
    score: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    ai_answer: Optional[str] = None
    model_used: Optional[str] = None
    response_time: Optional[float] = None


# --- Tags ---
class TagCreate(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"
    description: Optional[str] = None


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    description: Optional[str] = None


class TagResponse(BaseModel):
    id: int
    name: str
    color: str
    description: Optional[str] = None
    document_count: Optional[int] = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentTagCreate(BaseModel):
    document_id: int
    tag_id: int


class DocumentTagResponse(BaseModel):
    id: int
    document_id: int
    tag_id: int
    document_title: Optional[str] = None
    tag_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Prompt Templates ---
class PromptTemplateCreate(BaseModel):
    title: str
    description: Optional[str] = None
    template_text: str
    category: Optional[str] = "General"
    is_active: Optional[bool] = True


class PromptTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    template_text: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None


class PromptTemplateResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    template_text: str
    category: str
    is_active: bool
    user_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Activity Log ---
class ActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    entity_name: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Favorites ---
class FavoriteCreate(BaseModel):
    entity_type: str
    entity_id: int
    entity_name: Optional[str] = None
    note: Optional[str] = None


class FavoriteUpdate(BaseModel):
    note: Optional[str] = None


class FavoriteResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    entity_type: str
    entity_id: int
    entity_name: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- User Management ---
class UserManageResponse(BaseModel):
    id: int
    email: str
    name: str
    role: Optional[str] = "user"
    is_active: Optional[bool] = True
    created_at: datetime
    document_count: Optional[int] = 0
    session_count: Optional[int] = 0

    model_config = {"from_attributes": True}


class UserManageUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


# --- Settings ---
class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class SettingsResponse(BaseModel):
    id: int
    email: str
    name: str
    role: Optional[str] = "user"
    created_at: datetime
    total_documents: int
    total_sessions: int
    total_favorites: int

    model_config = {"from_attributes": True}


# --- Analytics ---
class AnalyticsResponse(BaseModel):
    total_documents: int
    total_chunks: int
    total_sessions: int
    total_messages: int
    total_summaries: int
    total_users: int
    total_tags: int
    total_templates: int
    total_activities: int
    total_favorites: int
    recent_documents: List[DocumentResponse]
    recent_sessions: List[ChatSessionResponse]
