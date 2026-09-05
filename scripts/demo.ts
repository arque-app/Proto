// Usage: node scripts/demo.ts [path/to/file.fml] [--json] [--all]
import { readFileSync } from "node:fs";
import { dirname, resolve as resolvePath } from "node:path";
import { analyze, formatStats, lintDoc, parse } from "../src/fml/index.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--")) ?? "examples/auth.fml";
const showJson = args.includes("--json");
// `info` checks are statements of fact (run-time inputs), noisy by default.
const showAll = args.includes("--all");

// Resolve `@fof <path>` relative to the importing file, adding the .fml
// extension. `from` is the path as written in the parent; we track where each
// resolved so nested relative imports work.
const dirOf = new Map<string, string>();
const resolve = (path: string, from: string | undefined): string | undefined => {
  const baseDir =
    from === undefined ? dirname(resolvePath(file)) : (dirOf.get(from) ?? dirname(resolvePath(file)));
  const target = resolvePath(baseDir, path.endsWith(".fml") ? path : `${path}.fml`);
  try {
    const content = readFileSync(target, "utf8");
    dirOf.set(path, dirname(target));
    return content;
  } catch {
    return undefined;
  }
};

const res = parse(readFileSync(file, "utf8"), { resolve });

console.log(`=== ${file} ===`);
console.log(`ok: ${res.ok}   docs: ${res.file.docs.length}`);

if (res.errors.length) {
  console.log("\nerrors:");
  for (const e of res.errors) console.log(`  ${e.file ? `${e.file} ` : ""}line ${e.line}: ${e.message}`);
}
if (res.warnings.length) {
  console.log("\nwarnings:");
  for (const w of res.warnings) console.log(`  ${w.file ? `${w.file} ` : ""}line ${w.line}: ${w.message}`);
}

for (const doc of res.file.docs) {
  console.log();
  console.log(`── @doc ${doc.name}${doc.source ? `  (${doc.source})` : ""} ──`);
  console.log(formatStats(analyze(doc), doc.meta.title));

  // Semantic checks — the mistakes that only bite once you actually run it.
  const issues = lintDoc(doc).filter((i) => showAll || i.severity !== "info");
  if (issues.length > 0) {
    console.log("  checks:");
    for (const i of issues) {
      console.log(`    ${i.severity.padEnd(7)} ${i.nodeId}${i.key ? `.${i.key}` : ""}: ${i.message}`);
    }
  }
}

if (showJson) {
  console.log("\nfile:");
  console.log(JSON.stringify(res.file, null, 2));
}
