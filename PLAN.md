# AI Engineering Interview Prep — implementation status

## Architecture
Local single-user application: React 19 + TypeScript + Vite 6, Tailwind 3, a shadcn-style Radix Slot/CVA button primitive, Lucide, React Router and Recharts. Express 5 REST API, Prisma 6.19 and SQLite FTS5. Database: data/study.db. Production serves bundled assets at http://127.0.0.1:3000 and binds only to loopback. Source explanations and attribution are local. Runtime networking is limited to explicitly enabled loopback Ollama; source links are deliberate optional navigation.

## Phases completed
- [x] Foundation — project, schema, checked-in migration, production build, startup, sidebar, dark/light themes and dashboard.
- [x] Knowledge — 12-category navigation, articles, quick/deep explanations, examples, misconceptions, related topics, source metadata, filters and SQLite full-text search.
- [x] Practice — eight question types, exact objective scoring, saved free-text responses, structured self-assessment, weighted rubrics, Core/Strong/Expert answers and session reports.
- [x] Learning progress — saved attempts, latest-three mastery algorithm, manual learning markers, question history, bookmarks, notes, weak areas, daily study, confidence calibration, flashcards and persisted review schedules/events.
- [x] Interview simulator — configuration, persistent sessions, deadlines, question progression, deterministic follow-ups, AI-feedback follow-ups when available, history and results.
- [x] Optional local AI — opt-in detection, installed local model selection, rubric-based evaluation, structured validation, timeouts, failure fallback and differentiated score provenance.
- [x] Finalization — offline browser checks, process-restart test, JSON merge restore, consistent SQLite snapshots, explicit full restore with safety copy, README and executable macOS launcher.

## Content coverage
Validated import contains **114 articles, 353 questions, 114 flashcards and 15 system-design exercises**. All 12 categories are populated. Articles consolidate related curriculum items; this is not one article for every bullet in the requested outline.

| Type | Count |
|---|---:|
| Multiple choice | 114 |
| Multiple select | 3 |
| True / false | 4 |
| Explain a concept | 99 |
| Scenario | 99 |
| Architecture | 15 |
| Short answer | 15 |
| Compare concepts | 4 |

Questions include meaningful reference explanations, rubric weights totaling 100, key concepts, misconceptions, source IDs and three answer levels. Numerical RAG metric examples and interpretation sections cover precision/recall, hit rate, MRR, MAP, NDCG, context precision/recall, faithfulness and answer correctness. Priority content includes an expanded agent-loop deep dive and explicit agent/workflow, LangChain/LangGraph, MCP/function-calling, skills/tools/MCP and retry/resume comparisons. Architecture MCQs have individually authored failure traps.

Research provenance: public repository README/curriculum reviewed at b6a7a1706bae08c6b4e90f2d9dbfd997f8cbe126. Official OpenAI, Anthropic, Hugging Face, LangChain/LangGraph, MCP, Agent Skills, LlamaIndex, Microsoft, Google and Ollama documentation plus research papers and Stanford's IR book were consulted. Source metadata and scope are in content/references.json and content/RESEARCH.md. Explanations are original synthesis; references support concepts rather than purported verbatim architecture prescriptions.

## Verification
- Production TypeScript check, Vite build and backend bundle: passed.
- **27 automated tests**: passed, including schema/content validation, duplicate and malformed bundle rejection, idempotent ingestion, exact quiz scoring, ungraded free text, self-assessment persistence, mastery/streak/review calculations, interview persistence/deadlines/follow-ups, confidence calibration, bookmarks/notes, FTS, backup validation/merge/fresh restore, SQLite snapshot, Ollama detection/invalid JSON/transport failures, cross-origin rejection and complete server restart.
- **4 browser tests**: passed with external requests blocked, covering dashboard → article → quiz → saved review; free response → self-assessment → notes/bookmarks → flashcards; timed interviews/follow-ups/search/theme; mobile navigation and viewport fit.
- Desktop screenshot inspected; mobile viewport overflow checked. Screenshots: test-results/dashboard.png and test-results/mobile.png.
- Fresh SQLite initialization and actual process stop/restart verified using a temporary database. Full SQLite restore script exercised in a temporary project with a safety snapshot.
- Main data/study.db verified to contain content and **zero test attempts/sessions**. Unit tests use temporary databases; browser tests use data/e2e.db.

## Remaining verification and practical limitations
- No live Ollama model evaluation was performed. The local adapter, successful structured-response path and failures were tested with mocks; actual quality depends on the installed model and machine.
- No physical Mac reboot or Wi-Fi toggle was performed. Automated verification blocks external browser connections and tests real server restart, while application code has no required external runtime service.
- Study time estimates time on an answer view before submission, not passive article reading. Confidence and score analytics include clearly differentiated deterministic, self and AI methods.
- Curriculum is curated/consolidated and can grow; it does not cover every evolving framework/protocol feature as a separate article. Refresh is a manual developer import workflow.
- SQLite restore deliberately replaces data only with --replace and first creates a safety copy; JSON imports merge and preserve existing ID collisions.
- Written interview practice is implemented; voice interviews and a complex crawler are outside the initial scope.
- Vite reports an advisory about the chart-containing frontend bundle exceeding 500 KB before gzip (about 229 KB gzipped). This does not introduce a network dependency or affect offline startup.

## Usage
Dependencies, schema, seeded content and production assets are ready. Run npm start or Launch AI Prep.command. See README.md for development, adding/updating content, optional Ollama, backup/restore and testing.
