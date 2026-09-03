// Usage: node src/fml/stats.test.ts
import { analyze, analyzeFile, parse } from "./index.ts";

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

// three disconnected flows, the last one cyclic
{
  const s = analyze(
    parse(`
@nodes
  Login = page
  authApi = api
  Home = page
  Denied = page
  Cart = page
  payApi = api
  Receipt = page
  Settings = page
  Profile = page
@flow
  Login -submit> authApi
  authApi:
    -200> Home
    -401> Denied
  Cart -checkout> payApi
  payApi -200> Receipt
  Settings -edit> Profile
  Profile -save> Settings
`).doc,
  );
  eq("flow count", s.flowCount, 3);
  eq("entry points", s.entryPoints, ["Cart", "Login"]);
  eq("terminals", s.terminals, ["Denied", "Home", "Receipt"]);
  eq("by type", s.byType, { page: 7, api: 2 });
  eq("largest flow first", s.flows[0]!.nodes.length, 4);
  const cyclic = s.flows.find((f) => f.nodes.includes("Settings"))!;
  eq("cyclic flow has no entry point", cyclic.entryPoints, []);
  eq("cyclic flow edge count", cyclic.edges, 2);
}

// unwired nodes are not counted as flows
{
  const s = analyze(
    parse(`
@nodes
  A = page
  B = page
  Lonely = page
@flow
  A -x> B
`).doc,
  );
  eq("one flow", s.flowCount, 1);
  eq("unwired listed", s.unwired, ["Lonely"]);
}

// no edges ⇒ zero flows, everything unwired
{
  const s = analyze(
    parse(`
@nodes
  A = page
  B = api
`).doc,
  );
  eq("no edges no flows", s.flowCount, 0);
  eq("all unwired", s.unwired, ["A", "B"]);
}

// edges that survived a strict-mode error still analyse without throwing
{
  const r = parse(`
@nodes
  A = page
@flow
  A -x> Ghost
`);
  const s = analyze(r.doc);
  ok("analyse tolerates undeclared refs", s.flowCount === 1);
}

// analyzeFile: one stats block per @doc
{
  const rows = analyzeFile(
    parse(`
@doc main
@nodes
  Home = page
  Sub = page
@flow
  Home -open> Sub

@doc sub
@nodes
  A = page
  B = page
  C = page
@flow
  A -> B
  B -> C
`).file,
  );
  eq("row per doc", rows.map((r) => r.name), ["main", "sub"]);
  eq("main flow count", rows[0]!.stats.flowCount, 1);
  eq("sub node count", rows[1]!.stats.nodes, 3);
  eq("sub terminals", rows[1]!.stats.terminals, ["C"]);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
