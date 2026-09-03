# Idea: executable FML flows + variables  (the north star)

**Status:** vision captured, not scheduled. Node standardisation comes first.
**Raised by:** JB — "we'll need to add Variables… this is the whole dream for the
tool. i'll execute this api flow in the platform so i can test the api flow."

---

## What it becomes

FML today draws the flow. The dream: **run** it. Pick an `api` flow, hit "Run",
and protoArch fires the requests in order, threads values between them, checks
the responses — a visual API test harness where the diagram *is* the test.

For that, two things FML doesn't have yet:

### 1. Variables

A value produced by one step, used by a later one. The canonical case:

```
authLogin  →  200  →  capture token from the body
                      later requests send  Authorization: Bearer {token}
```

Shape (candidate, not decided):
- `{name}` interpolation inside any value string.
- Seeded from: a base/env (`@meta base:` or an `@env` section), an `event` node's
  payload, or a `capture` on an earlier `api` node.
- `capture.token: $.data.token` — JSONPath into the response → variable `token`.

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

1. **Node standardisation** (`lore/ideas/`… this doc's sibling / the type vocab) —
   NOW. Lock the type set + rendering + expected keys. Design the `api` key set
   above into the standard even though nothing executes yet, so we don't repaint.
2. Variables: `{…}` interpolation + `@env` + `capture` parsing. Parser +
   a resolved-value view. No network yet.
3. Runner: an execution engine that walks a flow, sends requests (needs a CORS
   story — proxy, or the platform backend JB mentioned), shows per-step
   pass/fail on the canvas.

Related: [[fml-on-fml]] (a `flow` portal could be a reusable sub-sequence in a
run), [[edge-notes]] (an edge could carry a `when:` guard for the runner).
