import sys
import unittest
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
ROOT = BACKEND.parent
sys.path.insert(0, str(BACKEND))
from governance_policy import KEY, canonical_digest, contains_secret, evaluate

def valid():
    return {"collection":{"id":"c1","permissionVersion":"p2","retentionDays":365},"sources":[{"id":"s1","version":"v1","sha256":"a"*64,"capturedAt":"2026-07-18T00:00:00Z","rightsBasis":"licensed","allowedRoles":["reader"]}],"chunks":[{"sourceId":"s1","sourceVersion":"v1","span":"p1","embeddingVersion":"e2","deleted":False}],"citations":[{"sourceId":"s1","sourceVersion":"v1","span":"p1","resolved":True}],"answer":{"text":"Grounded","claims":[{"citationId":"c1"}],"evidenceSufficient":True,"abstained":False},"ingestionJob":{"id":"j1","cursor":"1","status":"completed","objectRef":"obj1","dedupeKey":"sha1"},"validation":{"datasetVersion":"d1","retrievalRecall":.9,"faithfulness":.9,"citationResolution":1,"freshness":1,"conflictCasesPassed":True,"injectionCasesPassed":True,"deletedContentExcluded":True}}

class GovernanceTest(unittest.TestCase):
    def test_contract(self):
        self.assertTrue(KEY.match("workflow:2026:0001")); self.assertFalse(KEY.match("short")); self.assertTrue(contains_secret({"password":"x"})); self.assertEqual(canonical_digest({"b":2,"a":1}),canonical_digest({"a":1,"b":2}))
    def test_grounded(self): self.assertEqual(evaluate(valid())["errors"],[])
    def test_abstention_and_injection(self):
        data=valid();data["answer"]["evidenceSufficient"]=False;data["validation"]["injectionCasesPassed"]=False;self.assertGreaterEqual(len(evaluate(data)["errors"]),2)
    def test_collection_boundary(self):
        data=valid();data["collection"].pop("permissionVersion");self.assertIn("scoped collection permissions and retention required",evaluate(data)["errors"])
    def test_source_provenance(self):
        data=valid();data["sources"][0]["sha256"]="bad";self.assertIn("source provenance or permissions invalid",evaluate(data)["errors"])
    def test_citation_resolution(self):
        data=valid();data["citations"][0]["resolved"]=False;self.assertIn("citation does not resolve",evaluate(data)["errors"])
    def test_resumable_ingestion(self):
        data=valid();data["ingestionJob"].pop("cursor");self.assertIn("resumable ingestion job invalid",evaluate(data)["errors"])
    def test_deleted_content_evaluation(self):
        data=valid();data["validation"]["deletedContentExcluded"]=False;self.assertIn("conflict, injection, and deletion evaluation required",evaluate(data)["errors"])
    def test_migration_and_worker_contract(self):
        migration=(BACKEND/"migrations/001_governed_rag.sql").read_text()
        router=(BACKEND/"routers/governance.py").read_text()
        for term in ("tenant_id", "subject_id", "FOREIGN KEY(tenant_id", "append-only", "claim_token", "lease_expires_at", "dead_letter"):
            self.assertIn(term, migration)
        self.assertIn("FOR UPDATE SKIP LOCKED",router)
        self.assertIn("created_by<>:a",router)
        self.assertIn("require_item_scope",router)
    def test_host_and_launcher_are_non_destructive(self):
        host=(BACKEND/"main.py").read_text(); launcher=(ROOT/"start.sh").read_text(); env=(ROOT/".env.example").read_text()
        self.assertNotIn("create_tables",host)
        self.assertIn("ENABLE_GENERATED_ROUTES",host)
        self.assertIn("ALLOW_SCHEMA_MIGRATION",launcher)
        self.assertIn("DATABASE_URL=\n",env)
        self.assertIn("SECRET_KEY=\n",env)

if __name__ == "__main__": unittest.main()
