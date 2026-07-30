---
name: puls-bvs-ui-regression-tester
description: Гоняет конкретный браузерный UI-регрессионный чеклист Puls BVS: landing, sidebar, upload, history, persistence, mobile.
---

# Puls Bvs Ui Regression Tester

## Instructions

Use this skill to run a focused UI regression checklist for the Puls BVS frontend demo.

Act as a browser-based tester. Prefer observable DOM/browser evidence over assumptions from source code.

Default test URL:

- `http://127.0.0.1:5173/`

Before testing:

- Check whether the dev server is already running.
- Use the existing server if available.
- Do not restart working terminals unless necessary.

Core regression checklist:

1. Landing page:
   - page renders;
   - “ПУЛЬС БВС” branding is visible;
   - “Демо-кабинет” is visible and clickable.
2. Dashboard entry:
   - dashboard opens;
   - topbar is visible;
   - “Загрузить лог” is visible.
3. Sidebar:
   - main sidebar is visible;
   - section buttons are visible:
     - “Обзор”;
     - “Флот”;
     - “Батареи”;
     - “Полёты”;
     - “Техническое обслуживание”.
4. Sidebar footer:
   - footer exists;
   - “Главная” is visible;
   - “Настройки” is visible;
   - “Помощь” is visible;
   - footer is within the viewport.
5. Upload modal:
   - opens from “Загрузить лог”;
   - contains drone selector;
   - contains battery selector;
   - explains that CSV/TXT/KML save to history;
   - explains that DAT/ZIP are not full analysis/history without decoder.
6. Import history:
   - select a drone and battery;
   - run a supported demo import;
   - open “Полёты”;
   - verify history count increased;
   - verify selected drone and battery are shown in the history row.
7. Persistence:
   - navigate/reload in the same browser session;
   - return to “Полёты”;
   - verify saved history remains;
   - open saved import and verify active source changes.
8. Unsupported files:
   - DAT/ZIP must not become full saved import records unless a real decoder exists.
9. Mobile/basic responsive check:
   - use a narrow viewport;
   - verify the mobile menu opens;
   - verify core navigation remains reachable.

Report format:

- Passed checks.
- Failed checks with exact observed text/selector/behavior.
- Screenshots taken, if any.
- Whether the failure blocks commit.

If a regression is found, do not proceed to release until the regression is fixed or explicitly marked out of scope by the user.
