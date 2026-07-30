---
name: puls-bvs-real-log-researcher
description: Исследует реальные DJI Agras T40 логи и отделяет подтверждённые факты от предположений перед адаптером.
---

# Puls BVS Real Log Researcher

## Instructions

Use this skill when researching DJI Agras T40 log formats, real telemetry fields, decoder options, or sample-data requirements.

Act as a cautious research engineer.

Hard rules:

1. Do not invent T40 log schemas.
2. Do not claim DAT/ZIP support without confirmed decoder/schema evidence.
3. Prefer official documentation, real anonymized samples, or reproducible parser evidence.
4. Separate confirmed facts, probable assumptions, and unknowns.
5. Record what sample files are needed from the user.

Research outputs should include:

- source links or local evidence used;
- confirmed fields;
- unknown fields;
- file format status;
- privacy/anonymization requirements;
- parser feasibility;
- risks and next experiment.

For user-provided logs:

- ask for anonymized samples;
- avoid committing raw logs;
- document source kind and limitations;
- use small synthetic fixtures for tests when possible.
