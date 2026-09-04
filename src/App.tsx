import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import type { FmlEdge } from "./fml/index.ts";
import { FlowCanvas, fitPadding } from "./components/FlowCanvas.tsx";
import { Sidebar } from "./components/Sidebar.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { SourcePanel } from "./components/SourcePanel.tsx";
import { PropertyPanel, type Selection } from "./components/PropertyPanel.tsx";
import { WalkthroughPanel } from "./components/WalkthroughPanel.tsx";
import { useFmlChart } from "./hooks/useFmlChart.ts";
import { useLocalStorage } from "./hooks/useLocalStorage.ts";
import { SAMPLE_FML } from "./lib/sample.ts";
import {
  nodeSource,
  setEdgeLabel,
  setEdgeNote,
  setNodeBlock,
  setNodeSource,
  setNodeType,
} from "./lib/fmlEdit.ts";
import { expandPortal, type BubbleGraph } from "./lib/expandPortal.ts";
import { nodeSize } from "./lib/layout.ts";
import { fileKey, type Workspace } from "./types/workspace.ts";

const WS_KEY = "protoarque_fml_ws";

/** Widths of the docked panels, shared by the layout and by fitView's padding. */
const PROPERTY_W = 280;
const SOURCE_W = 400;
/** Room for the floating toolbar at the top of the canvas. */
const TOOLBAR_H = 60;
const GUTTER = 28;

const sampleWorkspace = (): Workspace => ({ files: { sample: SAMPLE_FML }, entry: "sample" });

function initialWorkspace(): Workspace {
  try {
    const stored = localStorage.getItem(WS_KEY);
    if (stored) return JSON.parse(stored) as Workspace;
    const legacy = localStorage.getItem("protoarque_fml_source");
    if (legacy) return { files: { main: JSON.parse(legacy) as string }, entry: "main" };
  } catch {
    /* fall through to the sample */
  }
  return sampleWorkspace();
}

/** After files are added or removed, choose which one to parse from. */
function pickEntry(files: Record<string, string>, current: string): string {
  if (files[current]) return current;
  const withFof = Object.keys(files).find((k) => /^@fof\b/m.test(files[k] ?? ""));
  return withFof ?? (files.app ? "app" : files.main ? "main" : Object.keys(files)[0] ?? "main");
}

export function App() {
  const [ws, setWs] = useLocalStorage<Workspace>(WS_KEY, initialWorkspace());
  const [sidebarOpen, setSidebarOpen] = useLocalStorage("protoarque_fml_sidebar", true);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [sel, setSel] = useState<Selection | null>(null);
  // Node id whose neighbourhood is spotlighted, set by clicking a step badge.
  const [trace, setTrace] = useState<string | null>(null);
  // Portal node ids currently unfolded inline as a bubble.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Layout is always top-down; strict validation stays off (loose mode).
  const chart = useFmlChart(ws, activeDoc, "TB", false);

  // A trace id / expanded bubble is doc-local; drop both whenever the doc or file changes.
  useEffect(() => {
    setTrace(null);
    setExpanded(new Set());
  }, [chart.activeDoc, ws.entry]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Collapsing orphans anything selected inside that bubble — drop it
        // rather than leave the property panel pointing at a namespaced id
        // that no longer resolves to any rendered node.
        setSel((s) => (s && s.id.startsWith(`${id}::`) ? null : s));
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // One laid-out sub-graph per currently-expanded portal, anchored just below
  // its card. Recomputed fresh from dagre every time — nothing here persists.
  const bubbles = useMemo(() => {
    const out: BubbleGraph[] = [];
    for (const portalId of expanded) {
      const portalNode = chart.nodes.find((n) => n.id === portalId);
      if (!portalNode || portalNode.data.kind !== "flow") continue;
      const targetName = portalNode.data.meta.doc;
      const targetDoc = targetName ? chart.file.docs.find((d) => d.name === targetName) : undefined;
      if (!targetDoc) continue;
      const { w, h } = nodeSize(portalNode.data);
      out.push(
        expandPortal(
          portalId,
          { x: portalNode.position.x, y: portalNode.position.y, w, h },
          targetDoc,
          "TB",
        ),
      );
    }
    return out;
  }, [expanded, chart.nodes, chart.file]);

  // Namespaced bubble-child id -> the real doc + node id it stands in for.
  const bubbleIdMap = useMemo(() => {
    const m = new Map<string, { doc: string; rawId: string }>();
    for (const b of bubbles) for (const [k, v] of b.idMap) m.set(k, v);
    return m;
  }, [bubbles]);

  // What the canvas actually renders: the active doc's own graph, portal cards
  // wired up to toggle their bubble, plus every expanded bubble's content.
  const canvasNodes = useMemo(() => {
    const withExpand = chart.nodes.map((n) =>
      n.data.kind === "flow"
        ? { ...n, data: { ...n.data, expanded: expanded.has(n.id), onExpand: toggleExpand } }
        : n,
    );
    return [...withExpand, ...bubbles.flatMap((b) => b.nodes)];
  }, [chart.nodes, expanded, toggleExpand, bubbles]);

  const canvasEdges = useMemo(
    () => [...chart.edges, ...bubbles.flatMap((b) => b.edges)],
    [chart.edges, bubbles],
  );

  // A selection may be a bubble child — resolve it back to the doc + raw id
  // it actually represents, so edits land in the right file.
  const selResolved = useMemo(() => {
    if (!sel) return null;
    const mapped = bubbleIdMap.get(sel.id);
    if (mapped) {
      const doc = chart.file.docs.find((d) => d.name === mapped.doc);
      if (doc) return { doc, rawId: mapped.rawId };
    }
    return { doc: chart.doc, rawId: sel.id };
  }, [sel, bubbleIdMap, chart.file, chart.doc]);

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

  const removeFile = useCallback(
    (name: string) => {
      setWs((prev) => {
        const files = { ...prev.files };
        delete files[name];
        if (Object.keys(files).length === 0) return sampleWorkspace();
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

  // The file the current selection must be written back into — the active
  // doc by default, or whichever doc a bubble-child selection resolves to.
  const editTarget = useMemo(() => {
    const doc = selResolved?.doc ?? chart.doc;
    const file = doc.source ? fileKey(doc.source) : ws.entry;
    // Inside its own file an @fof'd doc is just "main".
    const docName = doc.source ? "main" : doc.name;
    return { file, docName };
  }, [selResolved, chart.doc, ws.entry]);

  const writeFile = useCallback(
    (updater: (text: string) => string) => {
      const { file } = editTarget;
      setWs((prev) => ({ ...prev, files: { ...prev.files, [file]: updater(prev.files[file] ?? "") } }));
    },
    [editTarget, setWs],
  );

  const commitNode = useCallback(
    (id: string, block: Record<string, string>, type: string) => {
      const doc = selResolved?.doc ?? chart.doc;
      const node = doc.nodes.find((n) => n.id === id);
      writeFile((text) => {
        let out = text;
        if (node && type !== node.type) out = setNodeType(out, editTarget.docName, id, type);
        return setNodeBlock(out, editTarget.docName, id, block);
      });
    },
    [selResolved, chart.doc, editTarget, writeFile],
  );

  const commitEdgeLabel = useCallback(
    (edge: FmlEdge, label: string) => {
      writeFile((text) => setEdgeLabel(text, editTarget.docName, edge, label));
    },
    [editTarget, writeFile],
  );

  const commitEdgeNote = useCallback(
    (edge: FmlEdge, data: Record<string, string>) => {
      writeFile((text) => setEdgeNote(text, editTarget.docName, edge, data));
    },
    [editTarget, writeFile],
  );

  const commitNodeCode = useCallback(
    (id: string, text: string) => {
      writeFile((src) => setNodeSource(src, editTarget.docName, id, text));
    },
    [editTarget, writeFile],
  );

  // Literal FML for the selected node — shown in the property panel's Code tab.
  const selNodeCode = useMemo(() => {
    if (sel?.kind !== "node" || !selResolved) return "";
    return nodeSource(ws.files[editTarget.file] ?? "", editTarget.docName, selResolved.rawId);
  }, [sel, selResolved, ws.files, editTarget]);

  // Drilling into a `flow` portal: `doc:` names a doc in the parsed file.
  const openDoc = useCallback(
    (name: string) => {
      if (!chart.docs.includes(name)) return;
      setActiveDoc(name);
      setSel(null);
    },
    [chart.docs],
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

  // Esc clears the selection; ⌘\ / Ctrl+\ toggles the sidebar. Both are
  // ignored while a field has focus so they never fight with typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.key === "Escape" && !typing) {
        setSel(null);
        setTrace(null);
      }
      if (e.key === "\\" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSidebarOpen]);

  const fileNames = useMemo(() => Object.keys(ws.files), [ws.files]);

  const padding = useMemo(
    () =>
      fitPadding({
        top: TOOLBAR_H,
        right: GUTTER + (sel ? PROPERTY_W : 0) + (sourceOpen ? SOURCE_W : 0),
        bottom: GUTTER,
        left: GUTTER,
      }),
    [sel, sourceOpen],
  );

  return (
    <ReactFlowProvider>
      <div className="flex h-full w-full">
        {sidebarOpen && (
          <Sidebar
            files={fileNames}
            entry={ws.entry}
            onEntry={setEntry}
            onRemoveFile={removeFile}
            docs={chart.docs}
            activeDoc={chart.activeDoc}
            onActiveDoc={setActiveDoc}
            nodes={chart.nodes}
            stats={chart.stats}
            selection={sel}
            onSelect={setSel}
            onCollapse={() => setSidebarOpen(false)}
          />
        )}

        <div className="relative flex-1" onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
          <FlowCanvas
            chartNodes={canvasNodes}
            chartEdges={canvasEdges}
            selection={sel}
            onSelect={setSel}
            onOpenDoc={openDoc}
            trace={trace}
            onTrace={setTrace}
            posDocKey={chart.posDocKey}
            padding={padding}
          />
          <Toolbar
            sourceOpen={sourceOpen}
            onToggleSource={() => setSourceOpen((v) => !v)}
            onAddFiles={addFiles}
            entry={ws.entry}
            entrySource={ws.files[ws.entry] ?? ""}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(true)}
            errors={chart.errors}
            warnings={chart.warnings}
          />

          {sel && selResolved && (
            <PropertyPanel
              sel={{ kind: sel.kind, id: selResolved.rawId }}
              doc={selResolved.doc}
              shiftLeft={sourceOpen ? SOURCE_W : 0}
              onClose={() => setSel(null)}
              onCommitNode={commitNode}
              onCommitEdgeLabel={commitEdgeLabel}
              onCommitEdgeNote={commitEdgeNote}
              nodeCode={selNodeCode}
              onCommitNodeCode={commitNodeCode}
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

          <WalkthroughPanel nodes={chart.nodes} edges={chart.doc.edges} />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
