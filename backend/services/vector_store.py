import chromadb
from config import settings
from pathlib import Path

_client = None
_collection = None

COLLECTION_NAME = "documents"


def get_client() -> chromadb.ClientAPI:
    global _client
    if _client is None:
        persist_dir = Path(settings.CHROMA_PERSIST_DIR)
        persist_dir.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(persist_dir))
    return _client


def get_collection() -> chromadb.Collection:
    global _collection
    if _collection is None:
        client = get_client()
        _collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def add_document(doc_id: int, chunks: list[str], embeddings: list[list[float]], chunk_ids: list[int]):
    collection = get_collection()
    ids = [f"doc{doc_id}_chunk{cid}" for cid in chunk_ids]
    metadatas = [{"document_id": doc_id, "chunk_id": cid, "chunk_index": i} for i, cid in enumerate(chunk_ids)]
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas,
    )


def query(embedding: list[float], top_k: int = 5) -> dict:
    collection = get_collection()
    count = collection.count()
    if count == 0:
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
    actual_k = min(top_k, count)
    results = collection.query(
        query_embeddings=[embedding],
        n_results=actual_k,
        include=["documents", "metadatas", "distances"],
    )
    return results


def delete_document(doc_id: int):
    collection = get_collection()
    all_data = collection.get(where={"document_id": doc_id})
    if all_data["ids"]:
        collection.delete(ids=all_data["ids"])


def get_collection_count() -> int:
    collection = get_collection()
    return collection.count()
