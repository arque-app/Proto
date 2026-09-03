# Idea: FML on FML — linking one flow inside another

**Status:** in progress. Steps 1–2 shipped 2026-09-03 (multi-doc parser + `@fof`
cross-file imports + viewer multi-file open). Step 3 = portal drill-down.
**Raised by:** JB — "fml on fml… linking fml inside another fml".

---

## The want

A node that stands for a whole sub-flow. `Checkout` on the top-level map is one
box; open it and it's its own diagram (cart → address → payment → confirm).
Compose a big app map out of small focused pieces instead of one 200-line file.

---

## Format decision: plain-text multi-doc, NOT a zip

JB asked whether the `.fml`-as-zip idea (like `.docx`) is needed. **It isn't**,
and shouldn't be:

- `.docx` / `.epub` are zips because they bundle **heterogeneous** bytes — XML,
  images, fonts. FML bundles **homogeneous** content: more FML text.
- Homogeneous text bundles use a **delimiter**, never a binary container:
  `.pem` (multiple certs), multi-doc YAML (`---`), `.http` files (`###`), git
  fast-import streams.
- Zip throws away the property that makes FML worth having: open it in any
  editor and read it. `cat` → garbage, `git diff` → "binary files differ", no
  LLM can write it without tooling.

So the bundle format **is** more FML: one file, many docs, `@doc <name>` as the
entry delimiter. (See "Images" below for the one case that reintroduces a
container — as a build artifact, never the source.)

---

## Step 1 — multi-doc parser  ✅ shipped 2026-09-03

- `@doc <name>` at column 0 opens a doc (name charset `[A-Za-z0-9_]`).
- No `@doc` in the file ⇒ one implicit doc `"main"` — **every existing `.fml`
  is unchanged**. Lines before the first `@doc` seed `main`.
- Node ids are **doc-local**: same id in two docs = two independent nodes.
- Repeated `@doc <name>` ⇒ warning + merge. Malformed `@doc` ⇒ error, skipped.
- Types: `FmlDoc` gained `name`; new `FmlFile { docs: FmlDoc[] }`.
  `ParseResult.file` is the whole thing; `ParseResult.doc` stays as a
  convenience alias for `file.docs[0]` (so single-diagram callers and every
  existing test needed no change).
- `analyzeFile(file)` → per-doc stats. `demo.ts` prints one block per `@doc`.
- 21 new tests (60 parse + 16 stats green). `examples/multi.fml` added.
- Viewer currently still renders `docs[0]` only (no tab UI yet) — no crash.

## Step 2 — `@fof` cross-file imports  ✅ shipped 2026-09-03

Syntax — **no extension** (it's always `.fml`):

```fml
# app.fml
@fof ./screens/auth as auth
@fof ./screens/checkout          # no "as" ⇒ name = last path segment
```

- `parse(src, { resolve })` — `resolve(path, from) → string | undefined`, sync,
  caller-supplied. `from` is the importing file's path (for relative resolution).
  **No resolver ⇒ `@fof` lines warn and skip, so `parse(src)` still works.**
- Each imported file contributes **one doc** under the import name; recursion
  works (`checkout` `@fof`s `payment`); circular `@fof` → error (no infinite
  loop); depth capped at 16; unresolved path → error (strict) / warning (loose).
- `FmlDoc` gained `source` (the `@fof` path); `FmlIssue` gained `file` so an
  error inside an imported file points at the right file.
- Duplicate doc names across imports → renamed `name_2` + warning.
- `demo.ts` has an `fs` resolver (relative-to-importer, adds `.fml`).
  `examples/fof/` = app + auth + checkout + payment.
- **Viewer**: `Open .fml` is now multi-select; drop several files at once.
  State is a `Workspace { files, entry }` (localStorage `protoarque_fml_ws`,
  migrates the old `protoarque_fml_source`). A **FILES** strip picks the entry
  file; a **DOCS** strip picks which resolved doc to view. Resolver =
  `makeResolver(files)` keyed by base name. `useFmlChart(ws, activeDoc, …)`.
- 30 new parser tests (77 parse + 16 stats green). Deployed.

## Step 3 — portal drill-down  (next)

- A `flow`-typed node (or any node with `fof: <docname>`) becomes a **portal**:
  distinct style + ⤢ affordance, **double-click → jump to that doc** (instead of
  clicking the DOCS strip).
- Breadcrumb trail so you can walk back up; portal-cycle guard on the view.
- `fof:` naming a missing doc → warning/error like other refs.
- Drill-down only — no inline sub-graph expansion (id collisions, layout,
  boundary edges) unless it's ever actually wanted.

## Step 4 — `fml bundle` + "Open folder"  (later)

- **`fml bundle app.fml -o app.bundle.fml`** — CLI, inlines every `@fof` as a
  `@doc` block → one plain-text multi-doc file for deploy/share. Needs an
  FmlDoc→text serializer (also useful as a formatter / round-trip test).
- **"Open folder"** via the File System Access API (Chromium) — live multi-file
  authoring loop instead of re-picking files.

Pairs with [[outline-sidebar]] — the sidebar grows a "Docs" / "Files" section.

---

## Images on page nodes

Apps have screens, so a `page` node wants a screenshot. Keep the core text-pure:

- **`image:` is a key on the node's `@node { }` block** (not a node), holding a
  **path or URL** — never base64 in the `.fml`. It's a free-form key today; the
  viewer change is `PageNode` rendering `<img>` when `data.meta.image` is set.
- Resolve: absolute URL → use as-is; relative → against a base (from "Open
  folder", a deployed sibling path, or a `@meta base:` key).
- **Repo / hosting workflow** (main): `app.fml` + a `screens/` folder next to
  it. No blob.
- **"one shareable file" workflow**: a later `fml pack` → `.fmlpkg` (zip of the
  `.fml` + referenced images). Zip is legitimate here — heterogeneous content —
  but it's a **distribution artifact**, like a release `.zip` of a repo. The
  source of truth stays the plain `.fml` + folder.

---

## Sequencing

Step 1 done → **Step 2 (portal nodes + viewer tabs)** next → outline sidebar can
slot in anytime (independent) → Step 3 `@fof` + `fml bundle` is its own project.
Image rendering on `page` nodes is a small standalone viewer change, do whenever.
