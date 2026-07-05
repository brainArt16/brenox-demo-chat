import http from "node:http";
import { BrenoxServer } from "@brenox/sdk/server";

const PORT = Number(process.env.DEMO_SERVER_PORT ?? 3001);
const baseUrl = (
  process.env.BRENOX_API_URL ?? "http://localhost:8080"
).replace(/\/$/, "");
const apiKey = process.env.BRENOX_API_KEY;

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

async function ensureRoom() {
  if (room) return room;

  await server.users.provision(PERSONAS.alice);
  await server.users.provision(PERSONAS.bob);

  const channel = await server.channels.create({ name: "general" });
  room = {
    workspaceId: channel.workspace_id,
    channelId: channel.id,
  };
  return room;
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
        channel_name: "general",
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

    sendJson(res, 404, { error: "not found" });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : "internal server error",
    });
  }
});

httpServer.listen(PORT, () => {
  console.log(`Embed demo API listening on http://localhost:${PORT}`);
  console.log(`Brenox engine: ${baseUrl}`);
});
