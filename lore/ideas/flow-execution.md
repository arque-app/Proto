# Idea: executable FML flows + variables  (the north star)

**Status:** step 1 (node standardisation), step 2 (variables) and step 3 (the
**engine**) are done — `src/fml/run.ts`, driven by `scripts/run.ts`, executes a
flow against a real API from the terminal today. What's left of step 3 is the
*browser* runner, which is blocked on the CORS answer, and on-canvas result UI.
**Raised by:** JB — "we'll need to add Variables… this is the whole dream for the
tool. i'll execute this api flow in the platform so i can test the api flow."

---

## What it becomes

FML today draws the flow. The dream: **run** it. Pick an `api` flow, hit "Run",
and protoArch fires the requests in order, threads values between them, checks
the responses — a visual API test harness where the diagram *is* the test.

For that, two things FML doesn't have yet:

### 1. Variables — DONE (2026-09-04, `src/fml/variables.ts`)

A value produced by one step, used by a later one. The canonical case:

```
authLogin  →  200  →  capture token from the body
                      later requests send  Authorization: Bearer {token}
```

Shape (decided — JB: "@vars for defaults, secrets stay unset"):
- `{name}` interpolation inside any value string — implemented, resolved (not
  executed) by `resolveVariables()` / `nodeVarUsage()`.
- A new `@vars` section declares literal defaults, same shape as `@meta`.
- `capture.token: $.data.token` on an earlier node also satisfies `{token}` —
  its value isn't known until the request actually runs, but the property
  panel's About tab shows *which node* will produce it.
- A `{name}` that's neither `@vars`-declared nor `capture`d resolves to
  nothing — that's the run-time-input / secret case, by design (a password
  should never sit in a committed file). The future runner prompts for these.
- **Open, not decided:** scope is per-`@doc` today. A `capture` in `main`
  doesn't resolve a `{name}` referenced in a doc it portals into via `flow` —
  even though that's obviously the same journey continuing. Does one *run*
  span multiple docs through their portals, carrying captured values across?
  Needs deciding before the runner (item 3) can thread a variable through a
  `flow` node.

### 2. Execution-ready `api` nodes

The `api` node's key set has to carry enough to actually send the request:

| key | meaning |
|---|---|
| `method` | GET / POST / PUT / PATCH / DELETE |
| `path` / `url` | path against `base`, or a full URL |
| `header.<Name>` | a request header (repeatable) — needs the kv key charset to allow `.` |
| `query.<name>` | a query-string param (repeatable) |
| `body` | request body (JSON) — multi-line body is a `@node` block limitation to solve |
| `auth` | `none` / `bearer {token}` / … |
| `capture.<var>` | pull a value from the response into a variable (JSONPath) |
| `expect` | status assertion for the run — `200`, `200,201` |

`decision` conditions become expressions over variables (`{status} == 200`).
An `event` node can seed the run's starting variables.

---

## Sequencing

1. **Node standardisation** — DONE. Type set + rendering + expected keys
   locked (`src/fml/nodeTypes.ts`); the `api` key set above is the standard.
2. **Variables** — DONE. `{…}` interpolation + `@vars` + `capture` parsing,
   resolved and shown in the property panel. No network yet.
3. **Engine — DONE** (2026-09-05, `src/fml/run.ts` + `scripts/run.ts`). Walks
   the graph, sends each `api` node, threads `capture`d values through one
   run-wide store, asserts `expect`, routes on the response status. Zero deps;
   the transport is an argument, so tests drive it with a fake and Node drives
   it with `fetch` — no CORS in Node, so flows are runnable *now*.
   The cross-doc scope question turned out **not** to block this: at run time
   there is a single flat variable store, so whether a capture crosses a portal
   is a *routing* decision (does the walk step into the portal's doc?), not a
   variables one. Whenever routing says yes, the values are already there.
4. Browser runner: swap the transport for `fetch`-behind-a-proxy (or the
   backend), then per-step pass/fail on the canvas. Blocked on: the CORS
   decision, and the run-result UI.

### Open question the engine surfaced

`expect: 200` and an outgoing `-404>` edge disagree about what a 404 *is*: the
assertion calls it a failure, the edge calls it a modelled path. Today `expect`
decides pass/fail and the walk stops at the first failure unless
`--keep-going`. Alternative worth considering: if a status has a matching edge,
the author clearly modelled it — keep walking it (still red overall if `expect`
says so), so you see the whole sad path instead of one line. Needs JB's call.

Related: [[fml-on-fml]] (a `flow` portal could be a reusable sub-sequence in a
run), [[edge-notes]] (an edge could carry a `when:` guard for the runner).
