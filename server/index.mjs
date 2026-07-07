import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BrenoxServer } from "@brenox/sdk/server";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "dist");
const PORT = Number(process.env.PORT ?? process.env.DEMO_SERVER_PORT ?? 3001);
const isProduction = process.env.NODE_ENV === "production";
const baseUrl = (
  process.env.BRENOX_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");
const apiKey = process.env.BRENOX_API_KEY;
const DEMO_CHANNEL_NAME = "general";
const STATE_FILE = path.join(__dirname, ".demo-room.json");

if (!apiKey) {
  console.error(
    "BRENOX_API_KEY is required. Create a sandbox key in the Brenox console.",
  );
  process.exit(1);
}

const server = new BrenoxServer({ baseUrl, apiKey });

const PERSONAS = {
  alice: { external_id: "demo-alice", username: "Alice" },
  bob: { external_id: "demo-bob", username: "Bob" },
};

/** @type {{ workspaceId: number; channelId: number } | null} */
let room = null;
/** @type {Promise<{ workspaceId: number; channelId: number }> | null} */
let roomPromise = null;

async function loadPersistedRoom() {
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (
      typeof parsed.workspaceId === "number" &&
      typeof parsed.channelId === "number"
    ) {
      return {
        workspaceId: parsed.workspaceId,
        channelId: parsed.channelId,
      };
    }
  } catch {
    // No persisted room yet — bootstrap below.
  }
  return null;
}

async function persistRoom(nextRoom) {
  await fs.writeFile(
    STATE_FILE,
    JSON.stringify(nextRoom, null, 2),
    "utf8",
  );
}

async function ensureRoom() {
  if (room) return room;
  if (roomPromise) return roomPromise;

  roomPromise = (async () => {
    const persisted = await loadPersistedRoom();
    if (persisted) {
      room = persisted;
      return room;
    }

    await server.users.provision(PERSONAS.alice);
    await server.users.provision(PERSONAS.bob);

    const channel = await server.channels.create(
      { name: DEMO_CHANNEL_NAME },
      `demo-channel-${DEMO_CHANNEL_NAME}`,
    );

    room = {
      workspaceId: channel.workspace_id,
      channelId: channel.id,
    };
    await persistRoom(room);
    return room;
  })();

  try {
    return await roomPromise;
  } finally {
    roomPromise = null;
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(payload);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

async function serveStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const relativePath =
    requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const filePath = path.join(DIST_DIR, relativePath);
  const normalized = path.normalize(filePath);

  if (!normalized.startsWith(DIST_DIR)) {
    sendJson(res, 404, { error: "not found" });
    return true;
  }

  try {
    const fileStat = await fs.stat(normalized);
    if (!fileStat.isFile()) {
      throw new Error("not a file");
    }

    const ext = path.extname(normalized);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
    });
    createReadStream(normalized).pipe(res);
    return true;
  } catch {
    if (!relativePath.includes(".")) {
      const indexPath = path.join(DIST_DIR, "index.html");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      createReadStream(indexPath).pipe(res);
      return true;
    }
    sendJson(res, 404, { error: "not found" });
    return true;
  }
}

const httpServer = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/api/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && req.url === "/api/config") {
      const config = await ensureRoom();
      sendJson(res, 200, {
        workspace_id: config.workspaceId,
        channel_id: config.channelId,
        channel_name: DEMO_CHANNEL_NAME,
        personas: Object.keys(PERSONAS),
      });
      return;
    }

    if (req.method === "POST" && req.url === "/api/session") {
      const body = await readJson(req);
      const persona = String(body.persona ?? "").toLowerCase();
      const mapping = PERSONAS[persona];
      if (!mapping) {
        sendJson(res, 400, { error: "persona must be alice or bob" });
        return;
      }

      const config = await ensureRoom();
      const session = await server.sessions.create({
        external_id: mapping.external_id,
        channel_id: config.channelId,
      });

      sendJson(res, 200, {
        token: session.token,
        workspace_id: session.workspace_id,
        channel_id: session.channel_id ?? config.channelId,
        user: session.user,
        persona,
      });
      return;
    }

    if (isProduction && req.method === "GET") {
      await serveStatic(req, res);
      return;
    }

    sendJson(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : "internal server error",
    });
  }
});

httpServer.listen(PORT, () => {
  console.log(
    isProduction
      ? `Brenox demo chat listening on http://localhost:${PORT}`
      : `Embed demo API listening on http://localhost:${PORT}`,
  );
  console.log(`Brenox engine: ${baseUrl}`);
  ensureRoom().catch((err) => {
    console.error("Demo room bootstrap failed:", err);
  });
});
