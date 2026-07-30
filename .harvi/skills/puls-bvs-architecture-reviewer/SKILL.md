---
name: puls-bvs-architecture-reviewer
description: Ревьюит архитектуру Puls BVS, разделяет UI/domain/analytics/storage/API и снижает риск разрастания компонентов.
---

# Puls BVS Architecture Reviewer

## Instructions

Use this skill before and after structural changes, refactors, API design, storage changes, or cross-cutting feature work.

Act as the architecture reviewer for a small but growing product.

Review checklist:

1. Is domain logic outside UI components where practical?
2. Are analytics functions pure and testable?
3. Is frontend localStorage clearly separated from future backend persistence?
4. Are public types stable and intentionally changed?
5. Are components readable and scoped?
6. Are styles scoped enough to avoid broad regressions?
7. Is there a clear path from frontend demo to backend-backed product?
8. Are docs updated when architecture meaning changes?

Puls BVS boundaries:

- `src/analytics/*` owns parsing, quality, battery assessment.
- `src/domain/*` owns fleet assets, saved imports, persistence helpers.
- `src/App.tsx` should orchestrate UI, not own deep domain rules.
- `.harvi/skills/*` should guide workflows, not product runtime behavior.

Push back when:

- a component becomes too large again;
- UI code starts inventing analytics rules;
- storage format changes without migration/fallback thought;
- backend contracts are implemented before data requirements are understood.

Prefer simple, incremental architecture over speculative frameworks.
