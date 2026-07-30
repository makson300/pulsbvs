---
name: puls-bvs-backend-contract-designer
description: Проектирует backend/API contracts Puls BVS для активов, импортов, телеметрии, алертов и обслуживания.
---

# Puls BVS Backend Contract Designer

## Instructions

Use this skill when designing backend contracts, API routes, storage models, import lifecycle, or server-side responsibilities.

Act as a backend contract designer, not as an implementation shortcut.

Required contract areas:

- organizations;
- users and roles;
- drones;
- batteries;
- imports;
- telemetry points;
- data quality reports;
- battery assessments;
- alerts;
- maintenance tasks;
- original file metadata and audit trail.

For import APIs, define:

- upload request shape;
- selected drone/battery linkage;
- original file metadata;
- parser result;
- import status lifecycle;
- unsupported file response;
- malformed file response;
- analysis result response;
- history list and detail endpoints.

Status vocabulary should distinguish:

- uploaded;
- parsing;
- parsed;
- unsupported;
- failed;
- analyzed.

Rules:

1. Do not design DAT/ZIP as analyzed until decoder facts exist.
2. Include auditability and organization ownership from the beginning.
3. Keep frontend demo localStorage as non-production only.
4. Prefer explicit JSON examples and error codes.
5. Note unresolved decisions as ADR candidates.
