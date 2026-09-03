# Architecture Overview — protoarque

> Stub — populate when structural decisions are made.

## System Shape

Single-page client-side React app. No server. No API. All state in localStorage.

```
Browser
  └── React App (Vite)
        ├── ReactFlowProvider (root)
        ├── Canvas (React Flow)
        │     ├── Nodes (custom IconNode component)
        │     └── Edges (smoothstep directed)
        ├── Toolbar (floating, above canvas)
        ├── NodePalette (side panel — drag source)
        └── localStorage (persistence layer)
```

## Data Flow

```
User drops item from palette
  → creates node with uuid, icon, label, acquired=false
  → appended to React Flow nodes state
  → auto-saved to localStorage

User draws connection
  → creates edge with source/target IDs
  → appended to React Flow edges state
  → auto-saved to localStorage

User clicks acquired toggle on node
  → flips node.data.acquired
  → React Flow re-renders node
  → auto-saved to localStorage
```

## External Dependencies

| Dep | Role |
|-----|------|
| @xyflow/react | Canvas engine — nodes, edges, pan/zoom |
| Tailwind CSS | All styling |
| Firebase Hosting | Static file hosting at proto.arque.app |

## Infra

Firebase Hosting — static file deploy. No Cloud Functions. No Firestore.
`firebase.json` routes all paths to `index.html` (SPA fallback).
