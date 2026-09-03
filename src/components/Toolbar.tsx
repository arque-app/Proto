import { useRef, type ChangeEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import type { FmlStats } from "../fml/index.ts";
import { fileKey } from "../types/workspace.ts";
import type { LayoutDirection } from "../types/chart.ts";

interface Props {
  stats: FmlStats;
  dir: LayoutDirection;
  onDir: (d: LayoutDirection) => void;
  strict: boolean;
  onStrict: (v: boolean) => void;
  sourceOpen: boolean;
  onToggleSource: () => void;
  onAddFiles: (files: Record<string, string>) => void;
  errorCount: number;
  warningCount: number;
}

const btn = "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors";
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
      <button className={`${btn} ${idle}`} onClick={() => fileRef.current?.click()}>
        Open&nbsp;.fml
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

      <button
        className={`${btn} ${props.dir === "TB" ? on : idle}`}
        onClick={() => props.onDir("TB")}
      >
        ↓&nbsp;TB
      </button>
      <button
        className={`${btn} ${props.dir === "LR" ? on : idle}`}
        onClick={() => props.onDir("LR")}
      >
        →&nbsp;LR
      </button>
      <button
        className={`${btn} ${props.strict ? on : idle}`}
        onClick={() => props.onStrict(!props.strict)}
        title="Treat undeclared nodes as errors"
      >
        strict
      </button>

      <span className={sep} />

      <button className={`${btn} ${idle}`} onClick={() => void fitView({ padding: 0.25 })}>
        Fit
      </button>
      <button
        className={`${btn} ${props.sourceOpen ? on : idle}`}
        onClick={props.onToggleSource}
      >
        Source
      </button>

      {(props.errorCount > 0 || props.warningCount > 0) && (
        <span className="px-1.5 font-mono text-[11px]">
          {props.errorCount > 0 && <span className="text-red-400">{props.errorCount}e</span>}
          {props.errorCount > 0 && props.warningCount > 0 && (
            <span className="mx-1 text-line-strong">·</span>
          )}
          {props.warningCount > 0 && <span className="text-amber-400">{props.warningCount}w</span>}
        </span>
      )}
    </div>
  );
}
