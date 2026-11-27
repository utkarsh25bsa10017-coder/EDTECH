# Paper format

One JSON file per paper. Free papers: `web/src/data/papers/<exam>/<paper-id>.json`
(public, in the static build). Paid papers: `content/papers/<exam>/<paper-id>.json`
(never in the static build; served by `GET /api/papers/{exam}/{id}`). The build
refuses a file in `web/src/data/papers/` with `"free": false`.

```jsonc
{
  "id": "set-01",                       // file name without .json; [a-z0-9-]
  "exam": "bpsc-tre",                   // bpsc-tre | bpsc-cce | mppsc | ras | bihar-stet | ctet | cg-tet
  "title": { "en": "Practice Set 1", "hi": "अभ्यास सेट 1" },
  "kind": "free",                       // free | mock | sample | probable | pyq
  "free": true,                         // true only for papers in web/src/data/papers
  "status": "draft",                    // draft (not yet expert-reviewed) | reviewed
  "duration_minutes": 25,
  "marks_per_question": 1,
  "negative_marking": 0,                // marks deducted per wrong answer, e.g. 0.25 or 0.33
  "sections": [
    {
      "id": "A",
      "name": { "en": "General Studies", "hi": "सामान्य अध्ययन" },
      "questions": [
        {
          "id": "A1",                   // section id + number, unique in the paper
          "qid": "bpsc-tre-gs-0001",    // the question's id in content/bank (optional for old sets)
          "topic": { "en": "Indian Polity", "hi": "भारतीय राजव्यवस्था" },
          "difficulty": "easy",         // easy | medium | hard (optional)
          "text": { "en": "...", "hi": "..." },
          "options": [ { "en": "...", "hi": "..." }, { ... }, { ... }, { ... } ],   // 4, or 5 where the exam uses a 5th option
          "answer": 2,                  // 0-based index of the correct option
          "explanation": { "en": "...", "hi": "..." }
        }
      ]
    }
  ]
}
```

- For a Hindi-only question (e.g. General Hindi grammar), put the same Hindi text in both `en` and `hi`.
- RPSC-style fifth option "not attempted" (E): give it text containing "not attempted" / "अनुत्तरित"; the
  site scores picking it as a skip, not a wrong answer.
- Scoring: `+marks_per_question` per right answer, `−negative_marking` per wrong answer, 0 for a skip.
