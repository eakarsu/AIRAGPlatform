"""Custom Views API - RAG-specific custom feature endpoints.

Provides 4 endpoints to support the frontend custom RAG views:
  - GET  /api/custom-views/query-latency      -> VIZ: query latency time-series chart
  - GET  /api/custom-views/relevance-heatmap  -> VIZ: query x source retrieval relevance heatmap
  - GET  /api/custom-views/audit-log-pdf      -> NON-VIZ: RAG audit log exported as PDF
  - GET/POST/PUT/DELETE /api/custom-views/retrieval-rules
                                              -> NON-VIZ: CRUD retrieval rules (chunk size, top-k, reranking)
"""
import io
import math
import random
import time
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/custom-views", tags=["custom-views"])


# ----------------------------------------------------------------------
# In-memory store for retrieval rules (synthesized persistence)
# ----------------------------------------------------------------------
_RETRIEVAL_RULES: Dict[int, Dict[str, Any]] = {}
_RULES_NEXT_ID = {"id": 1}


def _seed_rules():
    if _RETRIEVAL_RULES:
        return
    seeds = [
        {
            "name": "Default QA",
            "chunk_size": 512,
            "top_k": 5,
            "reranking": "cross-encoder",
            "description": "Default retrieval rule for question-answering flows.",
        },
        {
            "name": "Long-Form Summarization",
            "chunk_size": 1024,
            "top_k": 12,
            "reranking": "none",
            "description": "Larger chunks for collection-level summarization.",
        },
        {
            "name": "Precise Lookup",
            "chunk_size": 256,
            "top_k": 3,
            "reranking": "cohere-rerank",
            "description": "Small chunks + aggressive reranking for citation precision.",
        },
    ]
    for s in seeds:
        rid = _RULES_NEXT_ID["id"]
        _RULES_NEXT_ID["id"] += 1
        _RETRIEVAL_RULES[rid] = {"id": rid, **s}


_seed_rules()


# ----------------------------------------------------------------------
# VIZ 1: Query latency time series
# ----------------------------------------------------------------------
@router.get("/query-latency")
def query_latency(points: int = 24):
    """Return a synthesized query-latency time series (p50 / p95 / p99) over recent windows."""
    random.seed(11)
    series = []
    for i in range(points):
        base = 140 + 40 * math.sin(i / 3.0)
        p50 = max(40.0, base + random.uniform(-25, 25))
        p95 = p50 + random.uniform(80, 200)
        p99 = p95 + random.uniform(40, 180)
        series.append({
            "window": f"T-{points - i}",
            "p50_ms": round(p50, 1),
            "p95_ms": round(p95, 1),
            "p99_ms": round(p99, 1),
            "qps": round(2.0 + random.uniform(0, 6.5), 2),
        })
    return {
        "points": points,
        "unit": "ms",
        "metric": "rag_query_latency",
        "series": series,
    }


# ----------------------------------------------------------------------
# VIZ 2: Retrieval relevance heatmap (query x source)
# ----------------------------------------------------------------------
@router.get("/relevance-heatmap")
def relevance_heatmap():
    """Return synthesized retrieval relevance scores for queries x sources."""
    random.seed(23)
    queries = [
        "billing refund policy",
        "api rate limits",
        "embedding model choice",
        "deployment on aws",
        "fine-tuning workflow",
        "vector db comparison",
        "auth token rotation",
        "compliance soc2",
    ]
    sources = [
        "Product Docs",
        "Engineering Wiki",
        "Support KB",
        "Marketing Site",
        "Research Papers",
        "Internal Runbooks",
    ]
    cells = []
    for qi, q in enumerate(queries):
        for si, s in enumerate(sources):
            # bias each query toward a different source
            bias = 1.0 if (qi % len(sources)) == si else 0.0
            score = max(0.0, min(1.0, 0.35 + 0.45 * bias + random.uniform(-0.18, 0.18)))
            cells.append({
                "query": q,
                "source": s,
                "score": round(score, 4),
            })
    return {
        "queries": queries,
        "sources": sources,
        "cells": cells,
        "metric": "cosine_relevance",
    }


# ----------------------------------------------------------------------
# NON-VIZ 1: RAG audit log PDF export
# ----------------------------------------------------------------------
def _build_pdf(lines: List[str]) -> bytes:
    """Build a minimal valid 1-page PDF document containing the given text lines."""
    # Build the content stream
    content_lines = ["BT", "/F1 11 Tf", "1 0 0 1 50 780 Tm", "14 TL"]
    for ln in lines:
        # Escape special PDF chars
        safe = ln.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_lines.append(f"({safe}) Tj")
        content_lines.append("T*")
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1", errors="replace")

    objects = []
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    objects.append(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>")
    objects.append(
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"
    )
    objects.append(
        ("<< /Length " + str(len(stream)) + " >>\nstream\n").encode("latin-1")
        + stream
        + b"\nendstream"
    )
    objects.append(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode("latin-1"))
        out.write(obj)
        out.write(b"\nendobj\n")
    xref_pos = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    out.write(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        out.write(f"{off:010d} 00000 n \n".encode("latin-1"))
    out.write(b"trailer\n")
    out.write(f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode("latin-1"))
    out.write(b"startxref\n")
    out.write(f"{xref_pos}\n".encode("latin-1"))
    out.write(b"%%EOF\n")
    return out.getvalue()


@router.get("/audit-log-pdf")
def audit_log_pdf(limit: int = 20):
    """Export a RAG audit log of recent queries and retrievals as a PDF document."""
    random.seed(int(time.time()) // 60)  # rotates per minute for freshness
    users = ["demo@airag.com", "admin@airag.com", "alice@airag.com", "bob@airag.com"]
    queries = [
        "billing refund policy",
        "api rate limits",
        "embedding model choice",
        "deployment on aws",
        "fine-tuning workflow",
        "vector db comparison",
        "auth token rotation",
        "compliance soc2",
    ]
    sources = ["Product Docs", "Engineering Wiki", "Support KB", "Research Papers"]

    lines = [
        "RAG Audit Log",
        "AI RAG Platform - Custom Views Export",
        f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}",
        f"Records: {limit}",
        "",
        "Time                 User                   Query                          Top-Source        Score",
        "-" * 110,
    ]
    now = int(time.time())
    for i in range(limit):
        ts = time.strftime("%Y-%m-%d %H:%M:%S", time.gmtime(now - (i * 137)))
        u = users[i % len(users)]
        q = queries[i % len(queries)]
        src = sources[i % len(sources)]
        score = round(0.55 + random.uniform(-0.2, 0.4), 3)
        lines.append(f"{ts}  {u:<22}  {q:<30}  {src:<16}  {score}")

    pdf_bytes = _build_pdf(lines)
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="rag_audit_log.pdf"'},
    )


# ----------------------------------------------------------------------
# NON-VIZ 2: Retrieval rules CRUD (chunk_size, top_k, reranking)
# ----------------------------------------------------------------------
_VALID_RERANK = {"none", "cross-encoder", "cohere-rerank", "mmr"}


def _validate_rule(payload: Dict[str, Any], partial: bool = False) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    if "name" in payload:
        name = str(payload["name"]).strip()
        if not name:
            raise HTTPException(status_code=400, detail="name cannot be empty")
        out["name"] = name
    elif not partial:
        raise HTTPException(status_code=400, detail="name required")

    if "chunk_size" in payload:
        try:
            cs = int(payload["chunk_size"])
        except Exception:
            raise HTTPException(status_code=400, detail="chunk_size must be int")
        if cs < 32 or cs > 8192:
            raise HTTPException(status_code=400, detail="chunk_size out of range [32, 8192]")
        out["chunk_size"] = cs

    if "top_k" in payload:
        try:
            tk = int(payload["top_k"])
        except Exception:
            raise HTTPException(status_code=400, detail="top_k must be int")
        if tk < 1 or tk > 100:
            raise HTTPException(status_code=400, detail="top_k out of range [1, 100]")
        out["top_k"] = tk

    if "reranking" in payload:
        rr = str(payload["reranking"]).strip()
        if rr not in _VALID_RERANK:
            raise HTTPException(
                status_code=400,
                detail=f"reranking must be one of {sorted(_VALID_RERANK)}",
            )
        out["reranking"] = rr

    if "description" in payload:
        out["description"] = str(payload["description"])

    return out


@router.get("/retrieval-rules")
def list_retrieval_rules():
    return list(_RETRIEVAL_RULES.values())


@router.post("/retrieval-rules")
def create_retrieval_rule(payload: Dict[str, Any]):
    validated = _validate_rule(payload, partial=False)
    rid = _RULES_NEXT_ID["id"]
    _RULES_NEXT_ID["id"] += 1
    rule = {
        "id": rid,
        "name": validated["name"],
        "chunk_size": validated.get("chunk_size", 512),
        "top_k": validated.get("top_k", 5),
        "reranking": validated.get("reranking", "none"),
        "description": validated.get("description", ""),
    }
    _RETRIEVAL_RULES[rid] = rule
    return rule


@router.put("/retrieval-rules/{rule_id}")
def update_retrieval_rule(rule_id: int, payload: Dict[str, Any]):
    rule = _RETRIEVAL_RULES.get(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="rule not found")
    validated = _validate_rule(payload, partial=True)
    rule.update(validated)
    _RETRIEVAL_RULES[rule_id] = rule
    return rule


@router.delete("/retrieval-rules/{rule_id}")
def delete_retrieval_rule(rule_id: int):
    if rule_id not in _RETRIEVAL_RULES:
        raise HTTPException(status_code=404, detail="rule not found")
    del _RETRIEVAL_RULES[rule_id]
    return {"deleted": rule_id}
