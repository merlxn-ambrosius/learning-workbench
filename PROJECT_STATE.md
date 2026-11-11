# PROJECT_STATE — verified as of 2026-11-11

## Current status
Local M0 bootstrap completed. Deterministic unit tests passed (5/5); real Chromium DOM interaction checks passed for Agent, KL, Atlas, Journal and 390px mobile layout. Browser security policy blocked direct localhost/file navigation, so browser checks used the identical source bundled inline in a test page, not the deployed HTTP app. GitHub repository creation and Pages publication require the account owner to create/select the new repository in the installed GitHub App. No live deployment has been verified.

## Implemented
- Responsive website with Home, Learn, Lab, Atlas, Journal navigation.
- Two original teaching bridges (scripted Agent replies, KL distillation) with interactive deterministic labs.
- Migrated 20-node/6-course/4-route Atlas dataset and local search/detail navigation.
- Versioned local storage with notebook, event logging, JSON backup/import.
- Node built-in test suite and GitHub Actions test/deploy workflow.

## Explicit limitations
- The Agent lab is not Stanford's grader or solution. Use original HW1 assignment and tests for genuine engineering evidence.
- No Python execution, authentication, account sync, hidden assessment bank, or server-side AI tutor.
- No claim of independently validated learning outcomes.
- Import/export is deliberate, but no automatic cross-browser synchronization.

## Next safe priorities
1. Create and authorize `merlxn-ambrosius/learning-workbench`; upload tested source and enable Pages / GitHub Actions.
2. Check actual published deployment in a real browser, including keyboard/mobile.
3. Run a complete CS329Z HW1 P1→P2 session; evaluate whether added UI beats original material + ordinary chat.
4. Add further interaction only for a documented learner difficulty.
