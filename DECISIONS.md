# DECISIONS — short decision register

- D01: GitHub source and PR review are the shared project context across conversations/agents; chat history is not the source of truth.
- D02: Existing mature courses provide the continuous spine. Custom lessons are bridges, not competing complete rewrites.
- D03: Atlas is optional navigation; Evidence Studio remains a later reusable experiment pattern, not the mandatory first screen.
- D04: Personal data defaults to browser-only versioned storage, with explicit JSON backup. Public repo/site must not store user records or secrets.
- D05: First shipping gate is one working site with a small pedagogical lab, not account management or adaptive tutor orchestration.
- D06: Use dependency-free ES modules for the initial, testable static bootstrap. Review React + TypeScript + MDX when a real content-growth use case warrants migration. This supersedes the earlier framework-first assumption only for M0.
- D07: Independent competence cannot be inferred from site interactions or official-looking scores. Authentic source assignments and unfamiliar changes remain essential.

- D08: Cross-chat lesson updates go through GitHub branches and PRs. A chat must inspect current repo and current-chat sources; there is no automatic cross-chat context sharing.
- D09: Store personal snapshots in a separately authorized private repository. The public site can export and import JSON but does not hold GitHub write credentials or provide automatic remote sync. Preserve timestamped backups and clarify that imports replace local records.

- D10: The micrograd bridge compares two programs at the same starting value and perturbation. Keep optional pre-measurement writing and post-measurement explanation separate for each condition. The KL lab also places the derivation behind an explicit choice. Record observable help context. Learning and transfer require independent learner work.
