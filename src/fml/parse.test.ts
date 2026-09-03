// Usage: node src/fml/parse.test.ts
import { parse } from "./index.ts";

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function eq<T>(name: string, actual: T, expected: T): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  ok(name, a === e, `got ${a}, want ${e}`);
}

// 1. basic: meta + roster + one inline edge
{
  const r = parse(`
@meta
  title: T
@nodes
  A = page
  B = api
@flow
  A -go> B
`);
  ok("basic parses", r.ok);
  eq("basic node count", r.doc.nodes.length, 2);
  eq("basic edge", r.doc.edges[0], { id: "edge_A_B", source: "A", target: "B", label: "go" });
  eq("basic meta", r.doc.meta.title, "T");
}

// 2. grouped flow: one source, many branches
{
  const r = parse(`
@nodes
  login = api
  Dash = page
  NF = page
@flow
  login:
    -200> Dash
    -404> NF
`);
  ok("grouped parses", r.ok);
  eq("grouped edge count", r.doc.edges.length, 2);
  eq("grouped e0", r.doc.edges[0], { id: "edge_login_Dash", source: "login", target: "Dash", label: "200" });
  eq("grouped e1", r.doc.edges[1], { id: "edge_login_NF", source: "login", target: "NF", label: "404" });
}

// 3. @node blocks attach + merge metadata; empty label
{
  const r = parse(`
@nodes
  x = api
@node x {
  endpoint: https://h/y
  method: POST
}
@node x {
  auth: none
}
@flow
  x -> x
`);
  eq("merged data", r.doc.nodes[0]!.data, {
    endpoint: "https://h/y",
    method: "POST",
    auth: "none",
  });
  eq("empty label", r.doc.edges[0]!.label, "");
}

// 4. comments + blank lines are ignored
{
  const r = parse(`
# top comment
@nodes
  A = page   # trailing comment
  B = page

@flow
  A -x> B
`);
  ok("comments parse", r.ok);
  eq("comment node count", r.doc.nodes.length, 2);
}

// 5. strict mode: undeclared flow ref is an error
{
  const r = parse(`
@nodes
  A = page
@flow
  A -x> Ghost
`);
  ok("undeclared ref errors", !r.ok && r.errors.length === 1);
}

// 6. loose mode: undeclared flow ref is auto-created
{
  const r = parse(
    `
@nodes
  A = page
@flow
  A -x> Ghost
`,
    { strict: false },
  );
  ok("loose parses", r.ok);
  eq("ghost type", r.doc.nodes.find((n) => n.id === "Ghost")?.type, "unknown");
  ok("loose warns", r.warnings.length === 1);
}

// 7. arrow normalisation + repeated pair gets unique ids
{
  const r = parse(`
@nodes
  A = page
  B = page
@flow
  A --> B
  A -200,202> B
`);
  eq("--> is empty label", r.doc.edges[0]!.label, "");
  eq("multi-status is one label", r.doc.edges[1]!.label, "200,202");
  eq("repeat pair id", r.doc.edges[1]!.id, "edge_A_B_1");
}

// 8. section order does not matter
{
  const r = parse(`
@flow
  A -x> B
@nodes
  A = page
  B = page
`);
  ok("out-of-order parses", r.ok);
  eq("out-of-order edge count", r.doc.edges.length, 1);
}

// 9. real example file shape
{
  const r = parse(`
@meta
  title: Auth Flow
@nodes
  Login = page
  login = api
  Dashboard = page
  not_found = page
  unauthorized = page
@node login {
  endpoint: https://api.example.com/auth/login
  method: POST
}
@flow
  Login -click> login
  login:
    -200,202> Dashboard
    -404> not_found
    -403> unauthorized
`);
  ok("example parses", r.ok);
  eq("example nodes", r.doc.nodes.length, 5);
  eq("example edges", r.doc.edges.length, 4);
  eq("example login endpoint", r.doc.nodes.find((n) => n.id === "login")?.data.endpoint,
    "https://api.example.com/auth/login");
}

// 10. inline edge with a single-key note block (v0.2)
{
  const r = parse(`
@nodes
  A = page
  B = page
@flow
  A -x> B {
    note: token expired mid-flow, not a fresh 401
  }
`);
  ok("inline edge note parses", r.ok);
  eq("inline edge note data", r.doc.edges[0]!.data, {
    note: "token expired mid-flow, not a fresh 401",
  });
}

// 11. grouped edge with a note block; sibling branch keeps no data
{
  const r = parse(`
@nodes
  api = api
  Home = page
  Err = page
@flow
  api:
    -200> Home
    -500> Err {
      note: only fires on a cold DB
    }
`);
  ok("grouped edge note parses", r.ok);
  eq("grouped edge note count", r.doc.edges.length, 2);
  eq("grouped sibling has no data", r.doc.edges[0]!.data, undefined);
  eq("grouped edge note data", r.doc.edges[1]!.data, { note: "only fires on a cold DB" });
}

// 12. multiple key: value lines in one block (any key, not just note)
{
  const r = parse(`
@nodes
  A = page
  B = page
@flow
  A -x> B {
    note: first
    owner: jb
    ticket: 114
  }
`);
  ok("multi-key edge note parses", r.ok);
  eq("multi-key edge note data", r.doc.edges[0]!.data, {
    note: "first",
    owner: "jb",
    ticket: "114",
  });
}

// 13. missing closing } → error carrying the edge line's number
{
  const r = parse(`
@nodes
  A = page
  B = page
@flow
  A -x> B {
    note: unterminated
`);
  ok("unclosed edge note errors", !r.ok);
  ok(
    "unclosed edge note message + line",
    r.errors.some((e) => e.line === 6 && /missing a closing "\}"/.test(e.message)),
    JSON.stringify(r.errors),
  );
}

// 14. a note block does not swallow the following flow line
{
  const r = parse(`
@nodes
  A = page
  B = page
  C = page
@flow
  A -x> B {
    note: annotated
  }
  B -y> C
`);
  ok("post-note flow line parses", r.ok);
  eq("post-note edge count", r.doc.edges.length, 2);
  eq("post-note e1", r.doc.edges[1], { id: "edge_B_C", source: "B", target: "C", label: "y" });
}

// 15. edge with no note block is unchanged (no `data` key at all)
{
  const r = parse(`
@nodes
  A = page
  B = page
@flow
  A -go> B
`);
  eq("plain edge has no data key", Object.hasOwn(r.doc.edges[0]!, "data"), false);
}

// --- multi-doc (v0.2) ---

// 16. no @doc header ⇒ one implicit "main" doc; .doc aliases file.docs[0]
{
  const r = parse(`
@nodes
  A = page
@flow
  A -> A
`);
  eq("implicit doc count", r.file.docs.length, 1);
  eq("implicit doc name", r.file.docs[0]!.name, "main");
  ok("doc aliases docs[0]", r.doc === r.file.docs[0]);
}

// 17. one @doc header names the doc
{
  const r = parse(`
@doc checkout
@nodes
  Cart = page
`);
  eq("named doc count", r.file.docs.length, 1);
  eq("named doc name", r.file.docs[0]!.name, "checkout");
}

// 18. multiple @doc blocks ⇒ multiple docs, in order
{
  const r = parse(`
@doc main
@nodes
  Home = page
@flow
  Home -open> Home

@doc checkout
@nodes
  Cart = page
  Pay = page
@flow
  Cart -next> Pay
`);
  ok("two docs parse", r.ok);
  eq("doc count", r.file.docs.length, 2);
  eq("doc names", r.file.docs.map((d) => d.name), ["main", "checkout"]);
  eq("main edges", r.file.docs[0]!.edges.length, 1);
  eq("checkout nodes", r.file.docs[1]!.nodes.length, 2);
}

// 19. lines before the first @doc seed the "main" doc
{
  const r = parse(`
@nodes
  Splash = page
@doc sub
@nodes
  X = page
`);
  eq("seeded main + named", r.file.docs.map((d) => d.name), ["main", "sub"]);
  eq("main has the pre-@doc nodes", r.file.docs[0]!.nodes[0]!.id, "Splash");
}

// 20. node ids are doc-local: same id in two docs = independent nodes
{
  const r = parse(`
@doc a
@nodes
  Screen = page
@node Screen {
  role: first
}

@doc b
@nodes
  Screen = api
@node Screen {
  role: second
}
`);
  eq("doc a Screen type", r.file.docs[0]!.nodes[0]!.type, "page");
  eq("doc b Screen type", r.file.docs[1]!.nodes[0]!.type, "api");
  eq("doc a Screen data", r.file.docs[0]!.nodes[0]!.data.role, "first");
  eq("doc b Screen data", r.file.docs[1]!.nodes[0]!.data.role, "second");
}

// 21. repeated @doc name merges, with a warning
{
  const r = parse(`
@doc x
@nodes
  A = page
@doc x
@nodes
  B = page
`);
  eq("merged into one doc", r.file.docs.length, 1);
  eq("merged node count", r.file.docs[0]!.nodes.length, 2);
  ok("repeat @doc warns", r.warnings.some((w) => /repeated/.test(w.message)));
}

// 22. malformed @doc line is an error and does not start a doc
{
  const r = parse(`
@doc
@nodes
  A = page
`);
  ok("bare @doc errors", !r.ok && r.errors.some((e) => /@doc needs a name/.test(e.message)));
  eq("falls back to main", r.file.docs[0]!.name, "main");
}

// --- @fof imports (v0.2) ---

const FILES: Record<string, string> = {
  auth: `
@nodes
  Login = page
  authApi = api
@flow
  Login -submit> authApi
`,
  checkout: `
@fof ./payment as payment
@nodes
  Cart = page
  Confirm = page
@flow
  Cart -pay> Confirm
`,
  payment: `
@nodes
  PayForm = page
  charge = api
@flow
  PayForm -charge> charge
`,
  loopA: `@fof ./loopB as loopB\n@nodes\n  A = page\n`,
  loopB: `@fof ./loopA as loopA\n@nodes\n  B = page\n`,
  broken: `
@nodes
  X = page
@flow
  X -> Ghost
`,
};
const resolve = (p: string): string | undefined => FILES[p.split("/").pop()!.replace(/\.fml$/, "")];

// 23. @fof … as <name> pulls in a doc under that name
{
  const r = parse(
    `
@fof ./screens/auth as signIn
@nodes
  Home = page
  SignIn = flow
@flow
  Home -go> SignIn
`,
    { resolve },
  );
  ok("fof parses", r.ok, JSON.stringify(r.errors));
  eq("fof doc names", r.file.docs.map((d) => d.name), ["main", "signIn"]);
  eq("imported doc source", r.file.docs[1]!.source, "./screens/auth");
  eq("imported nodes", r.file.docs[1]!.nodes.length, 2);
}

// 24. @fof with no `as` → name is the last path segment
{
  const r = parse(`@fof ./flows/auth\n@nodes\n  Home = page\n`, { resolve });
  eq("derived name", r.file.docs.map((d) => d.name), ["main", "auth"]);
}

// 25. no resolver → @fof is skipped with a warning, rest still parses
{
  const r = parse(`@fof ./auth as auth\n@nodes\n  Home = page\n`);
  ok("no-resolver parses", r.ok);
  eq("only the local doc", r.file.docs.length, 1);
  ok("warns about skipped fof", r.warnings.some((w) => /no resolver/.test(w.message)));
}

// 26. unresolved path → error in strict, warning in loose
{
  const strictR = parse(`@fof ./missing as m\n@nodes\n  A = page\n`, { resolve });
  ok("strict unresolved errors", !strictR.ok && strictR.errors.some((e) => /cannot resolve/.test(e.message)));
  const looseR = parse(`@fof ./missing as m\n@nodes\n  A = page\n`, { resolve, strict: false });
  ok("loose unresolved warns", looseR.warnings.some((w) => /cannot resolve/.test(w.message)));
}

// 27. recursive @fof: main → checkout → payment
{
  const r = parse(`@fof ./checkout as checkout\n@nodes\n  Home = page\n`, { resolve });
  ok("recursive fof parses", r.ok, JSON.stringify(r.errors));
  eq("all three docs", r.file.docs.map((d) => d.name), ["main", "checkout", "payment"]);
  eq("nested payment nodes", r.file.docs[2]!.nodes.length, 2);
}

// 28. circular @fof terminates with an error
{
  const r = parse(`@fof ./loopA as loopA\n@nodes\n  Home = page\n`, { resolve });
  ok("circular fof errors", r.errors.some((e) => /circular @fof/.test(e.message)));
}

// 29. an error inside an imported file carries its path
{
  const r = parse(`@fof ./broken as broken\n@nodes\n  Home = page\n`, { resolve });
  const inBroken = r.errors.find((e) => e.file === "./broken");
  ok("issue tagged with imported file", inBroken !== undefined, JSON.stringify(r.errors));
}

// 30. duplicate doc name (root "main" + import named "main") is renamed
{
  const r = parse(`@fof ./auth as main\n@nodes\n  Home = page\n`, { resolve });
  eq("deduped names", r.file.docs.map((d) => d.name), ["main", "main_2"]);
  ok("dedupe warns", r.warnings.some((w) => /renamed to "main_2"/.test(w.message)));
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
