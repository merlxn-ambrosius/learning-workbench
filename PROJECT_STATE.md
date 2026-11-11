# PROJECT_STATE — verified as of 2026-11-11

## Current status
Public repository `merlxn-ambrosius/learning-workbench` exists and GitHub Actions `Verify and deploy LEARN` completed successfully (run `42975951120`, attempt 2). The user confirmed the public Pages site works in their browser. Previous local M0 smoke tests covered Agent, KL, Atlas, Journal and 390px mobile layout. The Sync guide and UI are available on that baseline. The micrograd and KL changes below have been checked on the contribution branch. The requested additional private repository has not yet been created or authorized.

## Implemented
- Responsive website with Home, Learn, Lab, Atlas, Journal, Sync navigation.
- Three original teaching bridges (scripted Agent replies, KL distillation, shared-input sensitivity). The micrograd route is shared by Learn and Lab.
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

## Micrograd and KL contribution

The new route is `#/learn/micrograd`. Two programs begin with equal operands. One reads the same input twice, the other captures the second factor at the starting value. Both receive the same input perturbation. The quotient is a finite-step measurement. The table retains different steps at the same starting value. [Course index](https://karpathy.ai/zero-to-hero.html) · [First lecture, shared-node episode](https://www.youtube.com/watch?v=VMj-3S1tku0&t=4948s) · [Official engine](https://github.com/karpathy/micrograd/blob/7bc720e951fe422b8f8814aa5aa1b64121d26b4c/micrograd/engine.py)

**Design decision.** The prior KL lab exposed the update direction before its prediction prompt, used different probabilities for the question and the adjustable chart, and labeled a saved response independent even after displaying the explanation. The revised KL lab identifies its 95% reference point, delays the signed gradient until requested and preserves keyboard focus. New judgments record the observable context. Old journal events retain their original wording.

For micrograd, a static worked example is a credible baseline. Paired measurements earn their place if changing the step or starting value helps a learner explain which operand moved and independently check a new expression. A graph editor or mandatory prediction would add work before the first comparison. Schwartz and Bransford studied the use of contrasting cases before instruction in college psychology. Applying that idea to a programming task is a design hypothesis. If learners transfer just as well from the static pair with less effort, retain the static pair. [Original study](https://aaalab.stanford.edu/assets/papers/earlier/A_time_for_telling.pdf)

**Data compatibility.** Old v1 JSON is accepted. The optional `micrograd` field stores the current condition, help opened and drafts for up to twelve conditions. Pre-measurement and post-measurement text are separate. Journal links back to drafts and its existing export/import includes them. The local Python files are an original exercise and a labeled public example.

**Reproducible walkthrough.** Run `npm test`, then open the app in a disposable browser profile.

1. Enter micrograd from Learn or Lab. Measure without writing. Switch to new conditions, write a prediction, measure and add an observation. Restore each condition after a reload.
2. Compare steps at the same base, then change to a zero or negative starting value. Check the displayed operand values and quotients against the two multiplication programs.
3. Download both Python files into one directory and run `python3 check_example.py`. The starter checks forward computation and reports the unfinished gradient with exit status 2. Implement `grad` and rerun the public example.
4. At a narrow width and with keyboard-only controls, open a hint, change a condition, measure and activate the skip link. Export and reimport in a separate profile. A legacy v1 backup should still restore its original data.
5. In the KL lab, open and close the derivation, refresh, then save a judgment. Check its context in Journal.

Chromium walkthroughs covered 320, 390 and 1280 px layouts, JSON restore and blocked browser storage. These checks verify software behavior. Transfer, retention and relative benefit against static examples still require learner observations.
