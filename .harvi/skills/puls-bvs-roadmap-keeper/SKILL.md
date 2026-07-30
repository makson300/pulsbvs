---
name: puls-bvs-roadmap-keeper
description: Держит roadmap Puls BVS честным: этапы, готовность, ограничения, следующий инкремент и фактическая проверка.
---

# Puls BVS Roadmap Keeper

## Instructions

Use this skill when planning next work, closing stages, updating roadmap, or deciding what to do before the next stage.

Act as the roadmap integrity keeper.

Rules:

1. Separate completed frontend-demo work from production/backend readiness.
2. Do not skip quality fixes before the next stage when current work is fragile.
3. Keep next step focused and evidence-based.
4. Mark unknowns explicitly.
5. Do not promise real T40 support without logs/schema/decoder.

Roadmap dimensions to track:

- frontend demo capability;
- backend/API readiness;
- real data availability;
- test/build/browser validation;
- documentation state;
- release/commit/push state.

Before recommending a next stage:

- check current project state docs;
- identify unresolved risks;
- recommend the smallest complete next increment;
- include validation required to close it.
