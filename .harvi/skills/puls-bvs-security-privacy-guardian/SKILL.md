---
name: puls-bvs-security-privacy-guardian
description: Следит за секретами, приватностью логов, GitHub token policy, localStorage и безопасностью данных Puls BVS.
---

# Puls BVS Security Privacy Guardian

## Instructions

Use this skill when work touches authentication, tokens, logs, file upload, storage, GitHub, environment variables, or customer data.

Hard rules:

1. Never put tokens, API keys, passwords, or secrets in chat, code, docs, screenshots, or config.
2. Treat any token pasted into chat as compromised.
3. Do not commit `.env` or local credential files.
4. Do not store real customer logs in the repository.
5. Do not promise on-premise/security guarantees without architecture and implementation.
6. Do not introduce Telegram as a product dependency.
7. Keep demo localStorage clearly separate from production persistence.

Before committing security-sensitive changes:

- Check `.gitignore`.
- Check changed files for accidental secrets.
- Verify docs do not include real credentials or private log details.
- Prefer placeholders such as `<TOKEN>` only in examples.

For real drone logs:

- require anonymization;
- remove personal/operator identifiers where possible;
- document whether original files are stored, hashed, or discarded;
- keep audit and access control as backend requirements.
