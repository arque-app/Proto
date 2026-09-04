# Context — protoarque

**Focus:** FML — `.fml` Flowchart Markup Language: parser (`src/fml/`) + web viewer (React Flow + dagre)
**Phase:** R&D — language standardised (5 node types), viewer redesigned; live at https://protoarch.web.app
**Open:** node rename + add/delete node/edge (structural — needs an FmlDoc→text serializer); breadcrumb for portal drill-down (the jump itself works); "Open folder" (File System Access API); **JB has two logo concepts now — F\*ML (dev-facing mark) and protoArch (product wordmark) — waiting on final assets (vector/font or PNG) before either goes in the app**; sidebar resize; label crowding on primary+reciprocal at one node; `#` in a value is still eaten by the comment lexer (JB's call); `public/index.html` is dead Firebase boilerplate; repo moved to `github.com/joabeliot/ProtoArch` (org repo `arque-app/ProtoArch` retired; git remote + `CLAUDE.md` updated)
**Next:** graph-relaxation layout pass; then Variables (`{name}` interpolation, `@env`, `capture` resolution) toward executable flows

---

## Log

### 2026-09-04 — JB / Claude (cont.) — HOW-TO multi-file docs + reviewed/deployed a second agent's feature
Two small asks. (1) HOW-TO.md was missing the multi-file / multi-flow syntax —
added real sections for `@meta` (`title`, `base` → `api` path root), `@doc`
(multiple flows per file, doc-local ids, no cross-doc arrows), portals (a `flow`
node's `doc:` key), and `@fof` (`<path> as <name>`, no extension, nesting,
circular-import handling). File-shape table, error table, hand-off checklist
extended. Fixed a stale comment in `examples/multi.fml` that contradicted its own
portal usage. `70e36bc`.
(2) A different Claude session (Sonnet 4.6) pushed `a992180` straight to `main` —
"About tab + Walkthrough". PropertyPanel gets a Props/About tab switcher; About
surfaces the node's `note` as prose + lists inbound/outbound edges with labels.
Sidebar gets a Walkthrough section: BFS-traces the active doc, renders a
plain-text step list, marks loops with ↩. Reviewed the diff — additive, isolated
to 2 components + one prop wire-through, style matches. typecheck + 134 tests +
build green; both features verified in the browser. Deployed to
https://protoarch.web.app.
Nits noted, not blocking: `buildWalkthrough` re-filters edges in its loop
(O(V·E), fine at this scale); `isBack` flags any already-visited target so
convergent paths can get a spurious "loop" mark depending on BFS order;
disconnected cycle-islands past the first component aren't walked.
Naming (parked): FML = the language/format, protoArch = the product/company.
Repo renamed to `arque-app/ProtoArch`; git remote updated.
(3) Layout-cleanup pass 1 (`96b9018`, deployed). JB + his brother: "the graph
looks like a mess." Diagnosis: not node overlap — it's bezier edges cutting
diagonally + straight chains staircasing. Pure force relaxation is the wrong
tool for a ranked flowchart. Fix: forward edges → `getSmoothStepPath`
(orthogonal, 8px corners) in `FlowEdge`; back/reciprocal/parallel keep the
bowed C-curve. dagre `align: "UL"` + `nodesep`/`ranksep` 54/100 to straighten
chains.
(4) Pass 2 (`cf546d1`, deployed). JB on a real Plaid-resync graph: still messy.
Two changes: (a) **step-number badges** — `layout.ts` numbers nodes 1..k by
dagre rank (same-rank nodes share a number), rendered as a small accent pill
top-right of every card (`FmlNode`, `FmlNodeData.order`). (b) **all edges
orthogonal** — dropped the bowed-bezier branch in `FlowEdge` entirely;
reciprocal/repeated/back edges now use `getSmoothStepPath` too, stood off into
a gutter via `offset` (24 + tier*18; routed=30), so long returns run in a tidy
vertical lane instead of a curve across the diagram.
`service` isn't in the 5-type standard so that agent's file threw 7 warnings.
(5) Pass 3 + trace feature (`0c1ba27` + `8de77c2`, deployed). On a real
Plaid-resync graph JB reported labels still hidden. Root cause: React Flow
paints the node layer *after* the edge-label layer with no z-index, so any
label over a card is covered — fixed by `z-[6]` + shadow on the label. Also
`fanEdges` in `useFmlChart` tags each edge with its index among siblings that
share an exit/entry point; `FlowEdge` spreads the endpoint along the node side
(clamped to the border) so stacked labels ("step 1"/"step 2") separate.
Then, JB's ask: the step badge is now a button — click it and the canvas
spotlights that node's one-hop neighbourhood (self badge fills, predecessors
tagged PREV, successors NEXT, everything else → 20%). `trace` state in App,
neighbour sets computed in FlowCanvas; clears on Esc / pane-click / doc switch.
(6) DockPanel + toolbar trim (`b27dd15` → `687ebfc`, deployed). JB wanted
Walkthrough and Warnings out of their spots, collapsible, and the toolbar
stripped down. New `DockPanel` — a bottom-corner floating card whose title bar
is always shown and collapses the body to just that bar (state persisted per
panel; `raise` prop lifts it above the zoom controls; collapsed state
shrink-wraps its title). Walkthrough left the sidebar for `WalkthroughPanel`
(now bottom-right, above the zoom controls); `buildWalkthrough` moved there;
Sidebar no longer takes `edges`. Warnings/errors: `IssueList` deleted — the
toolbar's count is now a button opening a dropdown (outside-click / Esc close
via a capture-phase listener, since React Flow's pane eats bubble-phase
events). Zoom `<Controls>` → `bottom-right`. Toolbar stripped: removed the
node/edge stat readout, `TB`/`LR`, `strict`, `Fit`; layout is now permanently
"TB" and parsing permanently loose (`useFmlChart(ws, activeDoc, "TB", false)`).
Toolbar is Open / Save / Source / Reset + the issues dropdown. HOW-TO viewer
section updated to match.
(7) Placement churn, settled (`33e37a7` → `ae08b93`, deployed). JB: Reset gone
from the toolbar too (Open / Save / Source only). Edge labels capped at
`max-w-[150px] truncate` + full text on hover — a long label no longer spans
the diagram and hides the node under it. Walkthrough: briefly moved into the
sidebar, then back out to a `DockPanel` minimizable card **bottom-left**
(opposite the bottom-right zoom controls). `Controls` at `bottom-right`.
(8) Label-vs-node avoidance + Code tab (`26511cf`, deployed). `layout.ts`
exports `nodeRects` (boxes from the same size estimate dagre uses). New
`placeLabels` in `useFmlChart` gives every non-routed edge a `data.lx/ly`
anchor that isn't inside any node box — slides the midpoint toward the source
end, then sideways, until clear; `FlowEdge` uses it. Routed back edges keep the
gutter anchor and no longer get the fan-shift (that was curling the path — the
artifact JB kept seeing near `historyCompleteCheck`). Property panel gets a
third tab, **Code**: the selected node's literal FML (decl line + `@node { }`
block) in a textarea with copy / apply / revert. `fmlEdit.ts` gains
`nodeSource` (extract) and `setNodeSource` (parse edited text → type swap +
block rewrite via the existing targeted edits — comments inside the block are
not preserved). 4 new fmlEdit tests, 143 total.
`placeLabels` was reverted immediately (`e052ed9`) — it anchored on the
straight centre-to-centre line while paths are orthogonal, so labels detached
into empty space and stacked. Back to `getSmoothStepPath`'s own label point;
kept the `max-w-[150px]` cap + the no-fan-shift-on-routed fix. Label-on-node is
back to "small capped chip on the path" — acceptable, not a banner. A bounded
(~24px) perpendicular nudge is the careful version if it comes up again.
(9) Self-loop routing (`a8b7868`, deployed). The `↻`/`U` artifacts JB kept
seeing (near `historyCompleteCheck`, `ResyncPlaid` in his Plaid graph) were
self-referencing edges (`X -label> X`) — they got the default bottom→top
handles of their *own* card, a zero-distance path that folded flat and put the
label dead-center on the title (screenshot showed the label text literally
interleaved with the node name). `toReactFlow` now detects `source === target`
and routes it right→top instead (cycling through 4 side-pairs if a node has
more than one self edge); `FlowEdge` gives self-loops a bigger offset (40),
skips the fan shift. Verified with a constructed self-loop doc: the loop bows
out beside the card and back in above it, label included, clear of the title.
Also this round: `placeLabels` (item 8) was reverted one turn after shipping —
it anchored on the straight centre-to-centre line while paths are orthogonal,
so on a dense graph it flung labels away from their edges. Back to
`getSmoothStepPath`'s own label point; kept the width cap.
(10) Drag persistence (`362d73b`, deployed). JB: dragging a node then switching
docs and back lost the move — `chartNodes` is recomputed fresh by dagre on
every `useFmlChart` recompute (which fires on a doc switch), and the drag
lived only in FlowCanvas's local React Flow state. Fix keeps positions **out
of the `.fml`** (still layout-free by design) but persists them separately:
new `src/lib/nodePositions.ts`, one localStorage blob keyed by doc (file + doc
name — the same doc name can live in different `@fof` files) → node id →
`{x,y}`. `useFmlChart` merges saved positions over the dagre result after
`layout()` (and now also uses the *positioned* nodes, not the raw dagre ones,
when deciding which edges are back-edges — more accurate once a node's been
dragged). `FlowCanvas` saves on `onNodeDragStop` (drag end, immediately, no
debounce; covers a multi-node drag). Verified: dragged Login, switched to
checkout and back to main, it stayed put. HOW-TO viewer section updated
(also caught it still mentioning the removed Reset button — fixed).
Still open: long rank-skipping edges get a lonely lane; big graphs sprawl;
dagre doesn't route other nodes around a hand-placed one on next layout.
(11) Two logo concepts shared (not yet in the app): **F\*ML** — bold all-caps
mark, asterisk standing in for the joke rather than spelling it — meant for
the dev-facing language identity; **protoArch** — rounder, friendlier bold
wordmark for the product. Deliberately different typographic voices (loud dev
mark vs. polished product mark), matching the FML/protoArch split already
agreed. Waiting on JB for either a font/vector source or final PNGs before
wiring either into the sidebar — Tailwind here can only pull webfonts from
Google Fonts, so a custom/paid face means PNG, not a font swap.
(12) Repo moved (git remote updated, not deployed — no code change): JB
transferred the GitHub repo from `arque-app/ProtoArch` to
`github.com/joabeliot/ProtoArch` (personal account). History intact — fetch
confirmed `origin/main` matches local HEAD after the remote switch. Updated
`CLAUDE.md`'s Repo line; this file's header above.
(13) Trackpad pan (`8b7f32e`, deployed). JB: two-finger scroll zoomed instead
of panning. `<ReactFlow>` was on defaults (`zoomOnScroll: true`); set
`panOnScroll` + `zoomOnScroll={false}` + `zoomOnPinch` (kept explicit) —
two-finger scroll pans, pinch zooms, matching Figma/Miro. Config-only; couldn't
simulate a real trackpad gesture to verify feel, flagged that to JB.
Still open: long rank-skipping edges get a lonely lane; big graphs sprawl wide;
badge is a 20px target (small); trace + selection are independent; trace is
one-hop only (full up/down-stream chain would be a small change).
Loaded: CLAUDE.md, GUARDRAILS.md, CONTEXT.md

### 2026-09-04 — JB / Claude — node standard + full design pass  (branch `polish/design-and-node-standard`)
JB: "think of urself as a senior designer and senior engineer and senior product
designer… fix any mistakes/holes… push whatever we have to main, cut a branch."
Pushed the pending lore to `main` (`5e8ee5d`), then built on a branch.

**Language — the node standard shipped.** New `src/fml/nodeTypes.ts` is the
single source of truth: five types — `page`, `api`, `decision`, `event`, `flow`
— each with a colour, a glyph, a summary, `expects` and `optional` keys. Design
call made while building: `expects` holds **only** keys without which the node
can't do its job (`api` → method + path/url, `flow` → doc). A page's `route` and
a decision's `condition` moved to `optional`, because `Login = page` must stay a
complete, correct node — a sketch language that nags is a worse sketch language.
Parser: off-standard type warns (errors in strict); strict also hints at missing
expected keys; kv key charset gained `.` so the execution-ready `header.<Name>`,
`query.<name>`, `capture.<var>` keys parse. `unknown` is reserved for
parser-invented nodes and never double-warns.

**Design pass.** Node cards rebuilt: type accent rail + per-type SVG glyph +
type tag, selected state glows in the type's own colour, `flow` nodes get a
stacked-card "there's a doc behind this" silhouette, untyped nodes go dashed,
`page` nodes render an `image:` thumbnail (http/data URLs only), long meta lists
collapse to "+n more". One React Flow node type (`fml`) instead of the old
page/api aliasing. Sidebar: collapsible (⌘\), selection-aware and two-way with
the canvas, per-type glyphs, file removal, doc/flow counts. Toolbar: Save,
Reset, sidebar toggle, focus rings. `fitView` now takes a padding object built
from the real chrome widths, so nodes stop hiding under the toolbar and panels.
Empty-canvas state. Esc clears selection.

**Holes closed.** Edge notes are editable in the property panel (`setEdgeNote`
in `fmlEdit.ts`, + 13 tests) — the last read-only corner of the write-back path;
found and fixed a latent bug where a note body line like `blocked:` could be
mistaken for a group header, by teaching the edge-line finder to skip note
blocks. Portal drill-down (fml-on-fml step 3): double-click a `flow` node to
jump to the doc its `doc:` key names. "Reset to sample" finally exists. The
sample file was rewritten to demonstrate the whole standard — all five types,
exec-ready `api` keys with `{token}` interpolation and `capture.`, an edge note,
and a second `@doc`. All `examples/*.fml` updated to parse clean under strict.
Docs: `README.md` was a single line — written properly; `CLAUDE.md` still
described the abandoned 2026-07 tech-tree concept — rewritten; `HOW-TO.md` gained
the type standard, the execution-ready `api` key section and the viewer's
capabilities.

134 tests green (89 parse / 16 stats / 29 fmlEdit), typecheck + build clean.

**Review pass (same day, after JB said "take a look… deploy it"):** verified in
the browser — 5 types render with per-type accent + glyph, property-panel edit
writes back to source (method → PUT round-tripped), flow-node double-click
drills into its doc. Fixed three things the render exposed: dagre used a flat
190×72 per node so tall `api` cards overlapped neighbours (now estimates height
from node data); auto-fit depended on the padding object, which changes on every
selection, so each node click animated the viewport (now padding is read from a
ref, fit only on graph change); edge stroke `#565656` was near-invisible on
`#1b1b1b` (→ `#6f6f6f` / 1.75px). Also stripped stray NUL bytes from
`toReactFlow.ts`'s pairKey separator that had made the file diff as binary.

**Merged to `main` (`8111524`) and deployed** — live at https://protoarch.web.app.
Branch `polish/design-and-node-standard` deleted.
NOT done: `public/index.html` dead Firebase boilerplate still there (JB's call);
`#`-in-value still eaten by the comment lexer (JB's call); no breadcrumb for
portal drill-down; sidebar has no resize.
Loaded: CLAUDE.md, GUARDRAILS.md, CONTEXT.md

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
