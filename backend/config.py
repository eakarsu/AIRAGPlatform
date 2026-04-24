from pydantic_settings import BaseSettings
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/airagplatform"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "anthropic/claude-haiku-4.5"
    CHROMA_PERSIST_DIR: str = "./data/chroma"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200
    SECRET_KEY: str = "change-this-to-a-random-secret-key"
    UPLOAD_DIR: str = str(Path(__file__).resolve().parent / "uploads")

    model_config = {
        "env_file": str(ROOT_DIR / ".env"),
        "env_file_encoding": "utf-8",
    }


settings = Settings()
