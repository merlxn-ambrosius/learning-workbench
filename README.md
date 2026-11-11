# LEARN Workbench

> Continue thinking, not starting over. 先学真实课程，再为真正需要的机制添加交互。

A small, browser-first educational workspace for independent study and future agent-assisted maintenance. It combines two interactive teaching bridges, recovered Atlas navigation, and private browser-local learning notes. **It is not a complete university course or a certified skills test.**

## Start locally

Requires Python 3 for serving static files (or any static HTTP server). Node.js 20+ is used for pure-function tests.

```bash
python3 -m http.server 4173 --directory site
# open http://localhost:4173
node --test tests/*.test.mjs
```

No dependency install, API key, or paid backend is needed for the current alpha. Do not double-click `site/index.html` as a `file://` URL: the Atlas JSON is fetched over HTTP.

## Pages deployment

1. Create a new **public** repository `learning-workbench` under your GitHub account. Public is suitable for Github Free Pages; **do not commit private data**.
2. Grant the connected GitHub App access to this repository in GitHub → Settings → Applications → Installed GitHub Apps → Configure → Repository access (select only this new repository).
3. Push the project files to `main` (this repo's root should contain `.github`, `site`, `tests`, and `README.md`).
4. In the repository Settings → Pages → Build and deployment, select **GitHub Actions**.
5. Verify **Actions → Verify and deploy LEARN** succeeds; then visit `https://<owner>.github.io/learning-workbench/`.

The site uses relative asset and data paths, so a project-path `/<repo>/` works without Vite `base` config.

## What is real, and what is a teaching simulation?

- **Real and tested in source:** the KL(P||Q) calculations and softmax-logit gradient; deterministic script normalization, counting and digest; local data import/normalization; Atlas data loaded from previous project.
- **Original illustrative content:** two short learning bridges and scripted examples. The Agent simulator is not the official CS329Z exercise, grader, or a real model call.
- **Requires external work:** CS329Z HW1 Problem 1 (`priority`) and Problem 2 (`daily_digest`) should be completed in Stanford's own repository and checked against its contract; follow its AI-use and academic rules.
- **Not included:** private authentication, cross-device sync, Python execution, live agent services, hidden evaluation banks.

## Data and privacy

Learning notes and experiments use `localStorage` key `learn-workbench.progress.v1`, stay in the current browser profile, and are not uploaded to GitHub. Export backups from Journal before browser cleanup or device changes. Browser localStorage can be cleared or blocked; backups are essential. Import replaces the current browser record with user confirmation. There is no telemetry.

## Add a unit without breaking the experience

1. Capture the real difficulty and original source/assignment version in an Issue.
2. Try an explanation or concrete exercise before inventing a new widget.
3. If interaction is worthwhile, add a minimal module and automated domain tests.
4. Keep simulated behavior and official requirements clearly differentiated.
5. Test browser behavior, accessibility, keyboard and mobile layouts; open a PR.
6. Record any changes to stable learning data and update `PROJECT_STATE.md`.

See `AGENTS.md` and `DECISIONS.md`. The old Atlas JSON is retained as a *reference and navigation index*, not forced prerequisite gating.

## License

Project source code: MIT (`LICENSE`). Migrated Atlas educational content was developed within the user's project; external courses, brands, and links retain their original ownership. Do not paste external copyrighted lessons into this repository without permission.
