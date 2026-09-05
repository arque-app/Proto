import { useEffect, useRef, useState, type ChangeEvent } from "react";
import type { FmlIssue } from "../fml/index.ts";
import { fileKey } from "../types/workspace.ts";

interface Props {
  sourceOpen: boolean;
  onToggleSource: () => void;
  onAddFiles: (files: Record<string, string>) => void;
  /** Current entry file, for the download button. */
  entry: string;
  entrySource: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  errors: FmlIssue[];
  warnings: FmlIssue[];
  /** Run controls — the active doc has at least one `api` node to send. */
  canRun: boolean;
  running: boolean;
  onRun: () => void;
  onStop: () => void;
}

const btn =
  "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent/60";
const idle = "text-ink-dim hover:bg-white/[0.06] hover:text-ink";
const on = "bg-ink text-bg";
const sep = "mx-0.5 h-4 w-px bg-line";

export function Toolbar(props: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const { errors, warnings } = props;
  const issueCount = errors.length + warnings.length;
  const [issuesOpen, setIssuesOpen] = useState(false);
  const issuesRef = useRef<HTMLDivElement>(null);

  // Close the issues dropdown on an outside click or Escape. The listener runs
  // in the capture phase so React Flow's pane can't swallow the event first.
  useEffect(() => {
    if (!issuesOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!issuesRef.current?.contains(e.target as Node)) setIssuesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIssuesOpen(false);
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [issuesOpen]);

  // A stale-closed dropdown should not linger once the issues clear.
  useEffect(() => {
    if (issueCount === 0) setIssuesOpen(false);
  }, [issueCount]);

  async function onPick(e: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length === 0) return;
    const added: Record<string, string> = {};
    for (const f of picked) added[fileKey(f.name)] = await f.text();
    props.onAddFiles(added);
    e.target.value = "";
  }

  function download() {
    const blob = new Blob([props.entrySource], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.entry}.fml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-xl border border-line bg-surface/85 p-1 backdrop-blur-md">
      <input
        ref={fileRef}
        type="file"
        accept=".fml,text/plain"
        multiple
        className="hidden"
        onChange={onPick}
      />

      {!props.sidebarOpen && (
        <>
          <button
            className={`${btn} ${idle}`}
            onClick={props.onToggleSidebar}
            title="Show sidebar (⌘\)"
          >
            ⟩
          </button>
          <span className={sep} />
        </>
      )}

      {/* The primary action, first and visually weightier than the rest —
          running the flow is what this whole thing is for. */}
      <button
        className={`${btn} ${
          props.running
            ? "bg-danger/15 text-danger ring-1 ring-danger/40 hover:bg-danger/25"
            : props.canRun
              ? "bg-api/15 text-api ring-1 ring-api/40 hover:bg-api/25"
              : "cursor-not-allowed text-ink-mute/50"
        }`}
        disabled={!props.canRun && !props.running}
        onClick={props.running ? props.onStop : props.onRun}
        title={
          props.running
            ? "Stop the run"
            : props.canRun
              ? "Send this flow's api calls"
              : "This doc has no api nodes to run"
        }
      >
        {props.running ? "■ Stop" : "▶ Run"}
      </button>
      <span className={sep} />

      <button className={`${btn} ${idle}`} onClick={() => fileRef.current?.click()}>
        Open&nbsp;.fml
      </button>
      <button className={`${btn} ${idle}`} onClick={download} title="Save the entry file">
        Save
      </button>

      <span className={sep} />

      <button className={`${btn} ${props.sourceOpen ? on : idle}`} onClick={props.onToggleSource}>
        Source
      </button>

      {issueCount > 0 && (
        <>
          <span className={sep} />
          <div ref={issuesRef} className="relative">
            <button
              className={`${btn} ${issuesOpen ? on : idle} font-mono`}
              onClick={() => setIssuesOpen((v) => !v)}
              title="Show errors and warnings"
            >
              {errors.length > 0 && <span className="text-danger">{errors.length}e</span>}
              {errors.length > 0 && warnings.length > 0 && (
                <span className="mx-1 text-line-strong">·</span>
              )}
              {warnings.length > 0 && <span className="text-warn">{warnings.length}w</span>}
            </button>

            {issuesOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-20 max-h-[55vh] w-[380px] max-w-[80vw] overflow-auto rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.7)]">
                {errors.map((it, i) => (
                  <IssueRow key={`e${i}`} issue={it} tone="err" />
                ))}
                {warnings.map((it, i) => (
                  <IssueRow key={`w${i}`} issue={it} tone="warn" />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function IssueRow({ issue, tone }: { issue: FmlIssue; tone: "err" | "warn" }) {
  return (
    <div className="flex gap-2 px-1.5 py-1">
      <span className={`shrink-0 font-mono text-[11px] ${tone === "err" ? "text-danger" : "text-warn"}`}>
        {issue.file ? `${issue.file}:` : ""}
        {issue.line}
      </span>
      <span className="text-[11px] leading-snug text-ink-dim">{issue.message}</span>
    </div>
  );
}
