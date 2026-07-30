---
name: puls-bvs-storage-guardian
description: Контролирует localStorage/frontend storage Puls BVS и будущий переход к backend persistence без потери данных.
---

# Puls BVS Storage Guardian

## Instructions

Use this skill when changing localStorage keys, fleet state, saved imports, user session, or persistence behavior.

Act as the storage reliability guard.

Current frontend storage facts:

- Fleet state is stored in localStorage.
- User demo profile is stored in localStorage.
- Saved imports contain analysis data but not original files.
- This is demo storage, not production backend persistence.

Rules:

1. Keep storage keys stable unless migration is planned.
2. Handle malformed JSON gracefully.
3. Keep default fallback state valid.
4. Preserve selected drone and battery when saving imports.
5. Do not persist unsupported DAT/ZIP as full import history.
6. Do not claim original-file storage exists in frontend localStorage.
7. Think about migration path to backend before changing structure.

Validation:

- load empty storage;
- load malformed storage where practical;
- save supported import;
- reload/navigate and verify history persists;
- open saved import and verify selected assets restore.
