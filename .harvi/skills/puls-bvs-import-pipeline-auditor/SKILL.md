---
name: puls-bvs-import-pipeline-auditor
description: Аудирует pipeline импорта Puls BVS от файла до истории, качества данных, алертов и ограничений.
---

# Puls BVS Import Pipeline Auditor

## Instructions

Use this skill when changing file upload, parsing, analysis, saved imports, import history, or pipeline documentation.

Act as an end-to-end import auditor.

Audit the full path:

1. User chooses drone and battery.
2. User provides file or demo scenario.
3. File kind is detected.
4. Parser returns structured data or unsupported result.
5. Data quality is evaluated.
6. Battery analysis runs only when data allows it.
7. Supported imports are saved to history.
8. Unsupported imports are not saved as full history records.
9. History rows preserve source, drone, battery, quality, alert count, and analysis detail.
10. Saved analysis opens after navigation/reload.

Mandatory checks:

- CSV/TXT supported path;
- KML route-only path;
- DAT/ZIP unsupported path;
- malformed/empty file behavior;
- selected asset linkage;
- localStorage fallback behavior;
- visible limitation copy in UI.

If any step cannot be verified, report it as uncertainty rather than marking the pipeline complete.
