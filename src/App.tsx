import { useCallback, useMemo, useState, type DragEvent } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { FmlEdge } from "./fml/index.ts";
import { FlowCanvas } from "./components/FlowCanvas.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { SourcePanel } from "./components/SourcePanel.tsx";
import { IssueList } from "./components/IssueList.tsx";
import { PropertyPanel, type Selection } from "./components/PropertyPanel.tsx";
import { useFmlChart } from "./hooks/useFmlChart.ts";
import { useLocalStorage } from "./hooks/useLocalStorage.ts";
import { SAMPLE_FML } from "./lib/sample.ts";
import { setEdgeLabel, setNodeBlock, setNodeType } from "./lib/fmlEdit.ts";
import { fileKey, type Workspace } from "./types/workspace.ts";
import type { LayoutDirection } from "./types/chart.ts";

const WS_KEY = "protoarque_fml_ws";

function initialWorkspace(): Workspace {
  try {
    const stored = localStorage.getItem(WS_KEY);
    if (stored) return JSON.parse(stored) as Workspace;
    const legacy = localStorage.getItem("protoarque_fml_source");
    if (legacy) return { files: { main: JSON.parse(legacy) as string }, entry: "main" };
  } catch {
    /* fall through to the sample */
  }
  return { files: { sample: SAMPLE_FML }, entry: "sample" };
}

/** After files are added, choose which one to parse from. */
function pickEntry(files: Record<string, string>, current: string): string {
  if (files[current]) return current;
  const withFof = Object.keys(files).find((k) => /^@fof\b/m.test(files[k] ?? ""));
  return withFof ?? (files.app ? "app" : files.main ? "main" : Object.keys(files)[0]!);
}

export function App() {
  const [ws, setWs] = useLocalStorage<Workspace>(WS_KEY, initialWorkspace());
  const [dir, setDir] = useLocalStorage<LayoutDirection>("protoarque_fml_dir", "TB");
  const [strict, setStrict] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);

  const chart = useFmlChart(ws, activeDoc, dir, strict);

  const addFiles = useCallback(
    (added: Record<string, string>) => {
      setWs((prev) => {
        const files = { ...prev.files, ...added };
        return { files, entry: pickEntry(files, prev.entry) };
      });
      setActiveDoc(null);
      setSel(null);
    },
    [setWs],
  );

  const setEntry = useCallback(
    (name: string) => {
      setWs((prev) => ({ ...prev, entry: name }));
      setActiveDoc(null);
      setSel(null);
    },
    [setWs],
  );

  const setEntrySource = useCallback(
    (text: string) => setWs((prev) => ({ ...prev, files: { ...prev.files, [prev.entry]: text } })),
    [setWs],
  );

  // The file an edit to the active doc must be written back into.
  const editTarget = useMemo(() => {
    const file = chart.doc.source ? fileKey(chart.doc.source) : ws.entry;
    // Inside its own file an @fof'd doc is just "main".
    const docName = chart.doc.source ? "main" : chart.doc.name;
    return { file, docName };
  }, [chart.doc, ws.entry]);

  const writeFile = useCallback(
    (updater: (text: string) => string) => {
      const { file } = editTarget;
      setWs((prev) => ({ ...prev, files: { ...prev.files, [file]: updater(prev.files[file] ?? "") } }));
    },
    [editTarget, setWs],
  );

  const commitNode = useCallback(
    (id: string, block: Record<string, string>, type: string) => {
      const node = chart.doc.nodes.find((n) => n.id === id);
      writeFile((text) => {
        let out = text;
        if (node && type !== node.type) out = setNodeType(out, editTarget.docName, id, type);
        return setNodeBlock(out, editTarget.docName, id, block);
      });
    },
    [chart.doc, editTarget, writeFile],
  );

  const commitEdgeLabel = useCallback(
    (edge: FmlEdge, label: string) => {
      writeFile((text) => setEdgeLabel(text, editTarget.docName, edge, label));
    },
    [editTarget, writeFile],
  );

  const onDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const picked = Array.from(e.dataTransfer.files ?? []).filter((f) => f.name.endsWith(".fml"));
      if (picked.length === 0) return;
      const added: Record<string, string> = {};
      for (const f of picked) added[fileKey(f.name)] = await f.text();
      addFiles(added);
    },
    [addFiles],
  );

  const fileNames = useMemo(() => Object.keys(ws.files), [ws.files]);

  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full">
        <Sidebar
          files={fileNames}
          entry={ws.entry}
          onEntry={setEntry}
          docs={chart.docs}
          activeDoc={chart.activeDoc}
          onActiveDoc={setActiveDoc}
          nodes={chart.nodes}
        />

        <div className="relative flex-1" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <FlowCanvas chartNodes={chart.nodes} chartEdges={chart.edges} onSelect={setSel} />
          <Toolbar
            stats={chart.stats}
            dir={dir}
            onDir={setDir}
            strict={strict}
            onStrict={setStrict}
            sourceOpen={sourceOpen}
            onToggleSource={() => setSourceOpen((v) => !v)}
            onAddFiles={addFiles}
            errorCount={chart.errors.length}
            warningCount={chart.warnings.length}
          />

          {sel && (
            <PropertyPanel
              sel={sel}
              doc={chart.doc}
              shiftLeft={sourceOpen}
              onClose={() => setSel(null)}
              onCommitNode={commitNode}
              onCommitEdgeLabel={commitEdgeLabel}
            />
          )}

          {sourceOpen && (
            <SourcePanel
              name={ws.entry}
              value={ws.files[ws.entry] ?? ""}
              onChange={setEntrySource}
              onClose={() => setSourceOpen(false)}
            />
          )}

          <IssueList errors={chart.errors} warnings={chart.warnings} offset={sourceOpen} />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
