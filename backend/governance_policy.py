import hashlib
import json
import re

KEY = re.compile(r"^[A-Za-z0-9._:-]{12,160}$")
SHA = re.compile(r"^[a-fA-F0-9]{64}$")

def canonical_digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()

def contains_secret(value):
    if isinstance(value, dict):
        return any(re.search(r"password|secret|token|private.?key", str(k), re.I) or contains_secret(v) for k, v in value.items())
    if isinstance(value, list):
        return any(contains_secret(v) for v in value)
    return False

def evaluate(data):
    errors = []
    collection = data.get("collection", {})
    if not collection.get("id") or not collection.get("permissionVersion") or not collection.get("retentionDays"):
        errors.append("scoped collection permissions and retention required")
    source_ids = set()
    for source in data.get("sources", []):
        sid = str(source.get("id", ""))
        if not sid or sid in source_ids or not source.get("version") or not SHA.match(source.get("sha256", "")) or not source.get("capturedAt") or not source.get("rightsBasis") or not isinstance(source.get("allowedRoles"), list):
            errors.append("source provenance or permissions invalid")
        source_ids.add(sid)
    for chunk in data.get("chunks", []):
        if str(chunk.get("sourceId", "")) not in source_ids or not chunk.get("sourceVersion") or not chunk.get("span") or not chunk.get("embeddingVersion") or chunk.get("deleted"):
            errors.append("chunk/version/deletion state invalid")
    for citation in data.get("citations", []):
        if str(citation.get("sourceId", "")) not in source_ids or not citation.get("sourceVersion") or not citation.get("span") or citation.get("resolved") is not True:
            errors.append("citation does not resolve")
    answer = data.get("answer", {})
    if not answer.get("text") or any(not c.get("citationId") for c in answer.get("claims", [])):
        errors.append("answer claims require citations")
    if answer.get("evidenceSufficient") is not True and answer.get("abstained") is not True:
        errors.append("insufficient evidence requires abstention")
    job = data.get("ingestionJob", {})
    if not job.get("id") or not job.get("cursor") or job.get("status") not in {"queued", "parsing", "indexing", "completed"} or not job.get("objectRef") or not job.get("dedupeKey"):
        errors.append("resumable ingestion job invalid")
    validation = data.get("validation", {})
    for key in ("datasetVersion", "retrievalRecall", "faithfulness", "citationResolution", "freshness"):
        if validation.get(key) is None:
            errors.append(f"validation {key} required")
    if validation.get("conflictCasesPassed") is not True or validation.get("injectionCasesPassed") is not True or validation.get("deletedContentExcluded") is not True:
        errors.append("conflict, injection, and deletion evaluation required")
    return {"errors": errors, "result": {"sourceCount": len(source_ids), "disposition": "revise" if errors else "grounded"}, "uncertainty": {"abstentionSupported": True}}
