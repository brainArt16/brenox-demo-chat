# Brenox Embed Chat Demo

Demonstrates the **embed-first** Brenox integration: your backend provisions users with `BrenoxServer` + API key; your frontend chats with `BrenoxClient` + issued session tokens. End users never register on Brenox directly.

## Quick start

```bash
npm install
cp .env.example .env
# Set BRENOX_API_KEY=bx_test_... from https://www.breno-x.com/apps
```

**Terminal 1 — embed API**

```bash
npm run dev:server
```

**Terminal 2 — chat UI**

```bash
npm run dev
```

Open `http://localhost:5173/demos/chat/`. Click **Alice** in one browser and **Bob** in another (or incognito) to try realtime chat in `#general`.

## Environment

| Variable | Description |
|----------|-------------|
| `BRENOX_API_KEY` | Sandbox API key (`bx_test_*`) — server only, never in frontend |
| `BRENOX_API_URL` | Brenox engine URL (default `http://localhost:8080`) |
| `VITE_BRENOX_API_URL` | Same URL for `BrenoxClient` in the browser |
| `VITE_DEMO_API_URL` | Leave empty to use Vite proxy (`/api` → port 3001) |
| `DEMO_SERVER_PORT` | Embed API port (default `3001`) |

## Architecture

```
Your embed API (server/)     BrenoxServer + API key
        ↓ POST /v1/users, /v1/sessions
Brenox engine (api.breno-x.com)
        ↑ JWT + WebSocket
Your chat UI (src/)          BrenoxClient + @brenox/react
```

## Features demonstrated

- Embed session tokens (`POST /v1/sessions`)
- Live chat (REST history + WebSocket)
- Typing indicators and channel events
- Notifications (`useNotifications`)
- File attachments

## Build & deploy

```bash
npm run build
npm run sync:web-static   # copies dist/ into brenox-web/public/demos/chat
```

The embed API must run on your backend in production — the static UI alone is not enough for the Alice/Bob launcher.

## Links

- [Step-by-step tutorial](https://www.breno-x.com/resources/demos/chat)
- [SDK docs](https://www.breno-x.com/docs)
