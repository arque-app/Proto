import type { FmlIssue } from "../fml/index.ts";

interface Props {
  errors: FmlIssue[];
  warnings: FmlIssue[];
  /** Pixels of docked panel on the right, so the card never slides underneath. */
  offset: number;
}

function Row({ issue, tone }: { issue: FmlIssue; tone: "err" | "warn" }) {
  return (
    <div className="flex gap-2 px-1.5 py-1">
      <span
        className={`shrink-0 font-mono text-[11px] ${tone === "err" ? "text-danger" : "text-warn"}`}
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
      style={offset > 0 ? { right: offset + 12, width: "auto" } : undefined}
    >
      <div className="flex gap-2 px-1.5 pb-1 font-mono text-[10px] uppercase tracking-[0.08em]">
        {errors.length > 0 && (
          <span className="text-danger">
            {errors.length} error{errors.length === 1 ? "" : "s"}
          </span>
        )}
        {warnings.length > 0 && (
          <span className="text-warn">
            {warnings.length} warning{warnings.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {errors.map((e, i) => (
        <Row key={`e${i}`} issue={e} tone="err" />
      ))}
      {warnings.map((w, i) => (
        <Row key={`w${i}`} issue={w} tone="warn" />
      ))}
    </div>
  );
}
