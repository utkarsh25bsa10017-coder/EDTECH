# Practice paper format

One JSON file per paper: `src/data/papers/<exam>/<paper-id>.json`.

```jsonc
{
  "id": "set-01",                       // file name without .json
  "exam": "bpsc-tre",                   // bpsc-tre | bihar-daroga | bpsc-cce | up-si
  "title": { "en": "Practice Set 1", "hi": "अभ्यास सेट 1" },
  "kind": "mock",                       // mock (our own questions) | pyq (official past paper)
  "free": true,                         // free papers are open to everyone; others need the Pass
  "status": "draft",                    // draft (not yet expert-reviewed) | reviewed
  "duration_minutes": 25,
  "marks_per_question": 1,
  "negative_marking": 0,                // marks deducted per wrong answer, e.g. 0.25
  "sections": [
    {
      "id": "A",
      "name": { "en": "General Studies", "hi": "सामान्य अध्ययन" },
      "questions": [
        {
          "id": "A1",                   // section id + number, unique in the paper
          "topic": { "en": "Indian Polity", "hi": "भारतीय राजव्यवस्था" },
          "difficulty": "easy",         // easy | medium | hard
          "text": { "en": "...", "hi": "..." },
          "options": [ { "en": "...", "hi": "..." }, { ... }, { ... }, { ... } ],   // exactly 4
          "answer": 2,                  // 0-based index of the correct option
          "explanation": { "en": "...", "hi": "..." }
        }
      ]
    }
  ]
}
```

For a Hindi-only question (e.g. General Hindi grammar), put the same Hindi text in both `en` and `hi`.
