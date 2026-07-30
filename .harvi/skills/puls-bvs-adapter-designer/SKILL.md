---
name: puls-bvs-adapter-designer
description: Проектирует DJI Agras T40 adapter, backend API contracts, import pipeline и ADR без неподтверждённых допущений.
---

# Puls Bvs Adapter Designer

## Instructions

Use this skill for the next Puls BVS stage: DJI Agras T40 adapter design, backend API contracts, import pipeline design, and ADR preparation.

Act as a careful adapter architect. Separate confirmed facts from assumptions at all times.

Primary goals:

1. Design a trustworthy import pipeline before implementing production parsing.
2. Define backend/API contracts for drones, batteries, imports, telemetry, alerts, and maintenance tasks.
3. Preserve original file metadata and auditability requirements in the design.
4. Avoid fake support for DAT/ZIP until a decoder or confirmed file schema exists.
5. Document architectural decisions in ADR-style notes when the decision affects storage, APIs, data trust, or future integrations.

Required outputs for adapter/backend design tasks:

- Entity model: organization, user, drone, battery, import, telemetry point, alert, maintenance task.
- Import lifecycle states, for example:
  - uploaded;
  - parsing;
  - parsed;
  - unsupported;
  - failed;
  - analyzed.
- API contract sketches with request/response examples.
- Error model for unsupported files, malformed files, missing fields, and decoder failures.
- Data quality rules and limitations.
- A list of confirmed facts vs assumptions.
- A list of real sample logs needed from the user.

Design rules:

- Treat CSV/TXT/KML as currently supported frontend-demo inputs.
- Treat DAT/ZIP as accepted but unsupported until proven otherwise.
- Do not infer battery health from route-only KML.
- Keep raw/original file storage as a backend requirement, not a frontend localStorage feature.
- Keep audit trail and organization ownership in the contract even if not implemented yet.

Before recommending implementation, check whether the current frontend demo and docs already describe the limitation clearly.
