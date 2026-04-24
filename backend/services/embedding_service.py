from sentence_transformers import SentenceTransformer
from config import settings

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    model = get_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


def embed_query(text: str) -> list[float]:
    model = get_model()
    embedding = model.encode(text, show_progress_bar=False)
    return embedding.tolist()
