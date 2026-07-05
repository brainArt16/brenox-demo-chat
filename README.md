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

## Deploy to brenox-web

The live demo at [breno-x.com/demos/chat](https://www.breno-x.com/demos/chat) is served as static files from the `brenox-web` Next.js app. After changing the demo, sync the Vite build into `brenox-web/public/demos/chat/`:

```bash
npm run sync:web-static
```

Then commit the updated files in `brenox-web` and deploy `brenox-web` as usual. The demo source stays in this repo; only the built `dist/` output is copied into the web app.

## Links

- [Interactive tutorial](https://www.breno-x.com/resources/demos/chat)
- [SDK docs](https://www.breno-x.com/docs)

## Stack

- Vite 8, React 19, TypeScript
- Tailwind CSS 4 (`@tailwindcss/vite`)
- `@brenox/sdk@0.1.2`, `@brenox/react@0.1.2`
