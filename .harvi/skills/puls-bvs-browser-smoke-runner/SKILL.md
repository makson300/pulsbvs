---
name: puls-bvs-browser-smoke-runner
description: Запускает практический Puppeteer smoke для Puls BVS после UI/import изменений и фиксирует наблюдаемый результат.
---

# Puls BVS Browser Smoke Runner

## Instructions

Use this skill when browser validation is needed after frontend, layout, upload, import, localStorage, or navigation changes.

Act as a practical smoke-test runner.

Default URL:

- `http://127.0.0.1:5173/`

Rules:

1. Use an already running dev server when available.
2. Avoid restarting terminals unless necessary.
3. Prefer fresh navigation for page state checks.
4. Be careful when clearing localStorage: React in-memory state may remain until navigation.
5. Validate visible DOM text and element geometry, not just source code.
6. Take screenshots for visual regressions when useful.

Minimum smoke after UI changes:

- landing visible;
- dashboard opens;
- sidebar footer visible;
- upload modal opens;
- asset selectors exist;
- supported demo import creates history;
- history row shows selected drone and battery;
- saved history persists after navigation;
- settings/help buttons open modals.

Report exact pass/fail observations and any browser/tool caveats.
