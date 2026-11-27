"""Tests for the filter agent with a mocked Anthropic client (no API key needed).

    .venv/bin/python -m unittest discover -s pipeline/tests -v
"""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import anthropic  # noqa: E402
import httpx2  # noqa: E402

import common  # noqa: E402
import review  # noqa: E402


def q(i, answer=1, status="draft"):
    return {
        "id": f"ctet-cdp-{i:04d}", "exam": "ctet",
        "subject": {"en": "Child Development and Pedagogy", "hi": "बाल विकास एवं शिक्षाशास्त्र"},
        "topic": {"en": "Piaget", "hi": "पियाजे"}, "difficulty": "easy", "type": "single",
        "text": {"en": f"Question {i}?", "hi": f"प्रश्न {i}?"},
        "options": [{"en": f"opt {k}", "hi": f"विकल्प {k}"} for k in range(4)],
        "answer": answer, "explanation": {"en": "Because.", "hi": "क्योंकि।"},
        "source": "generated", "pyq_ref": None, "variant_of": None, "time_sensitive": False,
        "facts_as_of": None, "status": status,
    }


def verdict(kind, fixed_answer=2):
    checks = review.Checks(key_correct=kind != "fix", single_best_answer=True, unambiguous=True,
                           factually_accurate_and_current=kind != "reject", english_ok=True, hindi_ok=True,
                           fits_exam_pattern=True)
    fixed = None
    if kind == "fix":
        fixed = review.FixedQuestion(
            text=review.BiText(en="Fixed?", hi="सुधरा?"),
            options=[review.BiText(en=f"new {k}", hi=f"नया {k}") for k in range(4)],
            answer=fixed_answer, explanation=review.BiText(en="Fixed because.", hi="सुधार।"))
    return review.Verdict(verdict=kind, checks=checks, correct_answer_index=2 if kind == "fix" else 1,
                          reasons=[] if kind == "accept" else [f"{kind} reason"], fixed=fixed, confidence="high")


REQ = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")


def status_error(code):
    resp = httpx2.Response(code, request=REQ, json={"type": "error", "error": {"type": "x", "message": "m"}})
    return anthropic.APIStatusError(f"status {code}", response=resp, body=None)


class FakeClient:
    def __init__(self, script):
        self.script = list(script)  # items: Verdict | Exception
        self.calls = []
        self.messages = SimpleNamespace(parse=self._parse)

    def _parse(self, **kw):
        self.calls.append(kw)
        item = self.script.pop(0)
        if isinstance(item, Exception):
            raise item
        return SimpleNamespace(parsed_output=item, stop_reason="end_turn", content=[],
                               usage=SimpleNamespace(input_tokens=10, output_tokens=5,
                                                     cache_read_input_tokens=0, cache_creation_input_tokens=0))


class ReviewTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        root = Path(self.tmp.name)
        self.bank = root / "bank"
        (self.bank / "ctet").mkdir(parents=True)
        self.file = self.bank / "ctet" / "cdp-01.json"
        self.file.write_text(json.dumps([q(1), q(2), q(3), q(4, status="reviewed")], ensure_ascii=False))
        self._saved = (common.BANK, common.PYQ, review.REVIEWS)
        common.BANK, common.PYQ = self.bank, root / "pyq"
        review.REVIEWS = root / "reviews"
        self._sleep = review.time.sleep
        review.time.sleep = lambda s: None

    def tearDown(self):
        common.BANK, common.PYQ, review.REVIEWS = self._saved
        review.time.sleep = self._sleep
        self.tmp.cleanup()

    def bankq(self):
        return {x["id"]: x for x in json.loads(self.file.read_text())}

    def test_verdicts_update_status_and_log(self):
        c = FakeClient([verdict("accept"), verdict("fix"), verdict("reject")])
        rc = review.main(["--exam", "ctet"], client=c)
        self.assertEqual(rc, 0)
        b = self.bankq()
        self.assertTrue(b["ctet-cdp-0001"]["ai_checked"])
        self.assertEqual(b["ctet-cdp-0001"]["status"], "draft")
        self.assertEqual(b["ctet-cdp-0002"]["answer"], 2)
        self.assertEqual(b["ctet-cdp-0002"]["text"]["en"], "Fixed?")
        self.assertTrue(b["ctet-cdp-0002"]["ai_fixed"])
        self.assertEqual(b["ctet-cdp-0002"]["status"], "draft")
        self.assertEqual(b["ctet-cdp-0003"]["status"], "rejected")
        self.assertNotIn("ai_checked", b["ctet-cdp-0004"])  # reviewed items are not re-reviewed
        for x in b.values():
            self.assertIn(x["status"], ("draft", "rejected", "reviewed"))
        self.assertEqual(b["ctet-cdp-0004"]["status"], "reviewed")
        log = [json.loads(l) for l in (review.REVIEWS / "ctet.jsonl").read_text().splitlines()]
        self.assertEqual([r["verdict"] for r in log], ["accept", "fix", "reject"])
        self.assertEqual(log[1]["original"]["answer"], 1)
        # structured output requested, system prompt cached
        self.assertIs(c.calls[0]["output_format"], review.Verdict)
        self.assertEqual(c.calls[0]["model"], review.DEFAULT_MODEL)
        # rerun: nothing left to review
        c2 = FakeClient([])
        self.assertEqual(review.main(["--exam", "ctet"], client=c2), 0)
        self.assertEqual(c2.calls, [])

    def test_never_marks_reviewed(self):
        c = FakeClient([verdict("accept")] * 3)
        review.main(["--exam", "ctet"], client=c)
        statuses = [x["status"] for x in self.bankq().values()]
        self.assertEqual(statuses.count("reviewed"), 1)  # only the one a human set

    def test_transient_errors_retry(self):
        conn = anthropic.APIConnectionError(request=REQ)
        c = FakeClient([status_error(529), status_error(429), conn, status_error(503), status_error(409),
                        verdict("accept"), verdict("accept"), verdict("accept")])
        self.assertEqual(review.main(["--exam", "ctet"], client=c), 0)
        self.assertEqual(len(c.calls), 8)
        self.assertTrue(all(x.get("ai_checked") for i, x in self.bankq().items() if i != "ctet-cdp-0004"))

    def test_permanent_errors_stop(self):
        for code in (400, 401, 403, 404):
            c = FakeClient([status_error(code), verdict("accept")])
            self.assertEqual(review.main(["--exam", "ctet"], client=c), 3)
            self.assertEqual(len(c.calls), 1)
        self.assertFalse(any(x.get("ai_checked") for x in self.bankq().values()))

    def test_invalid_fix_is_not_applied(self):
        c = FakeClient([verdict("fix", fixed_answer=7), verdict("accept"), verdict("accept")])
        review.main(["--exam", "ctet"], client=c)
        b = self.bankq()["ctet-cdp-0001"]
        self.assertEqual(b["answer"], 1)
        self.assertFalse(b["ai_checked"])
        self.assertIn("needs a human", b["ai_review"]["note"])

    def test_missing_key_exits_cleanly(self):
        import os
        saved = os.environ.pop("ANTHROPIC_API_KEY", None)
        try:
            self.assertEqual(review.main(["--exam", "ctet"]), 2)
        finally:
            if saved:
                os.environ["ANTHROPIC_API_KEY"] = saved
        self.assertFalse(any(x.get("ai_checked") for x in self.bankq().values()))

    def test_model_override(self):
        import os
        os.environ["REVIEW_MODEL"] = "claude-sonnet-5-5"
        try:
            c = FakeClient([verdict("accept")] * 3)
            review.main(["--exam", "ctet", "--limit", "1"], client=c)
            self.assertEqual(c.calls[0]["model"], "claude-sonnet-5-5")
        finally:
            del os.environ["REVIEW_MODEL"]

    def test_batch_request_shape(self):
        r = review.batch_request(q(1), "claude-opus-5-5", "2026-11-27")
        fmt = r["params"]["output_config"]["format"]
        self.assertEqual(fmt["type"], "json_schema")
        self.assertFalse(fmt["schema"].get("additionalProperties", False))
        self.assertEqual(r["custom_id"], "ctet-cdp-0001")


if __name__ == "__main__":
    unittest.main()
