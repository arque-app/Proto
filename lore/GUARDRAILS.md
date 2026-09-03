# Guardrails — protoarque

## Always

- Use React Flow (`@xyflow/react`) as the canvas engine — never roll custom canvas/SVG graph logic
- Keep all state in localStorage — no API calls, no external storage, no auth
- TypeScript strict mode — no `any` types
- Components live in `src/components/`, hooks in `src/hooks/`, types in `src/types/`
- One React Flow custom node type per visual variant (e.g. `IconNode`, `CardNode`)
- Export/import the full map state as a single JSON blob — nodes + edges + metadata

## Never

- No backend, no database, no auth — this is a pure client-side app
- Never use Next.js SSR features — this is Vite + React, static output only
- Never store image data in localStorage — reference URLs or use SVG/emoji only
- Never use `any` in TypeScript — define explicit types for node/edge data
- Never modify `lore/workspace/ticket.json` directly — always use `lore ticket` CLI
- Never touch `OG.md` or `MISSION.md` — human-only files

## Conventions

- Node ID format: `node_<uuid>` (generated on creation)
- Edge ID format: `edge_<sourceId>_<targetId>`
- localStorage key: `protoarque_map_<mapName>` for saved maps, `protoarque_active` for the active map
- Acquired state lives on the node's `data` object: `data.acquired: boolean`
- All map operations go through custom hooks — no direct React Flow mutations from components

## Frontend

- Tailwind for all styling — no inline styles except React Flow position overrides
- Dark-first design — the canvas is dark (game aesthetic)
- Toolbar floats above canvas — not a sidebar (keeps canvas space maximal)
- Pan: drag on empty canvas. Zoom: scroll wheel. Select: click node.
- Connection mode activated by toolbar button, not always-on

## React Flow Specifics

- Use `ReactFlowProvider` at the app root
- Custom nodes must call `useUpdateNodeInternals` when layout changes
- Edges use `type: 'smoothstep'` by default for game-tree look
- `nodesDraggable: true`, `edgesUpdatable: true` in ReactFlow props
