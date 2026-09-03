# Idea: edge notes (`note:` on a transition) — FML v0.2

**Status:** ✅ parse layer shipped 2026-09-03 (block syntax below, exactly as
proposed). Canvas rendering deliberately **not** built — see "Follow-up" at the
end. Consider promoting this file to `lore/decisions/` now that it's landed.
**Raised by:** feedback from an agent using FML on a real app — "the *why* often
lives on the transition (why this branch goes here, what decision drove it), and
there's nowhere to put it. Nodes take `note:`, edges don't."

---

## The gap

`FmlEdge` today is `{ id, source, target, label }`. `label` is the short text
that sits in the arrow (`401`, `tap login`). There is no place for a sentence.

Workarounds that exist now:
- cram it into the label — breaks the visual, `>` is illegal in a label anyway
- attach `note:` to the **target node** — wrong home when several arrows land on
  the same node for different reasons

Neither is right when the rationale belongs to *one specific arrow*.

---

## Proposed syntax — block form, mirrors `@node`

```
@flow
  authLogin -401> LoginScreen {
    note: token expired mid-flow, not a fresh 401
  }
```

Inside a group:

```
@flow
  authLogin:
    -200> Home
    -401> LoginScreen {
      note: refresh failed — force re-auth
    }
    -500> ErrorScreen
```

Rules (identical to `@node`):
- opening `{` on the **same line** as the arrow
- body is free-form `key: value`, one per line, indented deeper
- close with `}` alone on a line
- everything after the first `:` is the value
- block with no arrow above it → error; unclosed block → error

The block attaches to **that one arrow line**, so repeated `a → b` edges
(`edge_a_b`, `edge_a_b_1`) each carry their own block.

---

## Why block form (not inline `{ note: ... }`)

- One syntax to learn — the LLM already knows `@node { }`
- No "`}` inside the value" problem: `}` is only special alone on a line, same
  rule the parser already enforces for `@node`
- Room to grow — `condition:`, `guard:`, `auth:` later without a syntax change

Inline `a -x> b { note: ... }` is rejected for v0.2: two ways to do one thing.

---

## Impact

### Types
`FmlEdge` gains `data: Record<string, string>` (always present, `{}` when empty)
— mirrors `FmlNode.data`. `label` unchanged.

### Parser (`parse.ts`, ~30 lines)
- In Pass 4, detect an edge line with a trailing `\s*\{$`: strip the brace,
  re-match the remainder against `groupEdge` / `inlineEdge`, and on a hit enter
  "edge-block" mode.
- Edge-block mode consumes following lines through `parseKv` until a lone `}`,
  then resumes normal flow parsing. While open it suppresses the group-indent
  reset so the deeper-indented body isn't read as group edges.
- Unclosed → `@edge block is missing a closing "}"` (parallels the `@node` error).
- 2–3 new parser tests, 1 stats test (edges with data still analyse the same).

### Rendering (`toReactFlow.ts` + a custom edge)
- Carry `data` onto the React Flow edge.
- Register a custom edge type that draws the existing label pill and, when
  `data.note` is set, a small dot / `ℹ` marker with the note in a `title`
  tooltip (native, no dep) for v0.2. Richer popover is a later polish.
- Dagre layout is unaffected — edges aren't measured for rank.

### Docs
Replace the "v0.2 addition" blockquote in `HOW-TO.md` with the real syntax +
an example, and add an `@edge` row to the error table.

**Effort:** ~S/M. One focused session: parser + types + tests, then the edge
component, then docs.

---

## Sequencing

Do this **before** the multi-diagram / blank-line-boundary refactor. Edge notes
unblock actual modelling work; multi-diagram is organisation. Both touch the
Pass-4 state machine, so whichever lands first, the other rebases onto it.

---

## What shipped (2026-09-03)

Block-only, free-form keys — decisions 1 & 2 below went the recommended way.

- `src/fml/types.ts` — `FmlEdge.data?: Record<string, string>` (optional; edges
  without a block serialise byte-for-byte as before).
- `src/fml/parse.ts` — `RE.groupEdge` / `RE.inlineEdge` gained an optional
  trailing `(\s*\{)?` group; `addEdge` now returns the created `FmlEdge`; Pass 4
  is index-based; new `consumeEdgeNote()` helper reads the block (`key: value`
  lines, indent > the arrow line, closed by a lone `}`) and attaches `data` to
  the exact edge — never matched by source/target after the fact.
- Unclosed block → `edge note block for "X -> Y" is missing a closing "}"`,
  carrying the **arrow line's** number. The following flow line is never
  swallowed.
- `src/fml/parse.test.ts` — 6 new cases (39 parse tests green, 12 stats green).
- `HOW-TO.md` — real "Edge notes" section under `@flow`, gotchas + error-table +
  checklist rows.
- Verified: `demo.ts --json` shows `edges[].data`; `examples/*.fml` parse
  identically (0 edges carry `data`).

**Known sharp edge:** `#` after a space starts a comment at the lexer level, so
`note: see incident #114` loses `#114`. This is consistent with `@node` bodies
(same lexer) and was left as-is — changing comment handling was out of scope.
Documented in HOW-TO ("write `incident 114`, not `incident #114`"). If notes
turn out to need `#`, that's a separate lexer decision for JB.

## Follow-up (NOT done — needs a separate go-ahead)

**Canvas rendering for edge notes.** `toReactFlow.ts` still drops `edge.data`;
the React Flow edge shows only the label. A custom edge component (label pill +
a small `ℹ`/dot, note in a `title` tooltip for v1) is the next slice. Dagre
layout is unaffected. Open sub-questions:

- native `title` tooltip + discoverability dot — enough? or note always visible
  under the arrow (costs vertical space, crowds dense graphs)?
- node `note:` values currently `truncate` to one clipped line in `NodeShell`
  (fixed box height keeps dagre spacing predictable). Same call will apply to
  edge notes — decide wrap-or-expand once, covers both.

## Original open questions (now answered)

1. **Block-only, or also inline?** → block-only. Shipped.
2. **Free-form keys, or a whitelist?** → free-form, same as `@node`. Shipped.
3. Display — moved to Follow-up above.
4. Note truncation — moved to Follow-up above.
