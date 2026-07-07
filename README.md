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

Open `http://localhost:5173/demos/chat/`. Click **Alice** in one browser tab and **Bob** in another to try realtime chat in `#general`.

**Try a call:** Alice clicks **Start video** (or **Start voice**). Bob sees an incoming call banner and clicks **Join call**. Allow mic/camera when prompted.

> **Two terminals required:** Vite (`npm run dev`) only serves the UI. The embed API (`npm run dev:server`) must stay running on port 3001 — if it stops, you'll see proxy/`ECONNREFUSED` errors when opening a user.

## Environment

| Variable | Description |
|----------|-------------|
| `BRENOX_API_KEY` | Sandbox API key (`bx_test_*`) — server only, never in frontend |
| `BRENOX_API_URL` | Brenox engine URL (default `http://localhost:8080`) |
| `VITE_BRENOX_API_URL` | Same URL for `BrenoxClient` in the browser |
| `VITE_DEMO_API_URL` | Leave empty to use Vite proxy (`/api` → port 3001) |
| `DEMO_SERVER_PORT` | Embed API port (default `3001`) |
| `VITE_ICE_SERVERS` | Optional JSON array of STUN/TURN servers for WebRTC calls |

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
- Voice & video calls (`useCallSignaling` + WebRTC mesh)
- Typing indicators and channel events
- Notifications (`useNotifications`)
- File attachments

## Build & deploy

```bash
npm run build   # outputs dist/
NODE_ENV=production node server/index.mjs   # serves dist/ + /api/*
```

The production container serves the built UI and embed API from one process (`server/index.mjs`).

### Coolify

1. **New resource** → Application → GitHub repo `brainArt16/brenox-demo-chat`, branch `main`
2. **Build pack** → Docker Compose, compose file `docker-compose.yaml`, base directory `/`
3. **Domain** → e.g. `https://demo-chat.breno-x.com`
4. **Environment** (copy from `.env.prod.example`):
   - `BRENOX_API_URL=https://api.breno-x.com`
   - `BRENOX_API_KEY=bx_test_...` (sandbox key from [Brenox console](https://www.breno-x.com/apps))
   - `VITE_BRENOX_API_URL=https://api.breno-x.com`
   - `VITE_DEMO_API_URL=` (empty — UI calls `/api` on the same host)
5. **Brenox engine** — add the demo domain to CORS + WebSocket origins:
   ```env
   CORS_ALLOWED_ORIGINS=https://www.breno-x.com,https://demo-chat.breno-x.com
   WS_ALLOWED_ORIGINS=https://www.breno-x.com,https://demo-chat.breno-x.com
   ```
6. Deploy. Open your demo URL and pick **Alice** / **Bob**.

`VITE_*` values are baked in at **build** time. After changing them in Coolify, trigger **Rebuild without cache**.

## Troubleshooting

### `rate limit exceeded` (HTTP 429)

The Brenox engine limits requests per IP (default 300/min) and per API key on `/v1/*` (default 120/min). The demo can hit this during development with two tabs open.

**Fix for local engine** — add to `brenox-engine/.env` and restart the engine:

```bash
API_RATE_LIMIT_PER_MINUTE=1000
HTTP_RATE_LIMIT_PER_IP=2000
```

Wait one minute for the current window to reset, then retry.

### `WebSocket connection failed`

The engine checks the browser **Origin** against `WS_ALLOWED_ORIGINS`. If you open the demo at `http://127.0.0.1:5173` but only `localhost` is allowed (or vice versa), the WebSocket upgrade is rejected.

**Fix:** ensure `brenox-engine/.env` includes **both** hostname variants for port 5173:

```bash
WS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173
```

Restart the engine after editing. Use the same hostname in the URL bar that you configured (or allow both).

If connections still fail after many hot-reloads, restart the engine to clear stale WebSocket connection counts (`WS_MAX_CONNECTIONS_PER_USER`).

## Links

- [Step-by-step tutorial](https://www.breno-x.com/resources/demos/chat)
- [SDK docs](https://www.breno-x.com/docs)
