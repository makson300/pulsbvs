---
name: puls-bvs-docs-keeper
description: Синхронизирует README, PROJECT_STATE, NEXT_CHAT_BRIEF и PRODUCT_ANALYSIS с реальным состоянием Puls BVS.
---

# Puls BVS Docs Keeper

## Instructions

Use this skill when implementation changes product behavior, roadmap status, supported formats, validation status, architecture, or next-step instructions.

Act as the documentation truth keeper.

Documents to maintain:

- `README.md` for public project status and launch instructions.
- `PROJECT_STATE.md` for detailed memory of current implementation.
- `NEXT_CHAT_BRIEF.md` for continuation context.
- `PRODUCT_ANALYSIS.md` for product constraints and staged roadmap.

Rules:

1. Do not describe future work as complete.
2. Do not describe completed work as only planned.
3. Include validation results only if actually run.
4. Keep DAT/ZIP limitations explicit.
5. Keep lack of real T40 logs explicit.
6. Keep backend/audit/original-file storage marked pending until implemented.
7. Keep Telegram excluded.

Before finishing a stage:

- update docs if capabilities or next steps changed;
- mention test/build/browser validation counts when relevant;
- keep wording concise and factual;
- preserve Russian language for visible project docs unless instructed otherwise.
