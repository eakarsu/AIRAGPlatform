const baseInstruction = [
  'Return strict JSON only.',
  'Include summary, findings, recommendations, risks, assumptions, follow_up_questions, and confidence.',
  'Do not use markdown fences.',
].join(' ')

function prompt(title, goal, context, returnFocus) {
  return [
    `Feature: ${title}`,
    `Goal: ${goal}`,
    `Context: ${context}`,
    `Return focus: ${returnFocus}`,
    baseInstruction,
  ].join('\n')
}

const customFeatures = [
  {
    title: 'Multi-source RAG',
    path: '/cf-multisource-rag',
    endpoint: '/api/cf-multisource-rag',
    type: 'Custom AI',
    category: 'Retrieval',
    icon: 'collection',
    description: 'Fuse documents, APIs, databases, and web context into one grounded answer workflow.',
    presets: [
      ['Blend Document + API Answer', 'answer a customer question using document excerpts, CRM fields, and live support data', 'The team has partial policy docs, an account record, and two open support tickets with inconsistent status.', 'source plan, retrieval order, answer outline, missing data'],
      ['Compare Static vs Live Sources', 'decide which source should win when indexed documents disagree with live database values', 'Contract metadata in the index conflicts with billing-system renewal fields.', 'conflict matrix, source-of-truth recommendation, confidence'],
      ['Grounded Executive Brief', 'prepare an executive-ready answer with citations and operational caveats', 'Leadership wants a concise answer across product docs, deal notes, and recent incident logs.', 'brief, cited claims, caveats, next actions'],
      ['Retrieval Failure Diagnosis', 'diagnose why a RAG answer missed important context', 'Users report that answers ignore recent uploaded documents and overuse old policy PDFs.', 'root causes, tests, fixes, monitoring plan'],
      ['Enterprise Source Roadmap', 'prioritize source integrations for a production RAG rollout', 'A customer wants to connect SharePoint, Salesforce, Postgres, Slack, and public web data.', 'implementation phases, risks, effort, dependencies'],
    ],
  },
  {
    title: 'Conversational Document Analyst',
    path: '/cf-conversational-document-analyst',
    endpoint: '/api/cf-conversational-document-analyst',
    type: 'Custom AI',
    category: 'Analysis',
    icon: 'sparkles',
    description: 'Analyze documents through guided questions, executive summaries, and practical recommendations.',
    presets: [
      ['Ask Contract Questions', 'answer detailed business questions over a contract packet', 'A customer uploaded MSA, order form, DPA, and renewal amendment.', 'answers, cited evidence, ambiguity flags'],
      ['Prepare Board Summary', 'turn a mixed document set into an executive summary', 'The collection contains strategy notes, customer feedback, and product risk memos.', 'summary, decisions needed, risks, open questions'],
      ['Extract Action Items', 'identify owners, deadlines, obligations, and follow-up work', 'Meeting notes and policy documents contain scattered commitments across teams.', 'action list, owners, dates, confidence'],
      ['Find Missing Context', 'identify what documents or facts are needed before answering confidently', 'The user asks a compliance question but only partial policy documents are available.', 'missing evidence, clarifying questions, source recommendations'],
      ['Customer Support Triage', 'summarize a customer issue and recommend next response', 'Support logs, release notes, and internal runbooks disagree about expected behavior.', 'customer response, escalation plan, citations'],
    ],
  },
  {
    title: 'Comparison & Contradictions',
    path: '/cf-comparison-contradiction-detection',
    endpoint: '/api/cf-comparison-contradiction-detection',
    type: 'Custom AI',
    category: 'Governance',
    icon: 'search',
    description: 'Compare document claims and identify inconsistent, conflicting, or missing information.',
    presets: [
      ['Find Conflicting Claims', 'detect contradictions across two policy versions', 'A new policy changed SLA, retention, and escalation language but the old policy is still indexed.', 'conflict table, severity, recommended resolution'],
      ['Compare Vendor Answers', 'compare two vendor security questionnaires for inconsistent answers', 'Questionnaire responses differ across SOC2, DPA, and sales security packet.', 'contradictions, evidence, remediation owner'],
      ['Policy Drift Review', 'identify where operating procedures no longer match approved policy', 'Runbooks were edited after an audit but compliance policy stayed unchanged.', 'drift areas, risk, update plan'],
      ['Missing Requirement Check', 'find requirements present in one document but absent from another', 'A customer contract includes obligations not reflected in implementation docs.', 'missing obligations, business impact, follow-up'],
      ['Source Consistency Score', 'score consistency across a collection and identify unreliable sources', 'Multiple versions of pricing, SLA, and support entitlement docs exist.', 'score, unreliable sources, cleanup plan'],
    ],
  },
  {
    title: 'Knowledge Graph Extraction',
    path: '/cf-knowledge-graph-extraction',
    endpoint: '/api/cf-knowledge-graph-extraction',
    type: 'Custom AI',
    category: 'Knowledge',
    icon: 'chart',
    description: 'Extract entities, relationships, owners, risks, and dependencies from document collections.',
    presets: [
      ['Extract Entities + Links', 'build an entity relationship map from uploaded documents', 'Documents mention customers, systems, products, teams, controls, and incidents.', 'entities, relationships, evidence, confidence'],
      ['Map Ownership Network', 'identify owners, approvers, and accountable teams', 'Policy docs and implementation plans contain role names but inconsistent owners.', 'owner graph, gaps, escalation points'],
      ['Dependency Graph', 'extract technical and business dependencies', 'Migration docs list APIs, databases, batch jobs, vendors, and downstream reports.', 'dependency map, critical paths, risks'],
      ['Risk Relationship Map', 'connect risks to controls, documents, and responsible teams', 'Audit evidence includes controls, exceptions, remediation notes, and policy references.', 'risk graph, control gaps, owners'],
      ['Customer Knowledge Map', 'summarize customer-specific entities and relationships', 'Account notes, tickets, contracts, and success plans need one connected view.', 'customer graph, key facts, next actions'],
    ],
  },
  {
    title: 'Citation Source Tracking',
    path: '/cf-citation-source-tracking',
    endpoint: '/api/cf-citation-source-tracking',
    type: 'Custom AI',
    category: 'Evidence',
    icon: 'link',
    description: 'Track answer provenance and source evidence for audit-ready RAG responses.',
    presets: [
      ['Validate Answer Citations', 'check whether cited sources actually support each answer claim', 'A generated answer cites five chunks, but stakeholders question whether the citations are sufficient.', 'claim support table, weak citations, fixes'],
      ['Build Provenance Report', 'produce an audit-ready source trail for a RAG answer', 'Compliance needs every claim linked to source, document version, chunk, and timestamp.', 'provenance report, gaps, audit notes'],
      ['Find Unsupported Claims', 'identify statements with no source support', 'An executive summary includes facts from memory and retrieved documents.', 'unsupported claims, severity, rewrite guidance'],
      ['Citation Quality Score', 'score citation precision and source freshness', 'The answer cites outdated policies and broad document sections.', 'quality score, stale sources, replacement sources'],
      ['Source Evidence Pack', 'prepare a customer-facing evidence pack', 'Sales needs a supportable response for security and data-retention questions.', 'answer, source list, confidence, disclaimers'],
    ],
  },
  {
    title: 'Realtime Document Monitoring',
    path: '/cf-realtime-document-monitoring',
    endpoint: '/api/cf-realtime-document-monitoring',
    type: 'Custom AI',
    category: 'Monitoring',
    icon: 'bell',
    description: 'Monitor document changes and generate alerts for operationally important updates.',
    presets: [
      ['Detect Critical Document Changes', 'classify recent document edits by business impact', 'Contracts, security docs, and SLA pages changed during the last 24 hours.', 'critical changes, owners, recommended alerts'],
      ['Monitor Expiring Documents', 'find documents approaching expiration or renewal deadlines', 'Several vendor docs and customer agreements have missing or stale renewal metadata.', 'expiration risks, escalation plan, owners'],
      ['Alert Rule Tuning', 'reduce noisy alerts while preserving critical monitoring coverage', 'The system sends too many document-change notifications and users ignore them.', 'rule changes, routing, expected alert reduction'],
      ['Ownership Gap Review', 'find monitored documents without active owners', 'Some documents were uploaded by inactive users and still drive customer-facing answers.', 'ownership gaps, risk, reassignment plan'],
      ['Incident Monitoring Brief', 'summarize recent changes that could affect an active incident', 'Runbooks, incident notes, and known-issue docs changed after a production event.', 'brief, affected documents, response plan'],
    ],
  },
]

const gapFeatures = [
  ['Explicit Embed Ingestion', '/gap-no-explicit-embed-ingestion-route-exposed', '/api/gap-no-explicit-embed-ingestion-route-exposed', 'Ingestion', 'cloud', 'Plan controlled ingestion, embedding, and re-index operations for uploaded knowledge.', [
    ['Design Ingestion Pipeline', 'design a reliable document ingestion and embedding workflow', 'The customer uploads PDFs, docs, CSVs, and web pages with mixed quality metadata.', 'pipeline steps, validation, failure handling'],
    ['Re-index Impact Plan', 'plan a safe re-index after changing chunking or embedding model', 'The team wants to improve retrieval without breaking existing answer quality.', 'migration plan, rollback, QA checks'],
    ['Chunking Strategy Review', 'recommend chunking and metadata strategy for enterprise docs', 'Documents include contracts, support articles, policies, and long technical manuals.', 'chunking rules, metadata, risks'],
    ['Failed Import Triage', 'diagnose ingestion failures and recovery actions', 'Recent uploads fail due to OCR, encoding, duplicate files, and missing workspace mappings.', 'failure classes, fixes, prevention'],
    ['Embedding Cost Control', 'reduce embedding cost while maintaining retrieval quality', 'Large backfills and frequent updates are increasing monthly AI spend.', 'cost levers, batching, expected savings'],
  ]],
  ['Collection Overview', '/gap-no-summarize-collectionlevel-overview', '/api/gap-no-summarize-collectionlevel-overview', 'Analysis', 'clipboard', 'Summarize a full collection instead of one document at a time.', [
    ['Summarize Full Collection', 'create a collection-level executive overview', 'The collection contains policies, decisions, risks, and unresolved implementation notes.', 'overview, themes, decisions, risks'],
    ['Collection Health Check', 'evaluate completeness, freshness, and ownership of a collection', 'The knowledge base includes duplicated, stale, and ownerless documents.', 'health score, cleanup actions, owners'],
    ['Topic Coverage Map', 'map what topics are covered and where gaps remain', 'Leadership asks whether the collection can answer support and compliance questions.', 'coverage map, gaps, source recommendations'],
    ['Executive Digest', 'prepare a concise leadership digest from the collection', 'A weekly review needs changes, risks, and decisions summarized from many docs.', 'digest, decisions, escalations'],
    ['Collection Cleanup Plan', 'prioritize stale, duplicate, and low-value documents for cleanup', 'Search quality is poor because old versions remain indexed.', 'cleanup backlog, priority, impact'],
  ]],
  ['Source Discovery', '/gap-no-recommendsources-crossdocument-discovery', '/api/gap-no-recommendsources-crossdocument-discovery', 'Retrieval', 'search', 'Recommend documents and sources likely to answer a user question.', [
    ['Recommend Best Sources', 'identify the most relevant documents for a question', 'The user asks about security commitments and implementation obligations.', 'ranked sources, rationale, missing docs'],
    ['Find Related Documents', 'discover adjacent documents that should be included in the answer', 'A retrieved policy references contracts, runbooks, and release notes.', 'related sources, relation type, confidence'],
    ['Source Gap Analysis', 'determine which sources are missing for a reliable answer', 'The current index has partial docs but no ticket history or CRM notes.', 'missing sources, priority, integration path'],
    ['Build Research Pack', 'assemble a source pack for a customer or audit question', 'The team needs a packet of evidence before responding externally.', 'source pack, citations, caveats'],
    ['Improve Retrieval Recall', 'recommend indexing and query changes to improve source discovery', 'Relevant documents exist but do not appear in top search results.', 'root cause, query changes, metadata fixes'],
  ]],
  ['APIs / DBs / Live Web', '/gap-no-multisource-rag-apis-dbs-live-web', '/api/gap-no-multisource-rag-apis-dbs-live-web', 'Retrieval', 'lightning', 'Extend RAG workflows beyond static documents into live enterprise sources.', [
    ['Live Source Architecture', 'design a RAG architecture that combines documents, APIs, databases, and web data', 'The customer needs answers from product docs, Salesforce, Postgres, and public status pages.', 'architecture, auth, latency, risks'],
    ['Database Grounding Plan', 'decide which database tables should ground answers', 'Customer, subscription, invoice, entitlement, and ticket tables are available.', 'table plan, joins, permissions'],
    ['API Tool Selection', 'select live APIs that should be callable during answer generation', 'The platform can call CRM, billing, status, and feature flag APIs.', 'tool list, call policy, fallback plan'],
    ['Web Freshness Strategy', 'decide when live web lookup should override indexed documents', 'Public docs and status pages change faster than internal index refreshes.', 'freshness rules, cache policy, citations'],
    ['Latency + Reliability Review', 'reduce failure risk for multi-source retrieval', 'Live APIs add latency, rate limits, and partial failures to RAG answers.', 'timeouts, fallbacks, monitoring'],
  ]],
  ['Contradiction Detection', '/gap-no-contradictiondetection-across-docs', '/api/gap-no-contradictiondetection-across-docs', 'Governance', 'beaker', 'Find conflicts and disagreements across uploaded documents.', [
    ['Detect Policy Conflicts', 'find conflicting policy statements across documents', 'Security, legal, and product docs describe retention differently.', 'conflict matrix, severity, owners'],
    ['Version Conflict Scan', 'identify where old and new versions disagree', 'Multiple versions of customer-facing documentation remain indexed.', 'version conflicts, source freshness, cleanup'],
    ['Contract vs SOP Review', 'compare contract obligations against operating procedures', 'Customer contract commitments may not be reflected in support runbooks.', 'gaps, obligations, remediation'],
    ['Regulatory Claim Check', 'find compliance statements that contradict evidence', 'Marketing and security docs make claims about certifications and controls.', 'unsupported claims, risk, fixes'],
    ['Conflict Resolution Plan', 'prioritize contradictions for content owners', 'The knowledge base has dozens of inconsistent answers across teams.', 'priority list, decision owners, timeline'],
  ]],
  ['Citation Provenance', '/gap-no-citationprovenance-route', '/api/gap-no-citationprovenance-route', 'Evidence', 'link', 'Build citation routes and provenance checks for generated answers.', [
    ['Design Provenance Route', 'design an API route for answer provenance and source traceability', 'The product needs to return answer, source chunks, document IDs, and confidence.', 'route shape, fields, security'],
    ['Citation Audit Review', 'audit whether answer citations are complete and accurate', 'A customer-facing answer includes citations but lacks document version and chunk metadata.', 'audit findings, fixes, confidence'],
    ['Evidence Chain Builder', 'construct a chain from answer claim to source document and chunk', 'Compliance requires every statement to be traceable to approved documents.', 'evidence chain, missing links, risks'],
    ['Citation UX Plan', 'recommend how citations should appear in the UI', 'Users need to inspect source snippets without losing answer context.', 'UI elements, interactions, edge cases'],
    ['Provenance Risk Scan', 'find ways provenance could leak restricted documents', 'Team-level permissions and shared answers can expose source references.', 'risk areas, controls, tests'],
  ]],
  ['Team Access Control', '/gap-no-teamlevel-access-control-role-permissions', '/api/gap-no-teamlevel-access-control-role-permissions', 'Governance', 'shield', 'Design team-level document permissions, role checks, and workspace controls.', [
    ['Role Matrix Design', 'design document access roles and permissions', 'Admins, analysts, sales, legal, and external users need different source access.', 'role matrix, permissions, exceptions'],
    ['Permission Leak Review', 'identify where RAG answers could expose restricted content', 'Users can ask broad questions across workspaces with mixed access levels.', 'leak paths, controls, tests'],
    ['Workspace Isolation Plan', 'design isolation rules for multi-tenant workspaces', 'Enterprise accounts need strict separation across departments and customers.', 'workspace model, enforcement, audit'],
    ['Access Review Workflow', 'create periodic permission review process', 'Inactive users and inherited permissions create compliance risk.', 'review workflow, owners, cadence'],
    ['Secure Sharing Policy', 'define how answers and source citations can be shared', 'Users want to export answers but not all recipients can access the sources.', 'sharing rules, redactions, approvals'],
  ]],
  ['Webhook Integration', '/gap-no-public-webhookintegration-system', '/api/gap-no-public-webhookintegration-system', 'Automation', 'lightning', 'Plan inbound and outbound webhook workflows for document events.', [
    ['Webhook Event Design', 'define webhook events for document and answer lifecycle changes', 'Customers want notifications when uploads, indexing, summaries, and alerts complete.', 'event schema, payloads, retries'],
    ['Inbound Automation Plan', 'design inbound webhook handling for external systems', 'SharePoint, CRM, and ticketing systems should trigger imports and analyses.', 'auth, validation, queueing'],
    ['Outbound Delivery Reliability', 'improve webhook delivery reliability and observability', 'Customers report missed webhook deliveries during high-volume imports.', 'retry policy, DLQ, monitoring'],
    ['Security Review', 'secure public webhook endpoints', 'Endpoints need signatures, replay protection, tenant mapping, and rate limits.', 'controls, threats, tests'],
    ['Integration Playbook', 'prepare implementation plan for customer webhook integration', 'A customer wants to connect Slack, Jira, and a compliance dashboard.', 'steps, sample events, rollout'],
  ]],
  ['Bulk Import Connectors', '/gap-no-bulk-import-s3-google-drive-sharepoint-co', '/api/gap-no-bulk-import-s3-google-drive-sharepoint-co', 'Ingestion', 'cloud', 'Plan S3, Google Drive, SharePoint, and connector import workflows.', [
    ['S3 Import Plan', 'design a bulk import workflow for S3 buckets', 'The customer has nested folders, duplicate files, and mixed PDF/docx/csv content.', 'connector plan, metadata mapping, errors'],
    ['Google Drive Connector', 'plan Google Drive import with permissions preservation', 'Drive folders include shared files, shortcuts, and owner changes.', 'OAuth scopes, sync rules, permission mapping'],
    ['SharePoint Sync Strategy', 'design SharePoint sync and incremental indexing', 'Documents live across sites, libraries, and permission groups.', 'sync plan, delta detection, risks'],
    ['Bulk Import QA', 'validate import completeness and retrieval readiness', 'A large backfill completed but users report missing documents.', 'QA checks, reconciliation, fixes'],
    ['Connector Rollout Plan', 'prioritize connectors and rollout phases', 'Enterprise customers need S3 first, then Drive and SharePoint.', 'roadmap, dependencies, success metrics'],
  ]],
  ['Notification System', '/gap-no-notification-system', '/api/gap-no-notification-system', 'Monitoring', 'bell', 'Design notification delivery for changed documents, failed jobs, and review requests.', [
    ['Alert Routing Design', 'design notification routing by severity and user role', 'Critical ingestion failures, stale docs, and review requests need different channels.', 'routing matrix, escalation, SLAs'],
    ['Reduce Alert Fatigue', 'tune notification rules to reduce noise', 'Users receive too many low-value alerts and miss urgent document changes.', 'rule changes, suppression, expected impact'],
    ['Review Request Flow', 'build notifications for content review and approval', 'Document owners need reminders for stale, changed, or high-risk content.', 'workflow, reminders, ownership'],
    ['Failed Job Alerts', 'design alerts for failed ingestion, embedding, and sync jobs', 'Bulk imports fail silently and users discover missing documents later.', 'alert types, payloads, recovery'],
    ['Customer Notification Pack', 'prepare customer-facing notification configuration', 'An enterprise customer needs Slack, email, and webhook delivery.', 'configuration, templates, governance'],
  ]],
  ['Query Audit Log', '/gap-no-audit-log-of-who-queried-what', '/api/gap-no-audit-log-of-who-queried-what', 'Governance', 'clock', 'Track who queried what, which sources were used, and what answer was returned.', [
    ['Audit Schema Design', 'design query audit log fields for compliance', 'The app must record user, workspace, prompt, answer, sources, model, and timestamps.', 'schema, retention, privacy controls'],
    ['Investigate Sensitive Query', 'review a suspicious query and source access pattern', 'A user asked about restricted documents outside their normal workflow.', 'timeline, findings, recommended action'],
    ['Compliance Export Plan', 'prepare audit exports for compliance review', 'Auditors need evidence of query activity and citation sources for a time range.', 'export fields, filters, access control'],
    ['PII Redaction Policy', 'define how prompts and answers should be redacted in audit logs', 'Queries can contain sensitive customer and employee data.', 'redaction rules, tradeoffs, tests'],
    ['Usage Analytics Review', 'turn audit data into adoption and risk insights', 'Leadership wants to understand usage by team, source, and risk category.', 'metrics, dashboards, anomalies'],
  ]],
  ['Export / Share Workflow', '/gap-no-exportshare-workflow', '/api/gap-no-exportshare-workflow', 'Collaboration', 'share', 'Plan secure answer, source, and report sharing with permissions.', [
    ['Secure Answer Export', 'design secure exports for AI answers and source evidence', 'Users want to export answers to PDF, Slack, and email with citations.', 'export formats, permissions, redaction'],
    ['Share Link Policy', 'define controlled sharing links for answers and collections', 'Teams need share links that respect source permissions and expiration.', 'link rules, access checks, audit'],
    ['Customer Report Builder', 'prepare a customer-facing report from AI analysis', 'The team wants a branded report with summary, findings, evidence, and next steps.', 'report sections, citations, disclaimers'],
    ['Approval Before Share', 'design approval workflow for external sharing', 'Legal wants review before answers with restricted sources leave the workspace.', 'approval steps, roles, notifications'],
    ['Export Risk Review', 'identify risks in exporting source-backed AI responses', 'Exports may include sensitive snippets, stale docs, or unsupported claims.', 'risk list, controls, validation'],
  ]],
]

export const aiFeatureCatalog = [
  ...customFeatures,
  ...gapFeatures.map(([title, path, endpoint, category, icon, description, presetDefs]) => ({
    title,
    path,
    endpoint,
    type: 'Gap Tool',
    category,
    icon,
    description,
    presets: presetDefs.map(([label, goal, context, returnFocus]) => ({ label, value: prompt(title, goal, context, returnFocus) })),
  })),
].map((feature) => ({
  ...feature,
  presets: feature.presets.map((preset) => Array.isArray(preset)
    ? { label: preset[0], value: prompt(feature.title, preset[1], preset[2], preset[3]) }
    : preset
  ),
}))

export function getFeatureByPath(path) {
  return aiFeatureCatalog.find((feature) => feature.path === path)
}
