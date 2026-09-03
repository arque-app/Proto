import type { FmlIssue } from "../fml/index.ts";

interface Props {
  errors: FmlIssue[];
  warnings: FmlIssue[];
  offset: boolean;
}

function Row({ issue, tone }: { issue: FmlIssue; tone: "err" | "warn" }) {
  return (
    <div className="flex gap-2 px-1.5 py-1">
      <span
        className={`shrink-0 font-mono text-[11px] ${
          tone === "err" ? "text-red-400" : "text-amber-400"
        }`}
      >
        {issue.file ? `${issue.file}:` : ""}
        {issue.line}
      </span>
      <span className="text-[11px] leading-snug text-ink-dim">{issue.message}</span>
    </div>
  );
}

export function IssueList({ errors, warnings, offset }: Props) {
  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div
      className="absolute bottom-3 left-3 z-10 max-h-[38%] w-[440px] max-w-[calc(100%-1.5rem)] overflow-auto rounded-xl border border-line bg-surface/95 p-1.5 backdrop-blur-md"
      style={offset ? { right: "416px", width: "auto" } : undefined}
    >
      {errors.map((e, i) => (
        <Row key={`e${i}`} issue={e} tone="err" />
      ))}
      {warnings.map((w, i) => (
        <Row key={`w${i}`} issue={w} tone="warn" />
      ))}
    </div>
  );
}
