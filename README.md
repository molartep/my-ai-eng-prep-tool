# AI Engineering Interview Prep

A private, local-first interview preparation workspace for your Mac. Learn the mechanisms, explain decisions, practice realistic failure scenarios, and see what needs another look. The app runs without Ollama and without an internet connection after installation.

## Quick start

Requirements: **Node.js 22.13 or newer**, npm, macOS (Apple Silicon supported). Google Chrome is needed only for the included browser tests. No Docker, cloud database, login, API key or AI model is required.

From this directory, while online for the initial dependency installation:

```sh
npm install
npm run db:setup
npm run build
npm start
```

Open **http://127.0.0.1:3000**. Stop with Control-C. For future offline use, run `npm start` or double-click **Launch AI Prep.command**. The launcher waits for readiness and opens your default browser; keep its terminal window running. If macOS does not associate `.command` files with Terminal, choose Open With → Terminal.

Dependencies, Prisma engines and generated client are installed locally. Normal startup runs existing migrations and an idempotent content import, then serves the built application; it does not call npm install, npx downloads, Vite, a CDN or a cloud API. `dist/`, `node_modules/`, `content/`, `prisma/`, `scripts/`, `server/`, `shared/` and the database must remain in the project directory. Prisma update checks are disabled at startup.

For development:

```sh
npm run dev
```

This starts Express on 127.0.0.1:3000 and Vite on 127.0.0.1:5173. Visit **http://127.0.0.1:5173**. Rebuild with `npm run build` after changing application code before regular offline usage. The production server binds only to 127.0.0.1. An optional `PORT` environment variable selects another local port; the launcher assumes the documented default 3000.

## What is included

- 12 categories, 114 knowledge articles, 353 interview questions, 114 scheduled flashcards and 15 system-design exercises.
- 114 multiple-choice, 99 concept explanations, 99 diagnostic scenarios, 15 architecture questions, 15 short answers, 4 comparisons, 4 true/false and 3 multiple-select questions.
- Definitions, mechanisms, practical examples, limitations, misconceptions, interview quick answers, deep dives, related concepts and offline source attribution.
- Core, Strong and Expert reference answers for every question.
- Topic and difficulty filters, SQLite FTS5 global search, saved questions/topics, personal notes, confidence tracking and previous attempts.
- Mixed quizzes, targeted weak-area practice, deterministic daily sessions, spaced repetition and timed interviews with optional follow-ups.
- Progress, category mastery, daily activity, quiz/interview trends, confidence calibration and persisted history.
- Optional loopback-only Ollama evaluation with structured validation and failure fallback.
- Portable JSON export/import and complete SQLite snapshots with a safety-copy restore script.

The curriculum consolidates related items from the requested topic list into articles; it is extensible rather than a separate article for every listed term. Content is original educational synthesis, not copied lessons or a repository mirror. See `content/RESEARCH.md` for provenance, scope and source mapping.

## Study workflow

1. **Knowledge base:** search or select a category, study the mechanism and example, then switch to Interview answers. Set a learning marker or add a personal note.
2. **Practice this topic:** answer before revealing references. Objective formats receive exact answer-set scores and an explanation of every option.
3. **Open-ended answers:** submission saves your response without pretending to grade semantics. Check concepts you explained correctly, inspect the weighted rubric and assign a 0–5 self-assessment. A term appearing in your answer is not enough to count as understanding.
4. **Reference levels:** Core is the minimum correct distinction, Strong adds the mechanism and example, Expert adds trade-offs and production failure implications.
5. **Weak areas:** review topics whose graded attempt average is below 70%. Targeted sessions prioritize the latest low-scoring questions and questions marked Difficult. Difficult flags work before any score exists.
6. **Flashcards:** recall before revealing, then choose Again, Hard, Good or Easy. Schedules persist in SQLite. New cards start due.
7. **Interviews:** choose category, difficulty, question count and duration. The timer is based on persisted session creation time and continues while the page is closed. Answer, assess and advance. A saved active question reappears with its feedback when you return. Optional follow-ups add a deeper related question; with AI feedback, the evaluator's contextual follow-up is used. End session creates a report. Unreached and ungraded questions remain identifiable.
8. **Dashboard:** Continue learning opens an in-progress topic; daily practice mixes unseen, due, difficult and weak questions. Resume restores an unfinished session.

`⌘ K` focuses global search. `⌘ Enter` submits a free-text answer. Tab navigation and labeled inputs work throughout. Bookmarks are available through Knowledge base → Saved; question notes and attempts appear below practice questions.

## Honest progress calculations

- **Per-question contribution:** mean of the latest three graded attempts (0–100). Ungraded attempts do not count; unseen questions contribute zero.
- **Topic/category mastery:** average those question contributions across every question in that topic/category. This includes coverage, so mastering one question cannot produce 100% for an entire category.
- **Analytically mastered topic:** topic mastery at least 80%. Your manual Not started/Learning/Understood/Mastered marker is a separate preference.
- **Correct attempts:** any graded attempt at least 80%; this includes explicitly labeled self and AI assessments, not only deterministic choices.
- **Objective scoring:** exactly the complete correct set = 100; otherwise 0. No partial credit for multiple-select.
- **Self-assessment:** 0–5 maps linearly to 0–100. AI-generated scores are always labeled and are not ground truth.
- **Weak topics:** scored-attempt average below 70%; recent-question priority uses latest grades.
- **Streak and activity dates:** America/Bogota calendar days. A streak may end yesterday if you have not practiced today.
- **Study time:** time on an answer view before submission, not passive reading or background tabs. It is reported as focused practice time; it is an estimate.
- **Confidence calibration:** group graded attempts by pre-answer confidence; flag high-confidence scores below 60 for review.

Spaced repetition uses a deterministic SM-2-inspired algorithm, not a claim of implementing canonical SM-2: Again resets repetitions and is due in 10 minutes, decreasing ease by 0.2 (floor 1.3). Hard grows the previous interval by 1.2 with a one-day minimum and decreases ease by 0.15. Good schedules 1 day, then 3 days, then previous interval × ease. Easy starts at 4 days or grows by ease × 1.3, increasing ease by 0.15. Day intervals are rounded and increase by at least a day on regular successful reviews. These rules are tested in `shared/learning.ts`.

## Optional Ollama

Install Ollama and a model separately while internet is available. Start Ollama locally, then enable **Settings → Optional local AI**, check availability and choose an installed model. The application never assumes a model, downloads one or connects to an arbitrary AI URL.

Only **http://127.0.0.1:11434** is used. Models whose names contain `cloud` are excluded. To keep the optional provider itself strictly local, configure Ollama with `OLLAMA_NO_CLOUD=1` ([official FAQ](https://docs.ollama.com/faq)); provider-side behavior is outside this app's control. When Wi-Fi is disabled, locally installed models remain usable.

Submit an open response, then choose Evaluate with local AI. The request includes the question, difficulty, reference, concepts and rubric. The response must validate as structured JSON with score, correct/missing concepts, incorrect statements, feedback, improved answer and follow-up. Availability checks time out after 2 seconds and evaluation after 90 seconds. Invalid JSON, missing models and transport failures leave your answer saved and offer self-assessment. A local judge can make mistakes; compare it with the rubric.

## Database and backups

The persistent database is **data/study.db**. Browser storage is not the source of truth. `.env` contains only its local SQLite path, not secrets. Migrations run automatically at startup; seed updates never remove progress or delete prior content IDs.

In **Settings → Back up your learning**:

- Export portable backup downloads JSON containing curriculum, references, attempts, assessments, sessions, notes, bookmarks, review schedules/events and preferences.
- Import JSON validates all content, IDs, rubric weights and relationships first. It adds missing records and keeps existing records on ID collisions, including preferences. This is a merge, not a replacement. Older backups do not overwrite newer local progress.
- Download SQLite snapshot creates a consistent `VACUUM INTO` snapshot in `data/backups/` and downloads it. The generated copies remain on disk until you remove them.

For an explicit full replacement from a SQLite snapshot, stop the application first:

```sh
node scripts/restore-sqlite.mjs /absolute/path/to/snapshot.db --replace
npm start
```

The script verifies SQLite integrity and application tables, refuses replacement while the default server is running, and writes a safety snapshot under `data/backups/` before replacing `data/study.db`. The `--replace` flag is required. Back up that directory somewhere durable. The script targets the default database and checks the default port; if you customize paths or ports, stop all processes and restore the configured file deliberately instead.

## Add questions and refresh content

`content/knowledge-base.json` is the complete validated import format. It contains categories, articles, questions and sources. Use existing records as examples. Each question needs a unique ID, valid topic ID, difficulty, one of the eight supported types, all three answer levels, key concepts, meaningful reference answers, a rubric totaling 100, mistakes, related source IDs and a follow-up. Objective questions require valid options and correct option IDs. Multiple-choice uses four options and one correct; true/false uses two; multiple-select uses four and one or more correct answers.

```sh
npm run content:import
# Or import another complete validated content bundle:
npm run content:import -- /absolute/path/to/content.json
```

For updating the original authoring material, edit `content/concepts.txt` and `content/designs.txt`, then:

```sh
npm run content:generate
npm run content:import
```

Generating rebuilds the checked-in JSON from authoring rows. Direct JSON edits would be overwritten by generation, so choose one editing path or incorporate changes into the generator. The importer reports new and changed articles/questions and uses transactional upserts; duplicate IDs and malformed bundles are rejected before any content writes. It retains omitted existing IDs to preserve history.

Refresh is deliberately manual: research a changed official page while online, update the original explanation and reference retrieval date/version, validate, inspect the import's reported changes, then import. There is no background crawler or runtime content refresh. The app needs no internet for existing source attribution. Source links open only on deliberate clicks.

## Tests and offline verification

```sh
npm run build
npm test
npm run test:e2e
```

Unit/integration tests use temporary databases, covering content targets, initialization, invalid ingestion, duplicate detection, quiz scoring, answer persistence, mastery, streaks, review scheduling, interviews, FTS search, JSON and SQLite backups, optional AI detection and failure handling. The startup test creates a fresh database, submits an answer, stops the complete server, restarts it and checks preserved data; it uses local port 3031.

Browser tests start the production server on 3000 with **data/e2e.db**, never your study database. They use installed Google Chrome on macOS; edit `playwright.config.ts` if the browser is elsewhere. Stop your regular application on port 3000 before running these tests. External requests are blocked, and the main workflow asserts that none are attempted. Desktop and mobile screenshots are saved under `test-results/`. Tests cover study, objective quiz, self-assessment, bookmarks, notes, flashcards, timed interviews, follow-ups, search, light/dark themes and responsive navigation.

For a manual physical offline check: complete installation/build once, disable Wi-Fi, run `npm start`, browse an article, answer a quiz, self-assess a scenario, rate flashcards, complete an interview and export a backup. Stop and restart, then confirm history. Browser DevTools Network should show only the local origin; optional Ollama is contacted by the backend only after opt-in. The automated checks simulate blocked external browser networking and verify real process restart, not an actual Mac reboot.

## Project layout

```text
src/                 React UI, Tailwind styles, shadcn-style Radix/CVA button
server/              Express API, Prisma access, import/search, backups, Ollama
shared/              Zod content schemas and deterministic learning algorithms
prisma/              SQLite schema and checked-in migration
content/             Original authoring data, import bundle, offline references
scripts/             Initialization, content import/generation, startup, restore
tests/               Unit/integration, process restart and browser checks
data/                Local database and snapshots (ignored by Git)
PLAN.md              Implementation status, verification and limitations
```

## Practical limits

The initial curriculum is curated and consolidated, not an exhaustive reference for every framework feature. Framework material teaches concepts, not deprecated method-name memorization. No complex web crawler, voice interview, account system, cloud synchronization or coding laboratory is included. Interview answers are written; self-assessment is essential without a local model. SQLite provides persistence, not device-loss protection: keep exported backups. Performance scores mix explicitly labeled evaluation methods and should be interpreted with the rubric.
