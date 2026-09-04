import { kindGlyph } from "../lib/nodeStyle.ts";

interface Props {
  kind: string;
  size?: number;
  className?: string;
}

/**
 * The icon for an FML node type. Falls back to a small ring for anything
 * outside the standard vocabulary, so an off-standard node still reads as a
 * node rather than as a broken icon.
 */
export function Glyph({ kind, size = 13, className }: Props) {
  const d = kindGlyph(kind);
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {d ? <path d={d} /> : <circle cx="8" cy="8" r="4.5" strokeDasharray="2.2 2" />}
    </svg>
  );
}
