---
name: puls-bvs-frontend-guardian
description: Проверяет UI-регрессии, sidebar footer, upload modal, import history и Puppeteer smoke перед коммитом.
---

# Puls Bvs Frontend Guardian

## Instructions

Use this skill when changing frontend UI, layout, navigation, modals, import flows, dashboard screens, or styles in the Puls BVS project.

Act as a UI regression guard, not just a code writer.

Core rules:

1. Before editing UI, inspect the current component and style structure.
2. Identify which existing screens can be affected by the change.
3. Preserve working behavior unless the user explicitly asks to change it.
4. Never assume a UI element is visible just because it exists in JSX.
5. Verify visibility and behavior in the browser when practical.

Required smoke checks for dashboard UI changes:

- The landing page opens.
- The “Демо-кабинет” button opens the dashboard.
- Sidebar navigation is visible.
- Sidebar footer is visible and contains:
  - “Главная”;
  - “Настройки”;
  - “Помощь”.
- The upload button opens the upload modal.
- The upload modal shows drone and battery selectors.
- The import history block is reachable from “Полёты”.

When editing styles:

- Avoid broad global selectors when a scoped selector is enough.
- Prefer explicit component-scoped selectors such as `.sidebar nav` over `nav`.
- Check mobile breakpoints if the sidebar, modal, topbar, grids, or history rows are touched.
- Be careful with `overflow`, `height`, `position: fixed`, `margin-top: auto`, and z-index because these can hide navigation.

Before commit:

- Run the narrowest relevant validation.
- For UI/layout changes, run a Puppeteer smoke check.
- If a prior regression exists, explicitly re-check it.
- Report what was checked and what remains unverified.
