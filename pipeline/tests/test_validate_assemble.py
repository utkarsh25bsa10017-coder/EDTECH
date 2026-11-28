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
        self.saved = (common.BANK, common.PYQ, common.PAPERS, common.WEB_PAPERS)
        common.BANK, common.PYQ = r / "bank", r / "pyq"
        common.PAPERS, common.WEB_PAPERS = r / "papers", r / "web"  # validate checks papers here
        (common.BANK / "ctet").mkdir(parents=True)

    def tearDown(self):
        common.BANK, common.PYQ, common.PAPERS, common.WEB_PAPERS = self.saved
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


    def test_paper_format(self):
        q = {"id": "A1", "qid": "ctet-cdp-0001", "text": {"en": "Q?", "hi": "प्रश्न?"},
             "options": [{"en": f"o{k}", "hi": f"वि{k}"} for k in range(4)], "answer": 1,
             "explanation": {"en": "E.", "hi": "व्याख्या।"}}
        doc = {"id": "mock-01", "exam": "ctet", "title": {"en": "Mock", "hi": "मॉक"}, "kind": "mock", "free": False,
               "status": "draft", "duration_minutes": 150, "marks_per_question": 1, "negative_marking": 0,
               "options": 4, "questions": 1,
               "sections": [{"id": "A", "name": {"en": "CDP", "hi": "बाल विकास"}, "questions": [q]}]}
        self.assertEqual(validate.check_paper(doc, "ctet", "mock-01", free_dir=False), [])
        bad = json.loads(json.dumps(doc))
        bad["sections"][0]["questions"][0]["answer"] = 4
        bad["sections"][0]["questions"][0]["options"] = bad["sections"][0]["questions"][0]["options"][:3]
        bad["questions"] = 2
        errs = validate.check_paper(bad, "ctet", "mock-02", free_dir=True)
        for frag in ("file name", "free: true", "4 or 5", "0-based", "sections hold"):
            self.assertTrue(any(frag in e for e in errs), (frag, errs))
        # run() picks up paper files
        (common.PAPERS / "ctet").mkdir(parents=True)
        (common.PAPERS / "ctet" / "mock-02.json").write_text(json.dumps(bad, ensure_ascii=False))
        r = validate.run("ctet")
        self.assertEqual(r["counts"]["papers"], 1)
        self.assertGreater(r["per_exam"]["ctet"]["paper_errors"], 0)
        self.assertEqual(r["per_exam"]["ctet"]["bank_errors"], 0)


def mock_ids(path):
    d = json.loads(path.read_text())
    return [q["qid"] for s in d["sections"] for q in s["questions"]]


class AssembleBase(Base):
    PER_SUBJECT = 70

    def setUp(self):
        super().setUp()
        self.saved2 = (assemble.PAPERS, assemble.WEB_PAPERS, assemble.REPORTS)
        r = Path(self.tmp.name)
        assemble.PAPERS, assemble.WEB_PAPERS, assemble.REPORTS = r / "papers", r / "web", r / "reports"
        n = 0
        for subj in ("cdp", "hindi", "english", "maths", "evs"):
            qs = [mk("ctet", subj, i) for i in range(1, self.PER_SUBJECT + 1)]
            qs.append(mk("ctet", subj, 9999, status="rejected"))
            self.write(f"{subj}-01.json", qs)
            n += len(qs)

    def tearDown(self):
        assemble.PAPERS, assemble.WEB_PAPERS, assemble.REPORTS = self.saved2
        super().tearDown()


class AssembleTest(AssembleBase):
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
        self.assertFalse(any(i.endswith("-9999") for i in ids))  # rejected never used
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
        self.assertEqual(before, after)  # existing mocks are never rewritten


class AppendMocksTest(AssembleBase):
    PER_SUBJECT = 100  # 500 usable: room for more than two 150-question mocks at <= 20% pairwise overlap

    def test_mocks_append_only(self):
        d = assemble.PAPERS / "ctet"
        # an existing mock built differently (another seed) must survive byte for byte
        assemble.assemble_exam("ctet", 7, 0.2, mocks=1, mocks_only=True)
        m1 = (d / "mock-01.json").read_bytes()
        self.assertFalse((d / "sample-01.json").exists())  # mocks-only touches nothing else
        self.assertFalse((assemble.WEB_PAPERS / "ctet" / "free-01.json").exists())

        s = assemble.assemble_exam("ctet", 2026, 0.2, mocks=4, mocks_only=True)
        self.assertEqual((d / "mock-01.json").read_bytes(), m1)
        self.assertEqual(s["mock_info"]["kept"], ["mock-01"])
        self.assertEqual(s["mock_info"]["added"], ["mock-02", "mock-03", "mock-04"])
        self.assertEqual(sorted(p.name for p in d.iterdir()), [f"mock-0{k}.json" for k in range(1, 5)])
        sets = {}
        for k in range(1, 5):
            path = d / f"mock-0{k}.json"
            doc = json.loads(path.read_text())
            self.assertEqual(validate.check_paper(doc, "ctet", f"mock-0{k}", free_dir=False), [])
            self.assertEqual({len(sct["questions"]) for sct in doc["sections"]}, {30})
            ids = mock_ids(path)
            self.assertEqual(len(set(ids)), 150)
            self.assertFalse(any(i.endswith("-9999") for i in ids))
            sets[k] = set(ids)
        for a in sets:
            for b in sets:
                if a < b:
                    self.assertLessEqual(len(sets[a] & sets[b]), 30, (a, b))

        # rerun with the same target: nothing new, nothing rewritten
        before = {p.name: p.read_bytes() for p in d.iterdir()}
        s = assemble.assemble_exam("ctet", 2026, 0.2, mocks=4, mocks_only=True)
        self.assertEqual(s["mock_info"]["added"], [])
        self.assertEqual({p.name: p.read_bytes() for p in d.iterdir()}, before)

        # a big target stops at the overlap limit instead of padding with repeats
        s = assemble.assemble_exam("ctet", 2026, 0.2, mocks=30, mocks_only=True)
        self.assertIn("cannot support more mocks", s["mock_info"]["stop"])
        files = sorted(d.glob("mock-*.json"))
        for p in before:
            self.assertEqual((d / p).read_bytes(), before[p])
        sets = [set(mock_ids(p)) for p in files]
        for i in range(len(sets)):
            for j in range(i + 1, len(sets)):
                self.assertLessEqual(len(sets[i] & sets[j]), 30)
        for e in s["mock_info"]["table"]:
            self.assertTrue(all(n <= 30 for n in e["overlap"].values()))


if __name__ == "__main__":
    unittest.main()
