import { useEffect, useRef, useState } from "react";

interface Props {
  /** Variable names the doc references but can neither default nor capture. */
  names: string[];
  onRun: (values: Record<string, string>) => void;
  onCancel: () => void;
}

/** Anything that shouldn't be shoulder-surfed gets a password field. */
const SECRETISH = /(password|secret|token|key|auth|pin|otp)/i;

/**
 * Asked before a run starts, for the values the file deliberately doesn't
 * hold. A `{password}` with no `@vars` default is unresolved *on purpose* —
 * that's what keeps it out of a file you'd commit — so this is where it comes
 * from instead.
 *
 * Kept in React state for the session only: never written to the .fml, never
 * to localStorage. Reloading the page loses them, which is the correct
 * trade — the alternative is a tool that quietly persists your credentials.
 */
export function RunInputs({ names, onRun, onCancel }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
  }, []);

  const submit = () => onRun(values);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-bg/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[380px] rounded-xl border border-line bg-surface p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[13px] font-medium text-ink">This run needs a few values</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-ink-mute">
          Referenced as <span className="font-mono">{"{name}"}</span> but not declared in{" "}
          <span className="font-mono">@vars</span> and not captured by an earlier node.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {names.map((name, i) => (
            <label key={name} className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mute">
                {name}
              </span>
              <input
                ref={i === 0 ? first : undefined}
                type={SECRETISH.test(name) ? "password" : "text"}
                value={values[name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                  if (e.key === "Escape") onCancel();
                }}
                className="rounded-md border border-line bg-surface-2 px-2 py-1.5 font-mono text-[12px] text-ink outline-none focus:border-line-strong"
              />
            </label>
          ))}
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-ink-mute/80">
          Kept in memory for this session only — never written to the file or saved in the browser.
        </p>

        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-[12px] text-ink-dim transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded-md bg-elevated px-3 py-1.5 text-[12px] text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-2"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
