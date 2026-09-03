# Idea: outline sidebar (nodes by type, Figma-style)

**Status:** ✅ v1 shipped 2026-09-03.
**Raised by:** JB — "add a sidebar like a category to show the pages, api, etc…
like in figma pages, frames" → "like actual side menubar".

## Shipped (v1)

`src/components/Sidebar.tsx` — a real docked left panel (`w-[228px]`, full
height, border-right), **canvas is flex-1 beside it** (pushed, not overlaid).
App wraps `<ReactFlowProvider>` around a flex row so both sidebar and canvas use
RF hooks. Sections:

- **Files** (only if >1) — the workspace files; click sets the entry file.
- **Docs** — every parsed doc (`main` + `@doc` + resolved `@fof`); click sets
  the active doc. (Replaces the old toolbar DOCS strip.)
- **`<doc> — layers`** — the active doc's nodes grouped by kind (Pages, APIs,
  Flows, Decisions, then others), sorted; header shows `KIND · count`. Click a
  row → `useReactFlow().setCenter` on that node (live position via `getNode`,
  so it follows drags), `zoom 1.1`, 350ms.

Not yet: collapse/resize the panel, selection highlight sync with the canvas,
hover-to-highlight edges, search/filter. See below.

---

## What

A panel (left side) that lists every node in the current diagram, grouped by
type — **Pages**, **APIs**, **Decisions**, anything else — like Figma's
layers/pages panel. Click a row → select that node and pan/zoom the canvas to
it. It's a table of contents for the graph.

Nice-to-haves once the basics work:
- per-row badges: in/out edge count, or an "entry" / "terminal" / "unwired" tag
  (all already computed in `analyze()`)
- count next to each group header (`Pages 8`, `APIs 5`)
- collapsible groups
- hover a row → highlight that node + its edges on canvas

---

## Why it's cheap

No language change. The data is already there:
- `doc.nodes` — `{ id, type, data }`
- `analyze()` already returns `byType`, `entryPoints`, `terminals`, `unwired`
- layout gives each node an `x/y`; `useReactFlow().setCenter(x, y, { zoom })`
  and a `selected` flag handle the click-to-focus

New: one component (`OutlineSidebar.tsx`), grouping + sort, wire selection state.
**Effort: S.** Half a session.

---

## Open questions

1. **Layout.** Toolbar is top-left, `IssueList` bottom-left. A full-height left
   sidebar collides. Options: (a) collapsible rail that pushes the canvas, (b)
   floating card top-left that the toolbar sits above, (c) move it to the right
   and share space with the Source panel (they're rarely open together).
   Lean: (a) — a real collapsible left rail, canvas resizes.
2. **Label vs id.** Show `label:` when set, else the id. Show the id as a
   subtitle either way (it's what you type in `@flow`).
3. **Multi-diagram.** Once the multi-diagram refactor lands, the sidebar is
   per-diagram (follows the active tab). Build it single-diagram now, it slots
   in unchanged.

## Sequencing

Do this **first** among the open ideas — smallest, no parser work, immediately
useful for navigating bigger `.fml` files. Then multi-diagram, then
[[fml-on-fml]].
