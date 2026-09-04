# protoArch — CLAUDE.md

**FML — a Flowchart Markup Language for app flows**, plus the web viewer/editor
that draws it. You write `.fml` (navigation + API journeys as plain text); the
app parses it, lays it out, and lets you edit node/edge properties straight back
into the source file.

**Deploy target:** protoarch.web.app via Firebase Hosting (project `protoarch`, serves `dist/`)
**Repo:** github.com/joabeliot/protoarch

> The north star is **executable flows**: run an API journey from the diagram as
> a test — variables, captured values, status assertions. Not built yet; see
> `lore/ideas/flow-execution.md`. Design new language features to be compatible
> with it.

## Stack

- **Runtime:** Vite 6 + React 19 + TypeScript (strict)
- **Canvas engine:** @xyflow/react v12 + @dagrejs/dagre
- **Styling:** Tailwind v4 — `@theme` tokens in `src/index.css`, no config file
- **Persistence:** localStorage (the workspace is `{ files, entry }`)
- **Hosting:** Firebase Hosting (static)
- **No backend. No auth. No database.** Everything lives in the browser.
- Node 22 runs `.ts` directly — tests and `scripts/demo.ts` need no build step.

## Layout

| Path | What lives there |
|---|---|
| `src/fml/` | The language. Parser, node-type standard, stats. **Zero dependencies** — keep it that way, it has to run in Node and the browser. |
| `src/fml/nodeTypes.ts` | The canonical node vocabulary (`page`/`api`/`decision`/`event`/`flow`) and their expected keys. Changing it changes the language. |
| `src/lib/fmlEdit.ts` | Write-back: targeted text surgery into one `@doc`'s span. Never re-serialises the whole file — comments and formatting must survive. |
| `src/lib/` | layout (dagre), toReactFlow, node styling |
| `src/components/` | canvas, sidebar, toolbar, property panel, source editor |
| `examples/` | Reference `.fml` files. **All must parse clean under strict mode.** |

## Working rules

- **Run `npm test` and `npm run build` before saying anything works.** Three
  suites: `src/fml/parse.test.ts`, `src/fml/stats.test.ts`, `src/lib/fmlEdit.test.ts`.
- **`npm run demo -- <file>` is the structural check** when you can't see the canvas.
- **Language changes ripple.** A new node type or key touches the parser, the
  renderer, the property panel, `HOW-TO.md` and the examples. Do all of them.
- **Every Firebase deploy is paired with a git commit + push to `main`.**
- Never use `any`. Never add a dependency to `src/fml/`.

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
| `lore/ideas/flow-execution.md` | Anything touching variables, `api` keys, or execution |
| `lore/features/[name].md` | Working on that specific feature |
| `lore/testing/registry.md` | Writing or reviewing tests |
| `lore/decisions/` | Making or revisiting a significant decision |
