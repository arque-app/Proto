# Data Models — protoarque

> Stub — finalize field shapes when building node/edge system.

## Node

Extends React Flow's `Node` type. The `data` field is the protoarque-specific payload.

```typescript
type NodeData = {
  label: string        // display name under the icon
  icon: string         // URL, emoji, or SVG string
  acquired: boolean    // whether this node is checked off
  category?: string    // optional grouping label
  notes?: string       // optional tooltip/description
}
```

## Edge

Extends React Flow's `Edge` type. Minimal extra data needed.

```typescript
type EdgeData = {
  label?: string       // optional edge label (e.g. "requires")
}
```

## Map (localStorage schema)

The full serialized state of a single tech tree map.

```typescript
type MapState = {
  id: string           // uuid
  name: string         // display name
  nodes: Node<NodeData>[]
  edges: Edge<EdgeData>[]
  createdAt: string    // ISO timestamp
  updatedAt: string    // ISO timestamp
}
```

## localStorage Keys

| Key | Value |
|-----|-------|
| `protoarque_maps` | `MapState[]` — all saved maps |
| `protoarque_active` | `string` — ID of the currently open map |
