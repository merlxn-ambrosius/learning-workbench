# PROJECT_STATE — verified as of 2026-11-11

## Current status
Public repository `merlxn-ambrosius/learning-workbench` exists and GitHub Actions `Verify and deploy LEARN` completed successfully (run `42975951120`, attempt 2). The user confirmed the public Pages site works in their browser. Previous local M0 smoke tests covered Agent, KL, Atlas, Journal and 390px mobile layout. This revision adds a public/private Sync guide and UI without claiming new learning-effect validation. The requested additional private repository has not yet been created or authorized.

## Implemented
- Responsive website with Home, Learn, Lab, Atlas, Journal, Sync navigation.
- Two original teaching bridges (scripted Agent replies, KL distillation) with interactive deterministic labs.
- Migrated 20-node/6-course/4-route Atlas dataset and local search/detail navigation.
- Versioned local storage with notebook, event logging, timestamped JSON backup/import; private-backup manual upload instructions.
- Node built-in test suite and GitHub Actions test/deploy workflow.

## Explicit limitations
- The Agent lab is not Stanford's grader or solution. Use original HW1 assignment and tests for genuine engineering evidence.
- No Python execution, authentication, account sync, hidden assessment bank, or server-side AI tutor.
- No claim of independently validated learning outcomes.
- Import/export is deliberate, but no automatic private GitHub upload or cross-browser synchronization.
- GitHub tools available to the assistant cannot create a new repository; user must create and grant access to the private repository.

## Next safe priorities
1. Owner creates and authorizes `merlxn-ambrosius/learning-workbench-private`; initialize backup directions without copying personal data into public repo.
2. Run an end-to-end private JSON export → private upload → restore rehearsal, safeguarding the original state.
3. Run a complete CS329Z HW1 P1→P2 session; evaluate whether added UI beats original material + ordinary chat.
4. Add further interaction only for a documented learner difficulty.
