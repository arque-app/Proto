# APIs — protoarque

> No backend. No external APIs. This section is intentionally minimal.

## Firebase Hosting

- **Purpose:** Static file hosting for the built Vite app
- **Domain:** proto.arque.app
- **Deploy command:** `firebase deploy --only hosting`
- **Config file:** `firebase.json` at project root
- **SPA fallback:** All routes → `index.html`

## localStorage (internal "API")

All persistence goes through a custom `useMapStorage` hook. Components never read/write localStorage directly.

| Operation | Hook method |
|-----------|-------------|
| Load all maps | `useMapStorage().maps` |
| Load active map | `useMapStorage().activeMap` |
| Save map | `useMapStorage().saveMap(state)` |
| Delete map | `useMapStorage().deleteMap(id)` |
| Set active | `useMapStorage().setActive(id)` |
| Export JSON | `useMapStorage().exportJson(id)` |
| Import JSON | `useMapStorage().importJson(json)` |
