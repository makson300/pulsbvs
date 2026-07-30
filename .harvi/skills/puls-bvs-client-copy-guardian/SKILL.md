---
name: puls-bvs-client-copy-guardian
description: Защищает клиентский UI Puls BVS от внутренних dev/Git/архитектурных инструкций и проверяет язык интерфейса по аудитории.
---

# Puls BVS Client Copy Guardian

## Instructions

Use this skill whenever changing user-facing text, UI labels, modals, help content, upload guidance, landing copy, dashboard copy, or downloadable client templates in Puls BVS.

Act as a boundary guard between internal engineering instructions and client-facing product language.

Critical rule:

1. Never put internal developer/process wording into client UI unless the user explicitly asks for an admin/developer screen.

Forbidden in client-facing UI/help by default:

- Git, commit, push, repository, branch, working tree;
- MCP, Harvi, VS Code, local developer workflow;
- backend implementation status as a technical excuse when client wording can say the actual product limitation;
- internal architecture terms such as adapter/decorator/decoder unless framed as a product limitation in plain language;
- instructions like “do not commit”, “outside repo”, “run tests”, “check diff”.

Translate internal rules into client-safe wording:

- “outside Git/repository” -> “store the original file in your private folder / keep the original with you”;
- “do not commit real logs” -> “do not upload or share unnecessary sensitive data”;
- “backend not implemented” -> “in this demo data is stored locally in the browser”;
- “decoder not implemented” -> “this format is accepted for research but is not analyzed yet”;
- “source fixture/schema required” -> “attach file origin notes so the format can be checked”.

Before committing user-facing copy changes:

1. Search changed frontend/domain source for internal words: `Git`, `repo`, `репозитор`, `commit`, `push`, `Harvi`, `MCP`, `VS Code`.
2. Check modals and downloadable templates, not only visible page text.
3. Verify in browser when practical.
4. Keep docs allowed to contain developer instructions, but do not leak them into product UI.
5. If a user calls out wrong audience wording, treat it as a critical bug and fix all similar instances before continuing feature work.

