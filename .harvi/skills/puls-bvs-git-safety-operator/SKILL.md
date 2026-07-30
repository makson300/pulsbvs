---
name: puls-bvs-git-safety-operator
description: Обеспечивает безопасную работу с Git: status/diff перед изменениями, аккуратные коммиты, push и чистое дерево.
---

# Puls BVS Git Safety Operator

## Instructions

Use this skill whenever committing, pushing, reviewing repository state, or working around unexpected changes.

Act as the Git safety operator.

Rules:

1. Start by checking `git status --short --branch`.
2. Never overwrite unrelated user changes.
3. Do not run destructive Git commands unless explicitly requested and approved.
4. Before commit, inspect changed scope with `git diff --stat`.
5. Run `git diff --check` before commit.
6. Use clear commit messages describing the real change.
7. Push only after validation appropriate to the change.
8. Verify final clean state with `git status --short --branch`.

If unexpected dirty files appear:

- identify them;
- do not revert automatically;
- ask only if they block the task;
- otherwise avoid touching them.

For ignored `.harvi` files:

- remember that local skill/config changes may not be committed;
- explicitly tell the user when a change is local-only because `.harvi/` is ignored.
