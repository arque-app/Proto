import { useRef, type ChangeEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import type { FmlStats } from "../fml/index.ts";
import { fileKey } from "../types/workspace.ts";
import type { LayoutDirection } from "../types/chart.ts";
import type { FitPadding } from "./FlowCanvas.tsx";

interface Props {
  stats: FmlStats;
  dir: LayoutDirection;
  onDir: (d: LayoutDirection) => void;
  strict: boolean;
  onStrict: (v: boolean) => void;
  sourceOpen: boolean;
  onToggleSource: () => void;
  onAddFiles: (files: Record<string, string>) => void;
  /** Current entry file, for the download button. */
  entry: string;
  entrySource: string;
  onReset: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** Shared with the canvas so "Fit" clears the chrome too. */
  padding: FitPadding;
  errorCount: number;
  warningCount: number;
}

const btn =
  "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors outline-none focus-visible:ring-1 focus-visible:ring-accent/60";
const idle = "text-ink-dim hover:bg-white/[0.06] hover:text-ink";
const on = "bg-ink text-bg";
const sep = "mx-0.5 h-4 w-px bg-line";

export function Toolbar(props: Props) {
  const { fitView } = useReactFlow();
  const fileRef = useRef<HTMLInputElement>(null);

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

      <button className={`${btn} ${idle}`} onClick={() => fileRef.current?.click()}>
        Open&nbsp;.fml
      </button>
      <button className={`${btn} ${idle}`} onClick={download} title="Save the entry file">
        Save
      </button>

      <span className={sep} />

      <span className="px-1.5 font-mono text-[11px] text-ink-mute">
        <span className="text-ink-dim">{props.stats.flowCount}</span> flow
        {props.stats.flowCount === 1 ? "" : "s"}
        <span className="mx-1 text-line-strong">·</span>
        <span className="text-ink-dim">{props.stats.nodes}</span>n
        <span className="mx-1 text-line-strong">·</span>
        <span className="text-ink-dim">{props.stats.edges}</span>e
      </span>

      <span className={sep} />

      <button className={`${btn} ${props.dir === "TB" ? on : idle}`} onClick={() => props.onDir("TB")}>
        ↓&nbsp;TB
      </button>
      <button className={`${btn} ${props.dir === "LR" ? on : idle}`} onClick={() => props.onDir("LR")}>
        →&nbsp;LR
      </button>
      <button
        className={`${btn} ${props.strict ? on : idle}`}
        onClick={() => props.onStrict(!props.strict)}
        title="Undeclared nodes and off-standard types become errors; expected keys are checked"
      >
        strict
      </button>

      <span className={sep} />

      <button
        className={`${btn} ${idle}`}
        onClick={() => void fitView({ padding: props.padding, duration: 200 })}
      >
        Fit
      </button>
      <button className={`${btn} ${props.sourceOpen ? on : idle}`} onClick={props.onToggleSource}>
        Source
      </button>
      <button className={`${btn} ${idle}`} onClick={props.onReset} title="Replace the workspace with the sample file">
        Reset
      </button>

      {(props.errorCount > 0 || props.warningCount > 0) && (
        <span className="px-1.5 font-mono text-[11px]">
          {props.errorCount > 0 && <span className="text-danger">{props.errorCount}e</span>}
          {props.errorCount > 0 && props.warningCount > 0 && (
            <span className="mx-1 text-line-strong">·</span>
          )}
          {props.warningCount > 0 && <span className="text-warn">{props.warningCount}w</span>}
        </span>
      )}
    </div>
  );
}
