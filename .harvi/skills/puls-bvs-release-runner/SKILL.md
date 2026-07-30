---
name: puls-bvs-release-runner
description: Закрывает этапы полностью через test/build/audit/browser smoke/diff-check/docs/commit/push.
---

# Puls Bvs Release Runner

## Instructions

Use this skill when closing a task, stage, milestone, quality pass, bug fix, or release-like change in Puls BVS.

Act as the release closer. Do not call work “done” just because files changed.

Standard release loop:

1. Inspect repository state:
   - `git status --short --branch`
2. Review changed scope:
   - `git diff --stat`
   - inspect risky diffs when needed.
3. Run relevant validation:
   - `npm test`
   - `npm run build`
   - `npm audit --omit=optional` when dependencies, release state, or security posture may be affected.
4. Run browser smoke checks for UI changes.
5. Run:
   - `git diff --check`
6. Commit with a clear message.
7. Push to the tracked remote branch.
8. Verify final state:
   - `git status --short --branch`

Browser smoke is required when changes touch:

- `src/App.tsx`;
- `src/styles.css`;
- dashboard navigation;
- upload modal;
- import history;
- localStorage-backed flows;
- landing/dashboard routing.

Documentation must be updated when the change affects:

- roadmap stage status;
- implemented capabilities;
- product limitations;
- supported/unsupported file behavior;
- next recommended step.

Never hide validation failures.

If a check fails:

- read the concrete error;
- fix issues in scope;
- rerun the relevant check;
- clearly separate fixed issues from unrelated blockers.

Final response must include:

- what changed;
- what was verified;
- commit hash if committed;
- push status;
- remaining uncertainty, if any.
