# Context — protoarque

**Focus:** FML — `.fml` Flowchart Markup Language: parser (`src/fml/`) + web viewer (React Flow + dagre)
**Phase:** R&D — parser + viewer working; viewer live at https://protoarch.web.app
**Open:** property-panel gaps — edge-note editing, node rename, add/delete node+edge (needs an FmlDoc→text serializer, shared with `fml bundle`); FML-on-FML step 3 portal drill-down + breadcrumb; "Open folder" (File System Access API); image thumbnails on `page` nodes; **JB's protoArch logo PNG (Lexend 400) — remind him, then swap the sidebar text for it**; "reset to sample" button; sidebar collapse/resize; label crowding on primary+reciprocal at one node; fitView ignores toolbar height
**Next:** FmlDoc→text serializer → unlocks structural edits in the property panel + `fml bundle`; then step 3 portal drill-down

---

## Log

### 2026-09-03 — JB / Claude (cont.) — property panel (edit → write .fml), dots, Lexend wordmark
Right-side **property panel** (`src/components/PropertyPanel.tsx`): click a node
or edge → its props show in a docked right panel, edits write straight back into
the `.fml` text. `src/lib/fmlEdit.ts` (16 tests, in `npm test`) does targeted
text surgery scoped to one `@doc`: `setNodeBlock` regenerates just that node's
`@node { }` block (covers label + every meta key + add/remove + type via
`setNodeType`), `setEdgeLabel` swaps the label on the matching flow line
(inline or grouped). Comments, other nodes, formatting are untouched. Writes go
to the right file — an `@fof`'d doc's edits land in *its* file
(`chart.doc.source`), treated as its own `main`. `useFmlChart` now also returns
the raw active `FmlDoc`; `FlowCanvas` reports selection via
`onNodeClick`/`onEdgeClick`/`onPaneClick`. Round-trip verified in browser
(edit method → file text + canvas update, comment preserved).
Also: background dots thicker/brighter (gap 20, size 2, `#3d3d3d`); sidebar
wordmark is now **"protoArch" in Lexend 400** (Google Fonts link in
`index.html`, `--font-brand` token); page `<title>` → protoArch.
NOT done: edge-note editing (panel shows notes read-only), node rename,
add/delete node or edge (structural — needs the FmlDoc→text serializer).

### 2026-09-03 — JB / Claude (cont.) — visual redesign
Full design pass. Palette lives as Tailwind v4 `@theme` tokens in `src/index.css`
(`--color-bg #1b1b1b` canvas, surface `#202020`, surface-2 `#242424`, elevated
`#2b2b2b`, `line` hairline, `ink`/`ink-dim`/`ink-mute` text, `accent #a78bfa`
violet, per-type page/api/flow/decision colours, `font-mono`). Dotted bg tuned.
Merged PageNode + ApiNode + NodeShell → one `src/components/nodes/FmlNode.tsx`
driven by `data.kind` via `src/lib/nodeStyle.ts` — rounded-xl card, hairline
border, colour tag chip, mono meta rows, dim handles. Sidebar / Toolbar /
SourcePanel / IssueList all restyled to the tokens (mono for code/paths/counts,
violet left-accent bar on active nav rows, type-colour dots on layer groups).
Edges: `#565656` stroke, mono label chips; primary label nudged 13% toward
source so it clears side-routed return labels; RF Controls + edge-hover styled
via `index.css`. Deployed. 77+16 tests green. Old node files deleted.

### 2026-09-03 — JB / Claude (cont.) — Figma-style sidebar + curved routed edges
Sidebar (`src/components/Sidebar.tsx`) — real docked left panel, full height,
canvas is `flex-1` beside it (pushed, not overlaid); App now wraps
`<ReactFlowProvider>` around a flex row. Sections: Files (if >1), Docs (replaces
the toolbar DOCS strip), and `<doc> — layers` (nodes grouped by kind, click →
`setCenter` on the live node via `getNode`, follows drags). Toolbar lost the
FILES/DOCS strips, back to one row.
Edge fix: side-routed reciprocal/parallel edges were drawn ~straight because
`getBezierPath` collapses to a near-line when same-side handles are vertically
colinear. `FlowEdge` now hand-builds a wide cubic C-curve that bows away from the
node by a fixed amount (`SIDE_BOW` 62 + tier) for `parallelIndex >= 1`; primary
edge (`index 0`) still uses `getBezierPath`. The `401`-style return now visibly
curves around the box. Verified in-browser, deployed. 77+16 tests green.
Rough edges still open: label crowding where a primary + a reciprocal return
share a node; fitView ignores toolbar height; sidebar has no collapse/resize.

### 2026-09-03 — JB / Claude (cont.) — @fof cross-file imports + viewer multi-file (fml-on-fml step 2)
`@fof <path> [as <name>]` — extension-less (JB: "it's also going to be fml so why
mention it"). `parse(src, { resolve })` with a sync `resolve(path, from)` the
caller supplies; no resolver ⇒ `@fof` warns+skips so bare `parse(src)` still
works. Recursion, circular-import error, depth cap 16, unresolved = error/warn by
mode. `FmlDoc.source` + `FmlIssue.file` added; cross-import name collisions →
`name_2` + warning. `demo.ts` got an fs resolver; `examples/fof/` (app→auth,
app→checkout→payment). Viewer: `Open .fml` is multi-select + multi-drop; state is
`Workspace { files, entry }` (localStorage `protoarque_fml_ws`, migrates the old
`protoarque_fml_source`); FILES strip picks the entry file, DOCS strip picks the
resolved doc to render; `useLocalStorage` gained functional-updater support.
30 new parser tests (77 parse + 16 stats green). Verified in-browser (app.fml
resolves auth/checkout/payment; DOCS strip switches graphs), deployed to
protoarch.web.app. Image on page nodes = `image:` text key (path/URL), still just
a free-form key, viewer render is a later standalone change. NOT done: portal
double-click drill-down + breadcrumb (step 3), `fml bundle` (step 4).

### 2026-09-03 — JB / Claude (cont.) — FML v0.2 multi-doc parser (fml-on-fml step 1)
Settled the format question: fml-on-fml uses **plain-text multi-doc**, NOT a zip
container — zip is for heterogeneous bytes (`.docx`), FML bundles homogeneous
text and wants a delimiter (`@doc <name>`). Shipped step 1: `@doc <name>` at
col 0 opens a doc; no `@doc` ⇒ one implicit `main` (every existing `.fml`
unchanged); lines before the first `@doc` seed `main`; node ids are doc-local;
repeated name → warn+merge; malformed → error. `FmlDoc` gained `name`; new
`FmlFile { docs }`. `ParseResult.file` is the whole file, `.doc` kept as alias
for `docs[0]` → zero churn on existing callers/tests. `analyzeFile()` added;
`demo.ts` prints per-`@doc`. 21 new tests (60 parse + 16 stats green), build
clean, `examples/multi.fml` added, viewer still renders `docs[0]` (no crash).
Not deployed — viewer has no doc UI yet.
Decisions: cross-file import directive will be `@fof` (JB's call); the portal
node key is `fof:` (same word, one concept); `image:` stays a text key on the
page node's block (path/URL, never base64) with `fml pack`/`.fmlpkg` as an
opt-in distribution artifact only. All in `lore/ideas/fml-on-fml.md`.

### 2026-09-03 — JB / Claude (cont.) — edge fan-out + 2 new ideas
Fixed overlapping edges: reciprocal pairs (A→B / B→A) and repeated same-pair
edges rendered as near-identical stacked bezier curves with colliding labels.
New `src/components/edges/FlowEdge.tsx` (custom edge, registered as type `flow`):
groups edges by unordered node pair in `toReactFlow.ts`, fans each set apart with
a perpendicular offset canonicalised by node id (so both directions spread along
one screen axis), staggers labels along the curve. Lone edges keep the plain
bezier — no regression. Verified in-browser (Chrome screenshot), redeployed to
https://protoarch.web.app. 39+12 tests green.
  *Follow-up same session:* first pass still criss-crossed a long diagonal
  reciprocal pair (SignIn ⇄ authSession) — the old maths put both control points
  on the SAME side (the `*flip` on the perpendicular and the rank sign cancelled)
  and staggered labels along each edge's own direction so both labels bunched at
  one node. Rewrote FlowEdge: canonical A/B endpoints by node id, pure canonical
  perpendicular (no flip), bow scales with edge length, labels slide along the
  canonical A→B axis (not per-edge t). Re-verified in-browser, redeployed.
  *Follow-up 2:* the bowed return edge still passed THROUGH/behind the node box
  (JB: "409 line is going behind the api node… don't want lines behind or over
  nodes"). Switched to real routing: `NodeShell` now renders source+target
  handles on all 4 sides (primary pair visible, rest invisible/connectable);
  `toReactFlow` sends the primary edge of a pair out the main sides and every
  extra edge (reciprocal / repeat) out a side handle (`s-right`/`t-right` in TB,
  alternating), so it loops AROUND the stack. `FlowEdge` now just uses
  `getBezierPath` from the handle positions; a small bow is kept only for the
  3rd+ edge that reuses a side. Verified: 409 routes clear of the box.
  Redeployed. 39+12 tests green.
New ideas captured from JB: `lore/ideas/outline-sidebar.md` (Figma-style node-by-
type panel, cheap, no language change — do first) and `lore/ideas/fml-on-fml.md`
(portal node linking to a sub-flow; blocked on the multi-diagram refactor,
same-file v1 recommended before any cross-file workspace).

### 2026-09-03 — JB / Claude (cont.) — first deploy + shop.fml
Deployed the viewer to Firebase Hosting: project `protoarch`, site `protoarch`,
live at https://protoarch.web.app (custom domain proto.arque.app not wired yet —
DNS step, separate). `firebase init` had left `firebase.json` `"public": "public"`
pointing at the stock Firebase placeholder — changed it to `"dist"` (Vite's build
output). `public/index.html` (the boilerplate) is now unused; left in place, JB to
delete if he wants. No `predeploy` build hook yet — deploy = `npm run build` then
`firebase deploy --only hosting`. Added `examples/shop.fml` — the fullest example
(14 nodes incl. a `decision` type, 20 edges, 4 edge notes, `label:` on every
endpoint).

### 2026-09-03 — JB / Claude (cont.) — FML v0.2 edge notes
JB greenlit edge notes with a tight spec. Implemented the parse layer:
`FmlEdge.data?: Record<string,string>`; edge line may end with `{`, opening a
`key: value` block closed by a lone `}` (mirrors `@node x {`), on both inline and
grouped arrows. `addEdge` now returns the created edge so `consumeEdgeNote()`
attaches `data` to the exact arrow (never matched by src/target after the fact).
Pass 4 loop is now index-based. Unclosed block → error on the arrow line's
number; next flow line never swallowed. 6 new parser tests (39 green), 12 stats
green, typecheck + build clean. `examples/*.fml` parse identically. HOW-TO.md got
a real "Edge notes" section + gotchas/error-table/checklist rows.
Deliberately NOT done (out of scope, needs separate go-ahead): canvas rendering
of edge notes — `toReactFlow.ts` still drops `edge.data`; needs a custom edge
component. Tracked in `lore/ideas/edge-notes.md` → Follow-up.
Sharp edge left as-is: `#` after a space is a lexer comment, so `note: ... #114`
loses `#114` (same as `@node` bodies). Documented, not changed.

### 2026-09-03 — JB / Claude
Session "fml". An external agent used FML on a real app and reported back. Three
"missing capabilities" turned out to be real capabilities the docs undersold —
fixed `HOW-TO.md`: (1) any `@node` key renders on the box, added `note:` example;
(2) non-`page`/`api` types render as a grey tagged box, not "default page style"
(old doc claim was wrong); (3) promoted `demo.ts` as the no-canvas structural
self-check, with real sample output + a "what each line catches" table.
Code change: `label:` in a `@node` block now overrides the displayed name and is
stripped from the metadata list (`toReactFlow.ts`). Typecheck + 37 tests + build
green. One genuine gap — edges can't carry a `note`, only a short label — written
up as `lore/ideas/edge-notes.md` (v0.2 block syntax mirroring `@node`), proposed
to land BEFORE the multi-diagram refactor. Awaiting JB review.
Loaded: CLAUDE.md, GUARDRAILS.md, CONTEXT.md
Carry forward: header above was stale (still described the old tech-tree concept
from 2026-07-24 — FML pivot happened across intervening sessions); rewrote it.

### 2026-07-24 — JB / Claude
Initialized protoarque — a canvas-based tech tree / roadmap builder inspired by game progression maps (Minecraft tech trees, ONI research, Dr. Stone roadmap). Vision: drop nodes with icons/labels onto an infinite canvas, draw directed connections, toggle acquired state on nodes. Stack decided: Vite + React + TypeScript + @xyflow/react + Tailwind + localStorage + Firebase Hosting (proto.arque.app). No backend. lore scaffolded from scratch, CLI session registered as PAQ (f896f6b0).
Loaded: none (init session)
Left open: Vite project not yet bootstrapped, Firebase project not created
Carry forward: JB wants to plan properly before building — confirm feature scope before writing code
