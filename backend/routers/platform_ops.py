from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
import time
import urllib.error
import urllib.request
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from config import settings

router = APIRouter(prefix="/api/platform-ops", tags=["platform-ops"])


def utcnow():
    return datetime.now(timezone.utc)


def iso(days=0):
    return (utcnow() + timedelta(days=days)).isoformat()


class ItemUpdate(BaseModel):
    data: dict


ACTION_GUIDANCE = {
    "Run sync check": "Review connector health, sync failures, permission inheritance risk, auth status, duplicate detection, and next sync actions.",
    "Validate evidence": "Check citation quality, evidence strength, stale source risk, permission status, weak claims, and audit readiness.",
    "Run job": "Explain monitoring findings, severity, owner accountability, remediation sequence, and escalation plan.",
    "Send test": "Validate notification routing, message template quality, escalation gaps, noisy alert risk, and delivery readiness.",
    "Review query": "Review audit risk, sensitive query exposure, source access, model usage, and recommended governance action.",
    "Run eval": "Interpret evaluation score, regression risk, failing cases, threshold gap, and model/retrieval improvement plan.",
    "Promote version": "Assess prompt readiness, rollout risk, canary status, rollback plan, and evaluation evidence.",
    "Analyze spend": "Find cost drivers, spend trend risk, token reduction options, caching opportunities, and expected savings.",
    "Review account": "Review tenant usage, renewal risk, overage, account health, billing contact readiness, and expansion or churn signals.",
    "Test config": "Check SSO/SCIM readiness, role mapping, MFA policy, provisioning risk, and identity rollout actions.",
}


def strip_json_fence(text: str) -> str:
    return (text or "").strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()


def mock_analysis(module_key: str, module: dict, item: dict) -> dict:
    action = module["primary_action"]
    label = item.get("name") or item.get("tenant") or item.get("query_id") or item.get("answer_id") or f"Record {item['id']}"
    risk_level = "medium"
    if any(str(value).lower() in {"warning", "paused", "review", "stale", "overage", "high", "critical"} for value in item.values()):
        risk_level = "high"
    elif any(str(value).lower() in {"healthy", "passing", "active", "enabled", "approved", "allowed"} for value in item.values()):
        risk_level = "low"
    return {
        "mock": True,
        "summary": f"{action} completed for {label}. OpenRouter is not configured, so this is a local structured fallback.",
        "findings": [
            {"area": module["title"], "finding": f"{label} was reviewed using available row context.", "severity": risk_level},
            {"area": "Operational readiness", "finding": ACTION_GUIDANCE.get(action, "Review operational readiness and next actions."), "severity": risk_level},
        ],
        "recommendations": [
            {"priority": 1, "action": item.get("next_action") or "Confirm owner and next action before rollout."},
            {"priority": 2, "action": "Validate permissions, audit trail, and escalation routing."},
            {"priority": 3, "action": "Re-run this check after remediation and compare status changes."},
        ],
        "risks": [
            {"risk": "Incomplete operating context", "impact": "Analysis may miss source-specific constraints.", "mitigation": "Connect live telemetry and audit history."},
        ],
        "assumptions": ["Analysis is based on the selected Platform Ops row.", "No live connector telemetry was fetched."],
        "follow_up_questions": ["Who owns final approval?", "What production incident or audit event triggered this review?"],
        "confidence": 0.74,
    }


def call_openrouter_analysis(module_key: str, module: dict, item: dict) -> dict:
    action = module["primary_action"]
    if not settings.OPENROUTER_API_KEY:
        return mock_analysis(module_key, module, item)

    prompt = {
        "module_key": module_key,
        "module_title": module["title"],
        "module_description": module["description"],
        "action": action,
        "analysis_goal": ACTION_GUIDANCE.get(action, "Review this operational row and recommend next actions."),
        "selected_row": item,
        "required_output": {
            "summary": "plain English executive summary",
            "findings": "array of finding objects with area, finding, severity, evidence",
            "recommendations": "array of priority/action/owner/timeline/rationale objects",
            "risks": "array of risk/impact/mitigation objects",
            "assumptions": "array of assumptions",
            "follow_up_questions": "array of questions",
            "confidence": "number from 0 to 1",
        },
    }
    body = json.dumps({
        "model": settings.OPENROUTER_MODEL or "anthropic/claude-haiku-4.5",
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are an enterprise RAG operations copilot. "
                    "Return strict JSON only. Do not use markdown fences. "
                    "Be specific to the selected Platform Ops row and action."
                ),
            },
            {"role": "user", "content": json.dumps(prompt)},
        ],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3056",
            "X-Title": "AIRAGPlatform Platform Ops",
        },
        method="POST",
    )
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
        content = payload["choices"][0]["message"]["content"]
        try:
            analysis = json.loads(strip_json_fence(content))
        except Exception:
            analysis = {"summary": content, "recommendations": [{"action": "Review raw AI response and retry if formatting is invalid."}]}
        analysis["model"] = payload.get("model")
        analysis["response_time"] = round(time.time() - start, 2)
        return analysis
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, TimeoutError) as exc:
        fallback = mock_analysis(module_key, module, item)
        fallback["error"] = str(exc)
        fallback["summary"] = f"OpenRouter call failed. Showing fallback analysis for {action}."
        return fallback


MODULES = {
    "connectors": {
        "title": "Connector Ingestion",
        "description": "Production connector inventory for S3, Google Drive, SharePoint, Slack, CRM, databases, and web sources.",
        "primary_action": "Run sync check",
        "columns": ["name", "source_type", "status", "owner", "last_sync", "documents_synced"],
        "items": [
            {"id": 1, "name": "Legal SharePoint Library", "source_type": "SharePoint", "status": "healthy", "owner": "Legal Ops", "last_sync": iso(-1), "documents_synced": 1240, "sync_frequency": "Hourly", "auth_mode": "OAuth", "next_action": "Validate permission inheritance"},
            {"id": 2, "name": "Customer Contracts S3", "source_type": "S3", "status": "warning", "owner": "Revenue Ops", "last_sync": iso(-2), "documents_synced": 876, "sync_frequency": "Every 4 hours", "auth_mode": "IAM role", "next_action": "Resolve duplicate object keys"},
            {"id": 3, "name": "Support Knowledge Drive", "source_type": "Google Drive", "status": "healthy", "owner": "Support", "last_sync": iso(0), "documents_synced": 643, "sync_frequency": "Hourly", "auth_mode": "OAuth", "next_action": "Add shortcut handling"},
            {"id": 4, "name": "Salesforce Account Notes", "source_type": "CRM API", "status": "healthy", "owner": "Sales Ops", "last_sync": iso(0), "documents_synced": 318, "sync_frequency": "15 minutes", "auth_mode": "Connected app", "next_action": "Map renewal fields"},
            {"id": 5, "name": "Billing Postgres Read Replica", "source_type": "Database", "status": "warning", "owner": "Finance Systems", "last_sync": iso(-1), "documents_synced": 92, "sync_frequency": "On demand", "auth_mode": "Service account", "next_action": "Restrict PII columns"},
            {"id": 6, "name": "Product Docs Website", "source_type": "Web crawler", "status": "healthy", "owner": "Product", "last_sync": iso(0), "documents_synced": 456, "sync_frequency": "Daily", "auth_mode": "Public", "next_action": "Enable canonical URL dedupe"},
            {"id": 7, "name": "Engineering Slack Archive", "source_type": "Slack", "status": "paused", "owner": "Engineering", "last_sync": iso(-9), "documents_synced": 0, "sync_frequency": "Paused", "auth_mode": "OAuth", "next_action": "Approve channel scopes"},
        ],
    },
    "provenance": {
        "title": "Citation Provenance",
        "description": "Answer-to-source evidence trails with chunk IDs, document versions, confidence, and permission checks.",
        "primary_action": "Validate evidence",
        "columns": ["answer_id", "claim", "document", "chunk_id", "confidence", "permission_status"],
        "items": [
            {"id": 1, "answer_id": "ANS-1042", "claim": "Data retention is 36 months", "document": "Security Addendum v4", "chunk_id": "KC-8831", "confidence": 0.94, "permission_status": "allowed", "version": "4.0", "source_excerpt": "Customer audit logs are retained for 36 months."},
            {"id": 2, "answer_id": "ANS-1043", "claim": "Premium support includes 24x7 response", "document": "Support SLA 2026", "chunk_id": "KC-7120", "confidence": 0.89, "permission_status": "allowed", "version": "2026.2", "source_excerpt": "Premium tier response coverage is 24x7 for Severity 1."},
            {"id": 3, "answer_id": "ANS-1044", "claim": "EU data residency is available", "document": "Regional Hosting FAQ", "chunk_id": "KC-6654", "confidence": 0.78, "permission_status": "review", "version": "1.7", "source_excerpt": "EU residency is available for enterprise plans."},
            {"id": 4, "answer_id": "ANS-1045", "claim": "SOC 2 report is current", "document": "Compliance Certifications", "chunk_id": "KC-5009", "confidence": 0.61, "permission_status": "stale", "version": "2025.4", "source_excerpt": "SOC 2 Type II report period ended Dec 2025."},
            {"id": 5, "answer_id": "ANS-1046", "claim": "Webhook retries continue for 24 hours", "document": "Webhook Developer Guide", "chunk_id": "KC-4402", "confidence": 0.92, "permission_status": "allowed", "version": "3.1", "source_excerpt": "Retries continue with backoff for 24 hours."},
        ],
    },
    "monitoring": {
        "title": "Monitoring Jobs",
        "description": "Background jobs for document freshness, connector health, citation drift, stale ownership, and ingestion failures.",
        "primary_action": "Run job",
        "columns": ["name", "status", "cadence", "owner", "last_run", "open_findings"],
        "items": [
            {"id": 1, "name": "Document freshness scan", "status": "healthy", "cadence": "Daily", "owner": "Knowledge Ops", "last_run": iso(0), "open_findings": 12, "result": "Found 12 stale documents older than 180 days."},
            {"id": 2, "name": "Connector failure sweep", "status": "warning", "cadence": "Hourly", "owner": "Platform", "last_run": iso(0), "open_findings": 3, "result": "S3 duplicate keys and Slack OAuth scopes need attention."},
            {"id": 3, "name": "Citation drift detector", "status": "healthy", "cadence": "Every 6 hours", "owner": "AI Governance", "last_run": iso(-1), "open_findings": 5, "result": "Five answers reference stale source versions."},
            {"id": 4, "name": "Ownerless document scan", "status": "warning", "cadence": "Daily", "owner": "Compliance", "last_run": iso(-1), "open_findings": 20, "result": "Inactive owners found in legal and support collections."},
            {"id": 5, "name": "Permission leak canary", "status": "healthy", "cadence": "Hourly", "owner": "Security", "last_run": iso(0), "open_findings": 0, "result": "No cross-workspace leakage detected."},
        ],
    },
    "notifications": {
        "title": "Notifications",
        "description": "Email, Slack, webhook, and in-app routing for review requests, failures, stale docs, and critical source changes.",
        "primary_action": "Send test",
        "columns": ["name", "channel", "severity", "status", "owner", "daily_volume"],
        "items": [
            {"id": 1, "name": "Critical source changed", "channel": "Slack + email", "severity": "critical", "status": "enabled", "owner": "Knowledge Ops", "daily_volume": 9, "template": "Critical document {{document}} changed and needs review."},
            {"id": 2, "name": "Failed ingestion job", "channel": "Slack", "severity": "high", "status": "enabled", "owner": "Platform", "daily_volume": 4, "template": "Ingestion failed for {{connector}}."},
            {"id": 3, "name": "Document review due", "channel": "Email", "severity": "medium", "status": "enabled", "owner": "Content Owners", "daily_volume": 31, "template": "{{document}} is due for review."},
            {"id": 4, "name": "Citation confidence low", "channel": "In-app", "severity": "medium", "status": "enabled", "owner": "AI Governance", "daily_volume": 17, "template": "Answer {{answer_id}} has weak citation support."},
            {"id": 5, "name": "Webhook delivery failed", "channel": "Webhook", "severity": "high", "status": "paused", "owner": "Integrations", "daily_volume": 0, "template": "Webhook delivery failed after retries."},
        ],
    },
    "query-audit": {
        "title": "Query Audit",
        "description": "Who asked what, which sources were retrieved, what model answered, and whether restricted content was involved.",
        "primary_action": "Review query",
        "columns": ["query_id", "user", "workspace", "risk_level", "sources_used", "model"],
        "items": [
            {"id": 1, "query_id": "QRY-9001", "user": "maya@company.com", "workspace": "Legal", "risk_level": "low", "sources_used": 6, "model": "anthropic/claude-haiku-4.5", "prompt": "Summarize renewal obligations for Acme."},
            {"id": 2, "query_id": "QRY-9002", "user": "alex@company.com", "workspace": "Security", "risk_level": "medium", "sources_used": 9, "model": "anthropic/claude-haiku-4.5", "prompt": "Which customers have EU residency language?"},
            {"id": 3, "query_id": "QRY-9003", "user": "sam@company.com", "workspace": "Sales", "risk_level": "high", "sources_used": 12, "model": "openai/gpt-4o-mini", "prompt": "Show restricted pricing exceptions."},
            {"id": 4, "query_id": "QRY-9004", "user": "nora@company.com", "workspace": "Support", "risk_level": "low", "sources_used": 4, "model": "anthropic/claude-haiku-4.5", "prompt": "Draft customer update for incident 241."},
            {"id": 5, "query_id": "QRY-9005", "user": "lee@company.com", "workspace": "Finance", "risk_level": "medium", "sources_used": 7, "model": "google/gemini-2.0-flash-001", "prompt": "Find billing terms for enterprise agreements."},
        ],
    },
    "evaluations": {
        "title": "Evaluation Suite",
        "description": "Answer quality, hallucination, citation accuracy, latency, and regression checks for RAG workflows.",
        "primary_action": "Run eval",
        "columns": ["name", "status", "score", "last_run", "dataset", "owner"],
        "items": [
            {"id": 1, "name": "Citation accuracy benchmark", "status": "passing", "score": 0.91, "last_run": iso(0), "dataset": "golden-citations-v3", "owner": "AI Governance", "threshold": 0.88},
            {"id": 2, "name": "Hallucination regression", "status": "warning", "score": 0.84, "last_run": iso(-1), "dataset": "unsupported-claims-v2", "owner": "AI Governance", "threshold": 0.90},
            {"id": 3, "name": "Retrieval recall", "status": "passing", "score": 0.87, "last_run": iso(0), "dataset": "support-qa-v5", "owner": "Search", "threshold": 0.82},
            {"id": 4, "name": "Latency budget", "status": "passing", "score": 0.95, "last_run": iso(0), "dataset": "production-sample", "owner": "Platform", "threshold": 0.90},
            {"id": 5, "name": "Permission enforcement", "status": "passing", "score": 0.99, "last_run": iso(-1), "dataset": "workspace-canary", "owner": "Security", "threshold": 0.98},
        ],
    },
    "prompt-versions": {
        "title": "Prompt Versions",
        "description": "Versioned prompt templates with approval status, rollout percentage, evaluation score, and rollback notes.",
        "primary_action": "Promote version",
        "columns": ["name", "version", "status", "rollout", "eval_score", "owner"],
        "items": [
            {"id": 1, "name": "Executive RAG answer", "version": "v4.2", "status": "approved", "rollout": "100%", "eval_score": 0.91, "owner": "AI Governance", "rollback": "v4.1"},
            {"id": 2, "name": "Citation validator", "version": "v2.8", "status": "canary", "rollout": "25%", "eval_score": 0.89, "owner": "AI Governance", "rollback": "v2.7"},
            {"id": 3, "name": "Contradiction detector", "version": "v1.9", "status": "review", "rollout": "0%", "eval_score": 0.86, "owner": "Knowledge Ops", "rollback": "v1.8"},
            {"id": 4, "name": "Connector triage", "version": "v3.0", "status": "approved", "rollout": "100%", "eval_score": 0.93, "owner": "Platform", "rollback": "v2.9"},
            {"id": 5, "name": "Customer report writer", "version": "v1.4", "status": "draft", "rollout": "0%", "eval_score": 0.78, "owner": "Sales Ops", "rollback": "v1.3"},
        ],
    },
    "cost-analytics": {
        "title": "Cost Analytics",
        "description": "Token spend, embedding cost, model mix, connector sync cost, and savings opportunities.",
        "primary_action": "Analyze spend",
        "columns": ["cost_center", "monthly_spend", "token_volume", "model_mix", "trend", "savings_opportunity"],
        "items": [
            {"id": 1, "cost_center": "Support RAG", "monthly_spend": "$2,430", "token_volume": "18.2M", "model_mix": "Claude Haiku 72%", "trend": "+8%", "savings_opportunity": "$410 via cache"},
            {"id": 2, "cost_center": "Legal Reviews", "monthly_spend": "$1,880", "token_volume": "9.4M", "model_mix": "Claude Sonnet 44%", "trend": "+18%", "savings_opportunity": "$280 via summarization"},
            {"id": 3, "cost_center": "Embeddings", "monthly_spend": "$920", "token_volume": "31.8M", "model_mix": "text-embedding", "trend": "-4%", "savings_opportunity": "$160 via dedupe"},
            {"id": 4, "cost_center": "Monitoring Jobs", "monthly_spend": "$640", "token_volume": "4.1M", "model_mix": "Gemini Flash 60%", "trend": "+3%", "savings_opportunity": "$95 via batching"},
            {"id": 5, "cost_center": "Sales Reports", "monthly_spend": "$1,120", "token_volume": "6.7M", "model_mix": "GPT-4o mini 80%", "trend": "+11%", "savings_opportunity": "$210 via templates"},
        ],
    },
    "tenant-billing": {
        "title": "Tenant Billing",
        "description": "Subscription tier, workspace quotas, overage tracking, billing contacts, and renewal health.",
        "primary_action": "Review account",
        "columns": ["tenant", "plan", "status", "monthly_value", "usage", "renewal_date"],
        "items": [
            {"id": 1, "tenant": "Acme Health", "plan": "Enterprise", "status": "active", "monthly_value": "$4,800", "usage": "82%", "renewal_date": iso(45), "billing_contact": "finance@acme.example"},
            {"id": 2, "tenant": "Northstar Legal", "plan": "Business", "status": "active", "monthly_value": "$1,900", "usage": "64%", "renewal_date": iso(90), "billing_contact": "ap@northstar.example"},
            {"id": 3, "tenant": "Vertex Manufacturing", "plan": "Enterprise", "status": "overage", "monthly_value": "$6,200", "usage": "117%", "renewal_date": iso(30), "billing_contact": "procurement@vertex.example"},
            {"id": 4, "tenant": "Helio SaaS", "plan": "Business", "status": "trial", "monthly_value": "$0", "usage": "39%", "renewal_date": iso(14), "billing_contact": "ops@helio.example"},
            {"id": 5, "tenant": "Cobalt Finance", "plan": "Enterprise", "status": "active", "monthly_value": "$5,400", "usage": "76%", "renewal_date": iso(120), "billing_contact": "vendor@cobalt.example"},
        ],
    },
    "sso-scim": {
        "title": "SSO / SCIM",
        "description": "Enterprise identity configuration, SAML metadata, SCIM provisioning, MFA policy, and role mapping.",
        "primary_action": "Test config",
        "columns": ["tenant", "provider", "sso_status", "scim_status", "mfa_policy", "last_test"],
        "items": [
            {"id": 1, "tenant": "Acme Health", "provider": "Okta", "sso_status": "healthy", "scim_status": "healthy", "mfa_policy": "required", "last_test": iso(0), "role_mapping": "Okta groups to workspace roles"},
            {"id": 2, "tenant": "Northstar Legal", "provider": "Azure AD", "sso_status": "healthy", "scim_status": "warning", "mfa_policy": "required", "last_test": iso(-2), "role_mapping": "Department claims to legal workspaces"},
            {"id": 3, "tenant": "Vertex Manufacturing", "provider": "Ping", "sso_status": "review", "scim_status": "not configured", "mfa_policy": "optional", "last_test": iso(-12), "role_mapping": "Manual role assignment"},
            {"id": 4, "tenant": "Helio SaaS", "provider": "Google Workspace", "sso_status": "setup", "scim_status": "setup", "mfa_policy": "required", "last_test": iso(-1), "role_mapping": "Google groups to teams"},
            {"id": 5, "tenant": "Cobalt Finance", "provider": "Okta", "sso_status": "healthy", "scim_status": "healthy", "mfa_policy": "required", "last_test": iso(0), "role_mapping": "Finance and audit groups"},
        ],
    },
}


def public_modules():
    return [
        {
            "key": key,
            "title": module["title"],
            "description": module["description"],
            "primary_action": module["primary_action"],
            "columns": module["columns"],
            "count": len(module["items"]),
            "attention": sum(1 for item in module["items"] if str(item).lower().find("warning") >= 0 or str(item).lower().find("high") >= 0 or str(item).lower().find("overage") >= 0),
        }
        for key, module in MODULES.items()
    ]


@router.get("/modules")
def get_modules():
    return public_modules()


@router.get("/summary")
def get_summary():
    modules = public_modules()
    return {
        "module_count": len(modules),
        "record_count": sum(module["count"] for module in modules),
        "attention_count": sum(module["attention"] for module in modules),
        "last_updated": utcnow().isoformat(),
        "modules": modules,
    }


@router.get("/{module_key}")
def get_module_items(module_key: str):
    module = MODULES.get(module_key)
    if not module:
        raise HTTPException(status_code=404, detail="Platform module not found")
    return {
        "key": module_key,
        "title": module["title"],
        "description": module["description"],
        "primary_action": module["primary_action"],
        "columns": module["columns"],
        "items": deepcopy(module["items"]),
    }


@router.post("/{module_key}/{item_id}/run")
def run_module_action(module_key: str, item_id: int):
    module = MODULES.get(module_key)
    if not module:
        raise HTTPException(status_code=404, detail="Platform module not found")
    item = next((row for row in module["items"] if row["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Platform item not found")
    analysis = call_openrouter_analysis(module_key, module, deepcopy(item))
    item["last_action"] = module["primary_action"]
    item["last_action_at"] = utcnow().isoformat()
    item["action_result"] = analysis.get("summary") or f"{module['primary_action']} completed for {item.get('name') or item.get('tenant') or item.get('query_id') or item_id}."
    item["last_ai_model"] = analysis.get("model")
    if item.get("status") in {"warning", "review", "paused"}:
        item["status"] = "reviewed"
    return {"ok": True, "item": deepcopy(item), "analysis": analysis}


@router.put("/{module_key}/{item_id}")
def update_module_item(module_key: str, item_id: int, payload: ItemUpdate):
    module = MODULES.get(module_key)
    if not module:
        raise HTTPException(status_code=404, detail="Platform module not found")
    item = next((row for row in module["items"] if row["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Platform item not found")
    item.update(payload.data)
    item["updated_at"] = utcnow().isoformat()
    return {"ok": True, "item": deepcopy(item)}


@router.delete("/{module_key}/{item_id}")
def delete_module_item(module_key: str, item_id: int):
    module = MODULES.get(module_key)
    if not module:
        raise HTTPException(status_code=404, detail="Platform module not found")
    before = len(module["items"])
    module["items"] = [row for row in module["items"] if row["id"] != item_id]
    if len(module["items"]) == before:
        raise HTTPException(status_code=404, detail="Platform item not found")
    return {"ok": True, "message": "Item removed"}
