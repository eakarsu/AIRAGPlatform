import os, sys, unittest
os.environ.pop("OPENROUTER_API_KEY", None); os.environ.pop("OPENAI_API_KEY", None)
from pathlib import Path
BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.environ.pop("OPENROUTER_API_KEY", None); os.environ.pop("OPENAI_API_KEY", None)

class FeaturePackTest(unittest.TestCase):
    def test_fallback_filter_csv_sections(self):
        from routers.feature_pack import fallback, filter_tasks, to_csv, labelled_sections, FEATURES
        self.assertEqual(len(FEATURES), 3)
        rows=[{"id":1,"title":"Alpha doc","status":"open","priority":"high","notes":"","done":False,"estimate":0},{"id":2,"title":"Beta","status":"done","priority":"low","notes":"n","done":True,"estimate":2}]
        self.assertEqual([r["title"] for r in filter_tasks(rows, search="alpha")], ["Alpha doc"])
        self.assertEqual([r["title"] for r in filter_tasks(rows, status="done")], ["Beta"])
        self.assertIn("Alpha doc", to_csv(rows))
        out=fallback(FEATURES[0], rows)
        self.assertIs(out["aiGenerated"], False); self.assertIn("Deterministic fallback", out["label"])
        self.assertEqual(out["counts"], {"total":2,"open":1,"done":1,"highPriority":1})
        secs=labelled_sections(rows[0])
        self.assertIs([s for s in secs if s["label"]=="Done"][0]["value"], False)
        self.assertEqual([s for s in secs if s["label"]=="Estimate (hours)"][0]["value"], 0)
        self.assertEqual([s for s in secs if s["label"]=="Notes"][0]["value"], "")
        self.assertNotIn("OPENROUTER_API_KEY", os.environ)

if __name__ == "__main__": unittest.main()
