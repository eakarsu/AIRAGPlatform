# Governed RAG operations

## Intended use and limits

The governed API provides permission-scoped retrieval, cited synthesis, uncertainty, and abstention over approved collections. It is decision support, not a source of truth. Validate retrieval recall, faithfulness, citation completeness, freshness, source conflict handling, injection resistance, and deletion propagation against representative fixtures before use.

## Data and integrations

JWTs must carry signed actor, tenant, and role claims. Work items are tenant-bound, independently approved, version checked, and audited. Object storage, parsing, embedding-index, repository, and webhook actions are queued only after approval, use idempotency keys and credential references, and have leased claims, bounded retries, and dead letters.

## Deploy, rollback, and recovery

Run `./start.sh check`, back up PostgreSQL and source objects, then use `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`. Migrations never run on application startup. Roll back code without dropping audit evidence; restore a verified backup and reconcile source versions, index checkpoints, and provider receipts before replay. Alert on cross-tenant denial, self-approval, injection findings, evaluation drift, expired claims, and dead letters.
