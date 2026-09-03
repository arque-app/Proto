interface Props {
  name: string;
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}

export function SourcePanel({ name, value, onChange, onClose }: Props) {
  return (
    <div className="absolute right-0 top-0 z-10 flex h-full w-[400px] flex-col border-l border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <span className="font-mono text-[11px] text-ink-dim">
          {name}
          <span className="text-ink-mute">.fml</span>
        </span>
        <button
          className="rounded px-1.5 text-[13px] leading-none text-ink-mute transition-colors hover:bg-white/10 hover:text-ink"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="flex-1 resize-none bg-transparent p-3.5 font-mono text-[12.5px] leading-[1.7] text-ink caret-accent outline-none"
      />
    </div>
  );
}
