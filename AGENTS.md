# LEARN Workbench — agent collaboration contract

Read `README.md`, `PROJECT_STATE.md`, `DECISIONS.md`, and [`SYNC.md`](SYNC.md) before changing the project.

## Mission
Build a learner-controlled workspace supporting expert competence: derive, implement, debug, evaluate, and transfer mechanisms in new settings. Prefer strong external courses and authentic work over homemade breadth.

## Product responsibility
LEARN is the planning and integration owner of this platform. Plan the platform at the subject, knowledge-block and course levels first. Treat contributions from individual lessons as course activities. Cross-listed courses use the same canonical ID and at most three subject tags. The full knowledge map, subject and block lenses and each course neighborhood share one set of node IDs, coordinates and directed relationships. Only a concrete learning dependency gets an edge; book membership and reading order are separate. Keep each authored prerequisite inspectable; open registration and direct navigation remain available. A contributing chat can repair a reproducible defect or propose a lesson based on public materials. Bring curriculum priorities, data policy changes, and assessments of independent competence to the owner with a concrete alternative. Keep current status in `PROJECT_STATE.md` and durable decisions in `DECISIONS.md`. See [the outstanding product review](REVIEW.md).

## Working rules
- **Source first:** identify the original lecture/assignment/code and version. Never claim a simulated demo implements an official grading contract.
- **Small educational unit:** start with one actual learner difficulty. A useful plain explanation may beat a widget; only add interaction when it changes learning behavior.
- **Learner agency:** offer clear explanation, optional hints, and independent attempts; do not require repeated quizzes to access materials.
- **Evidence separation:** guided completion, independent reasoning, and transfer are different claims. No invented mastery percentages.
- **Change isolation:** one branch/PR per unit or targeted fix. Preserve previous learning data and stable node IDs.
- **Privacy:** never commit personal records, hidden assessment banks, API tokens, or sensitive data. Public Pages is public. A separate private repository is for *explicitly selected* backups, never a reason to copy private material into public PRs.
- **Checks:** `npm test` + real browser click-through + responsiveness/keyboard; report unverified items.
- **Do not build a platform for the sake of a platform.** Compare custom features against external course + ordinary conversation.

## Technical entrypoints
- `site/index.html`, `site/styles.css`, `site/app.js`: no-build shell, routes and event wiring.
- `site/workbench.mjs`: subject and course navigation, search and legacy entry points.
- `site/knowledge-catalog.mjs`, `site/handbook-catalog.mjs`: canonical courses, blocks, identified source sections and original LEARN exercises.
- `site/universe-model.mjs`, `site/knowledge-universe.mjs`, `site/knowledge-graphs.mjs`: one global graph, scoped views and course activities.
- `site/progress-store.mjs`: local write and recovery boundary.
- `site/logic.mjs`: deterministic education mechanics; pure-function tests in `tests/`.
- `site/data/atlas.json`: original Atlas v2 data preserved for optional navigation, not a complete curriculum.
- `SYNC.md` and the website `Sync` page: handoff workflow for other conversations, with explicit private/public boundaries.
- `.github/workflows/verify-and-deploy.yml`: checks and static Pages deployment.

This is the M0/M1 bootstrap, not a commitment to remain framework-free. Adopt React/MDX when concrete complexity justifies the build chain, with behavior-preserving tests and an explicit migration PR.
