---
name: puls-bvs-context-memory-keeper
description: Следит за длинным контекстом Puls BVS, обновляет проектную память и готовит инструкцию для нового чата до переполнения/зацикливания.
---

# Puls BVS Context Memory Keeper

## Instructions

Use this skill during long Puls BVS sessions, before context becomes unreliable, before a major stage transition, after several commits, or whenever the user asks to prevent looping/lost context.

Act as the context continuity and anti-loop guard.

Important limitation:

- Do not claim exact model token/context usage unless the runtime explicitly provides it.
- If exact context count is unavailable, use conservative checkpoints and observable risk signals instead.
- Treat “800k context” as a safety threshold target: prepare handoff well before the practical limit is reached.

When to activate:

1. The conversation has many tool calls, commits, browser checks, or repeated corrections.
2. The user says the agent is looping, forgetting, repeating, or losing track.
3. A stage is completed and the next stage is about to start.
4. Important files changed and must be remembered in a new chat.
5. There were regressions or mistakes that future agents must not repeat.
6. The session summary is becoming large or stale.

Memory targets:

- `PROJECT_STATE.md` — durable project memory and current implementation truth.
- `NEXT_CHAT_BRIEF.md` — handoff prompt and continuation instructions for a new chat.
- `PRODUCT_ANALYSIS.md` — product constraints, roadmap, and non-negotiable limitations.
- `README.md` — public/current status when relevant.

Core workflow:

1. Inspect current state:
   - `git status --short --branch`;
   - recent commits if needed;
   - changed files if work is not committed;
   - active dev server/process notes if relevant.
2. Identify durable facts:
   - what is implemented;
   - what is verified;
   - what is committed/pushed;
   - what remains unfinished;
   - known bugs/regressions;
   - user preferences and hard constraints.
3. Remove noise:
   - do not preserve every tool call;
   - preserve decisions, outcomes, blockers, file paths, commands, and validation results.
4. Update project memory files when needed.
5. Write a new-chat instruction that includes:
   - active objective;
   - current branch/status;
   - latest commits;
   - implemented features;
   - validation results;
   - hard constraints;
   - next recommended complete stage;
   - anti-loop warnings;
   - what not to redo.
6. Verify memory files after editing.
7. If code/docs changed, use normal release validation before commit when appropriate.

Anti-loop rules:

- Do not repeat work already marked complete and verified.
- Do not keep rechecking the same unchanged fact unless it blocks the next action.
- If two attempts hit the same blocker, stop and name the blocker.
- Prefer a complete stage closure over micro-steps when the user asked for complete stages.
- When uncertain, inspect local files/tool output instead of relying on memory.
- Separate “done”, “verified”, “committed”, and “pushed”.

What to include in `NEXT_CHAT_BRIEF.md`:

- Start prompt for the next chat.
- Current objective.
- Exact hard constraints:
  - respond in Russian;
  - no Telegram;
  - no fake analytics;
  - DAT/ZIP unsupported without real decoder;
  - no secrets/tokens in chat/code/docs;
  - user prefers closing whole stages, not tiny isolated steps.
- Current stack and commands:
  - `npm test`;
  - `npm run build`;
  - `npm audit --omit=optional` when relevant;
  - browser smoke via Puppeteer when UI changes.
- Latest known validation results.
- Latest commits and push status.
- Active dev server, if running.
- Next recommended action with rationale.

What to include in `PROJECT_STATE.md`:

- Current project capability.
- Implemented file structure.
- Storage/data limitations.
- UI behaviors that must not regress.
- Known future backend/T40 requirements.
- Current roadmap state.

When approaching context exhaustion:

1. Stop starting new implementation work.
2. Update memory files first.
3. Produce a compact handoff message for the user.
4. Recommend opening a new chat with the prepared prompt.
5. Do not claim the next agent will remember anything not written into files or the handoff.

Quality standard:

- A new agent should be able to continue from the memory files without reading the old chat.
- The handoff must prevent duplicate work, false “done” claims, and repeated regressions.
