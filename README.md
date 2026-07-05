# Brenox Chat Demo

Standalone Vite + React demo for the Brenox chat SDK. Deployed at `/demos/chat/` on the Brenox site.

## Quick start

```bash
npm install
cp .env.example .env   # optional — defaults to production API
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/demos/chat/`).

## Environment

| Variable | Description |
|----------|-------------|
| `VITE_BRENOX_API_URL` | Brenox API base URL. Defaults to `https://api.breno-x.com`. |

## Features

- **Auth** — register or log in; JWT stored in `localStorage` under `brenox_demo_chat_token`
- **Workspaces** — list, create, view details
- **Channels** — list, create, join
- **Live chat** — `useMessages` with WebSocket updates
- **Typing & events** — `useChannel` connection events (typing, presence, members, notifications)
- **Notifications** — `useNotifications` with polling
- **Attachments** — upload via presigned URL, attach to message, list on messages
- **Reset** — clears token and app state

## Build

Production build uses base path `/demos/chat/`:

```bash
npm run build
npm run preview
```

## Links

- [Interactive tutorial](https://www.breno-x.com/resources/demos/chat)
- [SDK docs](https://www.breno-x.com/docs)

## Stack

- Vite 8, React 19, TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`)
- `@brenox/sdk@0.1.2`, `@brenox/react@0.1.2`
