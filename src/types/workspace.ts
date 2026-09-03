/** The set of .fml files loaded into the viewer, and which one we parse from. */
export interface Workspace {
  /** File name (without the `.fml` extension) → file contents. */
  files: Record<string, string>;
  /** Key into `files` — the file `@fof` resolution starts from. */
  entry: string;
}

/** `./screens/auth.fml` → `auth` — the key files are stored under. */
export function fileKey(path: string): string {
  return (path.split(/[/\\]/).pop() ?? path).replace(/\.fml$/i, "");
}

/** An `@fof` resolver backed by an in-memory file set, keyed by base name. */
export function makeResolver(files: Record<string, string>) {
  return (path: string): string | undefined => files[fileKey(path)];
}
