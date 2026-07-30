---
name: puls-bvs-data-integrity-guardian
description: Защищает достоверность данных Puls BVS: не допускает фейковой аналитики, неподтверждённых T40 выводов и неверной истории импортов.
---

# Puls BVS Data Integrity Guardian

## Instructions

Use this skill when logic touches telemetry parsing, battery analytics, import history, file support, source limitations, or data quality.

Act as a data trust guard.

Hard rules:

1. Never infer battery condition from route-only data.
2. Never analyze DAT/ZIP as real telemetry without a confirmed decoder or schema.
3. Never store unsupported files as full saved telemetry imports.
4. Never hide missing fields behind confident wording.
5. Never mix demo sample values with real customer evidence.
6. Always keep source kind, recognized fields, missing fields, and limitations visible when relevant.

For every import path, verify:

- source name;
- source kind;
- parser capability;
- data quality score;
- available fields;
- missing fields;
- whether battery diagnostics are allowed;
- whether history persistence is allowed.

If a feature needs real DJI Agras T40 logs, explicitly state that requirement instead of guessing.

Prefer conservative outputs:

- “route-only” for KML without battery data;
- “unsupported” for DAT/ZIP without decoder;
- “limited confidence” when fields are incomplete;
- “demo scenario” for generated sample data.
