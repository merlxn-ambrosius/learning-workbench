# LEARN · Cross-chat contribution and private backup

> This document is intended for humans **and** GitHub-enabled learning agents. Public teaching code and personal learner data are separate by design.

## Repository boundaries

| Destination | Visibility | Purpose | Never place here |
| --- | --- | --- | --- |
| `merlxn-ambrosius/learning-workbench` | **public** | Website, reusable teaching units, original diagrams, source links, tests, documentation | Personal learning journal, conversation transcripts, authentication material, confidential rubrics or unpublished assessments |
| `merlxn-ambrosius/learning-workbench-private` | **private**, owner must create and authorize | Explicitly selected JSON snapshots from Journal, personal learning progress and private handoff documents | Plaintext passwords, access tokens, third-party confidential data, unnecessary raw conversation dumps |

**Private GitHub storage is not end-to-end encryption.** GitHub and those granted access to the repository can potentially access its contents. Consider client-side encryption separately if higher confidentiality is needed. Never build or publish a GitHub personal access token, OAuth secret or GitHub App private key into static Pages or `localStorage`.

## Contributing from another ChatGPT conversation / agent

1. Ensure this conversation has a GitHub connector with access to `merlxn-ambrosius/learning-workbench`. Chat history and local browser data are not automatically readable across conversations.
2. State the learning goal and material **in the current conversation**. Distinguish what the learner explicitly said or confirmed from an assistant's proposal. If critical context is in another conversation, share the relevant source or use an authorized context lookup; do not invent it.
3. Read the current repository's `README.md`, `AGENTS.md`, `PROJECT_STATE.md`, `DECISIONS.md`, this `SYNC.md`, and the actual files being changed. Validate any source links and the external course/assignment version.
4. Scope a minimal teaching improvement around one observed difficulty. Prefer established course materials and existing components. Do not copy third-party textbooks or official solutions without permission. A linked source is not a license.
5. Open a new branch, edit files, add/repair tests, run `npm test`, and exercise the changed UI when a browser is available. State clearly what was or was not run. Do not bypass existing tests or silently revise private data schemas.
6. Create a Pull Request with the learning goal, source/provenance, visible changes, verification, known limitations, and screenshots if useful. Leave merge to the repo owner unless specifically authorized. After merge, main's existing GitHub Pages workflow publishes the public learning content.

Do **not** use public Issues, PR descriptions, filenames, CI logs or screenshots as a place to dump the learner's private notes or a complete private conversation. A hypothetical teaching example is not independent evidence of the learner mastering it.

### Copyable prompt for another learning conversation

> Please integrate the **publicly shareable educational results of this conversation** into `merlxn-ambrosius/learning-workbench` using the connected GitHub app. First inspect `README.md`, `AGENTS.md`, `PROJECT_STATE.md`, `DECISIONS.md`, `SYNC.md`, and relevant source. Build one minimal, useful lesson or interaction for the specific learning difficulty, preserving source/provenance and tests. Use a branch and Pull Request (do not silently write to main), report what you verified, and give me the PR link. Do not publish my personal notes, raw conversation, private test material, tokens, or API keys. If GitHub is not available, say so instead of claiming the work is synced.

## Private progress backups — current safe path (manual upload)

1. Create a separate **private** repository `merlxn-ambrosius/learning-workbench-private` (with a README and with **Pages disabled**). Keep it separate from the public site.
2. Open the public site's **Journal → 导出我的记录**. It downloads a timestamped `learn-progress-*.json` containing the current browser-local study state.
3. In the **private** GitHub repository use **Add file → Upload files**, and commit the downloaded JSON as a new snapshot. Multiple timestamps are intentionally preserved. If the private repo is connected to ChatGPT, you can instead explicitly give an agent the exported JSON and ask it to commit a *new snapshot* there after checking visibility.
4. To restore, download the chosen JSON snapshot, open **Journal → 导入备份**, and confirm replacement. Import currently **replaces**, rather than merges, this browser's notes and events; first export the current state to avoid data loss.
5. A local export is not a verified remote backup. Check that the file appears in the **private** repository before relying on it. Occasional offline copies are prudent.

The public static site **cannot automatically read or write private repositories** with the existing GitHub ChatGPT app connection. The GitHub connector used by a ChatGPT conversation is not a credential that the website can borrow. True browser-to-private-repository syncing requires separately designed user authentication, write permissions, conflict resolution, and clear recovery semantics. This functionality is **not implemented** in the v0.1 site.

### Suggested private repository structure (to initialize after account authorization)

```text
README.md                 # Private-data purpose and recovery instructions
snapshots/
  YYYY-MM-DDTHH-MM-SS-sssZ.json
handoffs/                  # Optional, explicitly selected private summaries
```

Naming above is an organizational convention, not a required JSON schema. For manual GitHub uploads, placing `learn-progress-*.json` in the private repository root is also acceptable until these folders exist.

## What "sync" means today

| Sync operation | Current status |
| --- | --- |
| Another ChatGPT conversation proposes a new lesson and creates PR | **Supported** with connected GitHub permissions |
| Merge PR and publish Pages site | **Supported** by existing Actions workflow |
| Browser Journal exports/restores versioned JSON | **Supported** |
| Store an exported JSON snapshot in an extra private GitHub repo | **Supported after repository creation and manual upload** |
| Browser records appear in private GitHub automatically | **Not implemented** |
| Multiple browsers merge learning progress safely | **Not implemented** |
| Other agents automatically know the contents of all prior chats | **Not supported** |
