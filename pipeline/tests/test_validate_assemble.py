"""Validator and assembler on a synthetic bank.

    .venv/bin/python -m unittest discover -s pipeline/tests -v
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import assemble  # noqa: E402
import common  # noqa: E402
import validate  # noqa: E402

WORDS = ("river mountain desert ocean forest valley plateau delta island glacier canyon lagoon "
         "volcano prairie tundra savanna marsh reef basin peninsula strait gulf bay cape").split()


def mk(exam, subj, i, **kw):
    w = WORDS[i % len(WORDS)]
    q = {
        "id": f"{exam}-{subj}-{i:04d}", "exam": exam,
        "subject": {"en": subj.title(), "hi": "विषय"}, "topic": {"en": f"T{i % 3}", "hi": "टॉपिक"},
        "difficulty": ("easy", "medium", "hard")[i % 3], "type": "single",
        "text": {"en": f"Which {w} number {i} fact {i * 7} is true {WORDS[(i * 5) % len(WORDS)]}?",
                 "hi": f"कौन सा {i} तथ्य सही है?"},
        "options": [{"en": f"{w} choice {k} {i}", "hi": f"विकल्प {k} {i}"} for k in range(4)],
        "answer": i % 4, "explanation": {"en": "Because.", "hi": "क्योंकि।"},
        "source": "generated", "pyq_ref": None, "variant_of": None, "time_sensitive": False,
        "facts_as_of": None, "status": "draft",
    }
    q.update(kw)
    return q


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        r = Path(self.tmp.name)
        self.saved = (common.BANK, common.PYQ)
        common.BANK, common.PYQ = r / "bank", r / "pyq"
        (common.BANK / "ctet").mkdir(parents=True)

    def tearDown(self):
        common.BANK, common.PYQ = self.saved
        self.tmp.cleanup()

    def write(self, name, qs, exam="ctet"):
        (common.BANK / exam / name).write_text(json.dumps(qs, ensure_ascii=False))


class ValidateTest(Base):
    def test_catches_problems(self):
        good = mk("ctet", "cdp", 1)
        dup_id = mk("ctet", "cdp", 1)
        bad_ans = mk("ctet", "cdp", 2, answer=4)
        three = mk("ctet", "cdp", 3, options=[{"en": "a", "hi": "क"}] * 3)
        no_deva = mk("ctet", "cdp", 4, text={"en": "Plain question here?", "hi": "Plain question here?"})
        same_opts = mk("ctet", "cdp", 5)
        same_opts["options"][1] = dict(same_opts["options"][0])
        near = mk("ctet", "cdp", 6)
        near2 = json.loads(json.dumps(near))
        near2["id"] = "ctet-cdp-0007"
        near2["text"]["en"] += " please"
        linked = json.loads(json.dumps(near))
        linked.update(id="ctet-cdp-0008", variant_of="ctet-cdp-0006")
        no_expl = mk("ctet", "cdp", 9, explanation={"en": "", "hi": ""})
        self.write("cdp-01.json", [good, dup_id, bad_ans, three, no_deva, same_opts, near, near2, linked, no_expl])
        r = validate.run("ctet")
        codes = [i["code"] for i in r["issues"] if i["level"] == "error"]
        for c in ("duplicate-id", "answer", "options-count", "hi-not-devanagari", "options-duplicate",
                  "near-duplicate", "explanation-missing"):
            self.assertIn(c, codes, c)
        # the variant_of-linked copy is not an error
        nd = [i for i in r["issues"] if i["code"] == "near-duplicate"]
        pairs = {frozenset((i.get("id"), i.get("other"))) for i in nd}
        self.assertNotIn(frozenset(("ctet-cdp-0006", "ctet-cdp-0008")), pairs)
        self.assertIn(frozenset(("ctet-cdp-0006", "ctet-cdp-0007")), pairs)

    def test_english_item_needs_no_devanagari(self):
        e = mk("ctet", "english", 1, subject={"en": "Language II: English", "hi": "Language II: English"},
               text={"en": "Choose the synonym of big.", "hi": "Choose the synonym of big."},
               options=[{"en": w, "hi": w} for w in ("large", "small", "thin", "late")],
               explanation={"en": "Large means big.", "hi": "Large means big."})
        self.write("english-01.json", [e])
        r = validate.run("ctet")
        self.assertEqual([i for i in r["issues"] if i["level"] == "error"], [])


class AssembleTest(Base):
    def setUp(self):
        super().setUp()
        self.saved2 = (assemble.PAPERS, assemble.WEB_PAPERS, assemble.REPORTS)
        r = Path(self.tmp.name)
        assemble.PAPERS, assemble.WEB_PAPERS, assemble.REPORTS = r / "papers", r / "web", r / "reports"
        n = 0
        for subj in ("cdp", "hindi", "english", "maths", "evs"):
            qs = [mk("ctet", subj, i) for i in range(1, 71)]
            qs.append(mk("ctet", subj, 99, status="rejected"))
            self.write(f"{subj}-01.json", qs)
            n += len(qs)

    def tearDown(self):
        assemble.PAPERS, assemble.WEB_PAPERS, assemble.REPORTS = self.saved2
        super().tearDown()

    def test_papers(self):
        s = assemble.assemble_exam("ctet", 2026, 0.2)
        self.assertEqual(s["mocks"], 2)  # 350 usable, 150 per mock, <= 20% reuse
        free = json.loads((assemble.WEB_PAPERS / "ctet" / "free-01.json").read_text())
        self.assertEqual(free["kind"], "free")
        self.assertTrue(free["free"])
        self.assertEqual(free["questions"], 20)
        mock = json.loads((assemble.PAPERS / "ctet" / "mock-01.json").read_text())
        ids = [q["qid"] for sct in mock["sections"] for q in sct["questions"]]
        self.assertEqual(len(ids), 150)
        self.assertEqual(len(set(ids)), 150)
        self.assertFalse(any(i.endswith("-0099") for i in ids))  # rejected never used
        self.assertEqual({len(sct["questions"]) for sct in mock["sections"]}, {30})
        prob = json.loads((assemble.PAPERS / "ctet" / "probable-01.json").read_text())
        self.assertEqual(prob["kind"], "probable")
        self.assertIn("source", prob["assembly"]["weights"])
        self.assertIn("how_derived", prob["assembly"]["weights"])
        samp = json.loads((assemble.PAPERS / "ctet" / "sample-01.json").read_text())
        self.assertEqual(samp["kind"], "sample")
        # deterministic
        before = (assemble.PAPERS / "ctet" / "mock-02.json").read_text()
        assemble.assemble_exam("ctet", 2026, 0.2)
        after = (assemble.PAPERS / "ctet" / "mock-02.json").read_text()
        strip = lambda t: {k: v for k, v in json.loads(t).items() if k != "assembly"}  # noqa: E731
        self.assertEqual(strip(before), strip(after))


if __name__ == "__main__":
    unittest.main()
