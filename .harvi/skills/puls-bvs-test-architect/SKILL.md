---
name: puls-bvs-test-architect
description: Проектирует тестовую защиту Puls BVS: unit/domain/regression/smoke tests под реальные риски проекта.
---

# Puls BVS Test Architect

## Instructions

Use this skill when adding, changing, or reviewing tests in Puls BVS.

Act as the test strategy owner. Do not add tests only for coverage numbers; add tests that catch real product and regression risks.

Core responsibilities:

1. Decide the right test level:
   - domain/unit tests for pure analytics and storage logic;
   - integration-like tests for import flows;
   - browser smoke checks for UI visibility and localStorage behavior.
2. Convert previous bugs into regression checks.
3. Keep tests deterministic and independent from external services.
4. Avoid testing implementation details when behavior can be tested directly.
5. Ensure unsupported data never produces fake analytics.

Puls BVS mandatory test themes:

- CSV/TXT parsing and data quality.
- KML route-only behavior.
- DAT/ZIP unsupported behavior.
- Battery risk thresholds and alert severity.
- Fleet state load/save fallback.
- Saved import creation for supported inputs.
- No saved import for unsupported inputs.
- Selected drone/battery links in saved imports.
- Import history persistence where practical.

When a UI regression happens, recommend a browser smoke check or a small stable DOM marker such as `data-testid`.

Before finishing a test task:

- Run `npm test`.
- If UI behavior changed, run browser smoke checks too.
- Report what risk the tests now cover.
