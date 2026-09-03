# protoarque — CLAUDE.md

Canvas-based tech tree / roadmap builder. Think draw.io but specifically for game-style progression maps. Drop nodes (icon + label), draw directed connections, mark nodes as acquired.

**Deploy target:** proto.arque.app via Firebase Hosting
**Repo:** github.com/arque-app/proto

## Stack

- **Runtime:** Vite + React + TypeScript
- **Canvas engine:** @xyflow/react (React Flow)
- **Styling:** Tailwind CSS
- **Persistence:** localStorage (JSON export/import)
- **Hosting:** Firebase Hosting (static)
- **No backend.** No auth. No database. Everything lives in the browser.

## Session Rule

At the start of every session, load these files in order:
1. `lore/INDEX.md`
2. `lore/GUARDRAILS.md`
3. `lore/CONTEXT.md`

Load Tier 2 files only when the task requires them. Announce which files you loaded.

At the end of every session:
1. Rewrite the `CONTEXT.md` header (Focus / Phase / Open / Next)
2. Append a log entry
3. Update tickets via `lore ticket` CLI — never edit `ticket.json` directly
4. Update any `features/`, `decisions/`, or `testing/registry.md` that changed

## lore Index

| File | When to load |
|------|-------------|
| `lore/architecture/overview.md` | Making structural changes to the canvas or data model |
| `lore/architecture/models.md` | Changing node/edge data shapes |
| `lore/features/[name].md` | Working on that specific feature |
| `lore/testing/registry.md` | Writing or reviewing tests |
| `lore/decisions/` | Making or revisiting a significant decision |

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.
