import type { FmlIssue } from "../fml/index.ts";
import { DockPanel } from "./DockPanel.tsx";

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

  const title = (
    <span className="flex gap-2">
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
    </span>
  );

  return (
    <DockPanel id="issues" side="right" inset={offset} title={title}>
      {errors.map((e, i) => (
        <Row key={`e${i}`} issue={e} tone="err" />
      ))}
      {warnings.map((w, i) => (
        <Row key={`w${i}`} issue={w} tone="warn" />
      ))}
    </DockPanel>
  );
}
