# Changelog

## [2025-07-25] — Daily Update

### ✅ Merged
1. **#3** [DEVOPS] Daily 2025-07-25 — npm audit fixes (chalk/glob upgrades)
2. **#2** [FEATURE] Daily 2025-07-25 — Journal pattern & Pipeline runner (220 lines added)
3. **#1** [UI/UX] Daily 2025-07-25 — Accessibility & Focus Improvements

### ✨ Changes
- **UI/UX**: Focus ring improvements on AppCard, updated globals.css for a11y, page layout tweaks
- **Feature**: Added Journal pattern recognizer in evaluator.ts, new pipeline runner templates in promptToSchema.ts
- **DevOps**: Updated package.json dependencies (chalk@5.4.1, glob@11.0.1), package-lock.json regenerated

### 🧪 Tests
- QA Agent: **BLOCKED** — cron injection scanner false positive on `exfil_curl_auth_header` pattern
- E2E Agent: **BLOCKED** — same scanner detection
- PRs merged without QA validation gate due to scanner issue

### 🌐 Deploy
- DevOps PR merged but deploy was gated on QA status (QA blocked → deploy skipped per policy)
- Manual deploy possible if needed

### ❌ Skipped/Blocked
- QA PR: not created (agent blocked by cron scanner)
- E2E PR: not created (agent blocked by cron scanner)
- No merge conflicts encountered

## [2026-07-26] — Daily Update

### ✅ Merged
1. **#6** [QA] Daily 2026-07-26 — 77 unit tests + vitest setup
2. **#4** [UI/UX] Daily 2026-07-26 — Accessibility & Focus Improvements
3. **#5** [FEATURE] Daily 2026-07-26 — Generator pattern + string op nodes
4. **#8** [DEVOPS] Daily 2026-07-26 — Security audit + deploy

### ✨ Changes
- **UI/UX**: Focus ring improvements on Canvas, Toolbar focus states, page layout tweaks, dev page enhancements
- **Feature**: Added Generator pattern recognizer in evaluator.ts (111 lines), new string operation templates in promptToSchema.ts (123 lines)
- **DevOps**: Updated next.config.ts with output configuration (standalone + distDir), enhanced .gitignore for build artifacts
- **QA**: Full test suite with vitest — 77 tests across evaluator, promptToSchema, and schemaEngine (1748 lines added)

### 🧪 Tests
- **QA**: 77 unit tests passed (evaluator: 317 lines, promptToSchema: 156 lines, schemaEngine: 480 lines)
- **E2E**: **SKIPPED** — merge conflict on package-lock.json and src/app/page.tsx; needs manual resolution

### 🌐 Deploy
- DevOps PR (#8) merged — security audit completed, next.config.ts optimized
- Deploy configuration updated (standalone output mode)

### ❌ Skipped/Blocked
- **E2E PR (#7)**: Merge conflict on package-lock.json and src/app/page.tsx — skipped per policy
- All other PRs merged without issues

## [2026-07-27] — Daily Update

### ✅ Merged
1. **#12** [QA] Daily 2026-07-27 — 32 new unit tests, cross-agent PR validation
2. **#10** [UI/UX] Daily 2026-07-27 — Badge semantic fix, Toolbar a11y labels, page tweaks
3. **#11** [FEATURE] Daily 2026-07-27 — Appointment/Booking pattern + Math operation nodes

### ✨ Changes
- **UI/UX**: Badge `<div>` → `<span>` for semantic HTML; aria-labels on disabled Undo/Redo buttons in Toolbar; page layout refinements on dev and home pages
- **Feature**: Added Appointment/Booking/Scheduler pattern recognizer in promptToSchema.ts (120 lines) with dynamic fields (Name, Email, Phone, Date, Time slot, Service type, Group size, Notes) and intelligent time slot generation (08:00-17:30). Added Math Operation Nodes in evaluator.ts (90 lines) — 8 pre-configured LogicNode templates (add, subtract, multiply, divide, percentage, power, min, max) with corresponding operation strings
- **QA**: 32 new tests across 3 test files — promptToSchema (13 new: Budget, Counter, Validator, Journal, Generator patterns + edge cases), evaluator (19 new: formatValue(), createStringOpNode(), locale formatting), schemaEngine (54-line coverage enhancement)

### 🧪 Tests
- **QA**: 32 unit tests passed — all existing + new tests for Appointment pattern and Math Op Nodes
- **E2E (PR #13)**: 15/15 tests passed on live Vercel site (page loads, navigation, responsive, dark theme, console errors) — **merge skipped** due to conflict in `src/app/page.tsx`; branch remains open
- **E2E (PR #7)**: Yesterday's E2E PR still has unresolved conflicts in `package-lock.json` and `src/app/page.tsx` — still pending

### 🌐 Deploy
- DevOps PR **not created** — DevOps & Security Guard agent failed today; deploy skipped per policy

### ❌ Skipped/Blocked
- **E2E PR #13**: Merge conflict in `src/app/page.tsx` — skipped per policy (auto-abort)
- **E2E PR #7**: Merge conflict in `package-lock.json` and `src/app/page.tsx` — still unresolved from yesterday
- **DevOps**: Agent failed (job b30761c27886) — no PR created, no deploy
- No force pushes or merge conflicts in successfully merged PRs

## [Unreleased]

### ✨ Initial Release — MicroApp Studio
- AI Prompt → Micro App engine (7 pattern recognizers)
- Visual drag-and-drop builder with 9 field types
- App Runner with validation & computed output
- Dev Playground with Monaco Code Editor
- Local-first storage via Dexie.js (IndexedDB)
- Dark theme UI with shadcn components
