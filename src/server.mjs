/**
 * server.mjs — HTTP server for Claude Code Organizer.
 * Routes only. All logic is in scanner.mjs and mover.mjs.
 * All UI is in src/ui/ (html, css, js).
 */

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { homedir } from "node:os";
import { scan } from "./scanner.mjs";
import { moveItem, deleteItem, getValidDestinations } from "./mover.mjs";

// ── Path safety ──────────────────────────────────────────────────────

const HOME = homedir();
const CLAUDE_DIR = join(HOME, ".claude");

/**
 * Validate that a file path is within allowed directories.
 * Prevents path traversal attacks (e.g. ../../etc/passwd).
 */
function isPathAllowed(filePath) {
  const resolved = resolve(filePath);
  // Allow paths under ~/.claude/ or under any discovered project repoDir
  if (resolved.startsWith(CLAUDE_DIR + "/") || resolved === CLAUDE_DIR) return true;
  // Allow paths under HOME (covers repo dirs with .mcp.json, CLAUDE.md etc)
  if (resolved.startsWith(HOME + "/")) return true;
  return false;
}

const UI_DIR = join(import.meta.dirname, "ui");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

// ── Cached scan data (refresh on each request to /api/scan) ──────────
let cachedData = null;

async function freshScan() {
  cachedData = await scan();
  return cachedData;
}

// ── Request helpers ──────────────────────────────────────────────────

function json(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

async function serveFile(res, filePath) {
  try {
    const content = await readFile(filePath);
    const mime = MIME[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

// ── Routes ───────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // ── API routes ──

  // GET /api/scan — full scan of all customizations
  if (path === "/api/scan" && req.method === "GET") {
    const data = await freshScan();
    return json(res, data);
  }

  // POST /api/move — move an item to a different scope
  if (path === "/api/move" && req.method === "POST") {
    const { itemPath, toScopeId, category, name } = await readBody(req);

    if (!cachedData) await freshScan();

    // Find the item by path + optional category/name (needed to disambiguate
    // items sharing the same file, e.g. multiple MCP servers in one .mcp.json)
    const item = cachedData.items.find(i =>
      i.path === itemPath &&
      !i.locked &&
      (!category || i.category === category) &&
      (!name || i.name === name)
    );
    if (!item) return json(res, { ok: false, error: "Item not found or locked" }, 400);

    const result = await moveItem(item, toScopeId, cachedData.scopes);

    // Refresh cache after move
    if (result.ok) await freshScan();

    return json(res, result, result.ok ? 200 : 400);
  }

  // POST /api/delete — delete an item
  if (path === "/api/delete" && req.method === "POST") {
    const { itemPath, category, name } = await readBody(req);

    if (!cachedData) await freshScan();

    const item = cachedData.items.find(i =>
      i.path === itemPath &&
      !i.locked &&
      (!category || i.category === category) &&
      (!name || i.name === name)
    );
    if (!item) return json(res, { ok: false, error: "Item not found or locked" }, 400);

    const result = await deleteItem(item, cachedData.scopes);

    if (result.ok) await freshScan();

    return json(res, result, result.ok ? 200 : 400);
  }

  // GET /api/destinations?path=...&category=...&name=... — valid move destinations
  if (path === "/api/destinations" && req.method === "GET") {
    if (!cachedData) await freshScan();
    const itemPath = url.searchParams.get("path");
    const category = url.searchParams.get("category");
    const name = url.searchParams.get("name");
    // Match by path + category + name to disambiguate items sharing the same path (e.g. hooks vs config in settings.json)
    const item = cachedData.items.find(i =>
      i.path === itemPath &&
      (!category || i.category === category) &&
      (!name || i.name === name)
    );
    if (!item) return json(res, { ok: false, error: "Item not found" }, 400);

    const destinations = getValidDestinations(item, cachedData.scopes);
    return json(res, { ok: true, destinations, currentScopeId: item.scopeId });
  }

  // POST /api/restore — restore a deleted file (for undo)
  if (path === "/api/restore" && req.method === "POST") {
    const { filePath, content, isDir } = await readBody(req);
    if (!filePath || !filePath.startsWith("/") || !isPathAllowed(filePath)) {
      return json(res, { ok: false, error: "Invalid or disallowed path" }, 400);
    }
    try {
      const { mkdir, writeFile: wf } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mkdir(dirname(filePath), { recursive: true });
      if (isDir) {
        // For skills: restore SKILL.md inside the directory
        await mkdir(filePath, { recursive: true });
        const skillPath = join(filePath, "SKILL.md");
        await wf(skillPath, content, "utf-8");
      } else {
        await wf(filePath, content, "utf-8");
      }
      await freshScan();
      return json(res, { ok: true, message: "Restored successfully" });
    } catch (err) {
      return json(res, { ok: false, error: `Restore failed: ${err.message}` }, 400);
    }
  }

  // POST /api/restore-mcp — restore a deleted MCP server entry
  if (path === "/api/restore-mcp" && req.method === "POST") {
    const { name, config, mcpJsonPath } = await readBody(req);
    if (!name || !config || !mcpJsonPath || !isPathAllowed(mcpJsonPath)) {
      return json(res, { ok: false, error: "Missing name, config, or mcpJsonPath, or disallowed path" }, 400);
    }
    try {
      let content = { mcpServers: {} };
      try {
        content = JSON.parse(await readFile(mcpJsonPath, "utf-8"));
        if (!content.mcpServers) content.mcpServers = {};
      } catch { /* file doesn't exist, start fresh */ }
      content.mcpServers[name] = config;
      const { writeFile: wf, mkdir: mk } = await import("node:fs/promises");
      const { dirname } = await import("node:path");
      await mk(dirname(mcpJsonPath), { recursive: true });
      await wf(mcpJsonPath, JSON.stringify(content, null, 2) + "\n");
      await freshScan();
      return json(res, { ok: true, message: `Restored MCP server "${name}"` });
    } catch (err) {
      return json(res, { ok: false, error: `Restore failed: ${err.message}` }, 400);
    }
  }

  // GET /api/file-content?path=... — read file content for detail panel
  if (path === "/api/file-content" && req.method === "GET") {
    const filePath = url.searchParams.get("path");
    if (!filePath || !filePath.startsWith("/") || !isPathAllowed(filePath)) {
      return json(res, { ok: false, error: "Invalid or disallowed path" }, 400);
    }
    try {
      const content = await readFile(filePath, "utf-8");
      return json(res, { ok: true, content });
    } catch {
      return json(res, { ok: false, error: "Cannot read file" }, 400);
    }
  }

  // GET /api/session-preview?path=... — parse JSONL session into readable conversation
  if (path === "/api/session-preview" && req.method === "GET") {
    const filePath = url.searchParams.get("path");
    if (!filePath || !filePath.endsWith(".jsonl") || !isPathAllowed(filePath)) {
      return json(res, { ok: false, error: "Invalid or disallowed session path" }, 400);
    }
    try {
      const raw = await readFile(filePath, "utf-8");
      const lines = raw.trim().split("\n");
      const messages = [];
      let title = null;
      let totalMessages = 0;

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          if (entry.aiTitle) title = entry.aiTitle;
          if (entry.message?.role && entry.message?.content) {
            const role = entry.message.role === "user" ? "👤 User" : "🤖 Assistant";
            const content = entry.message.content;
            // Content can be string or array of {type, text}
            const text = typeof content === "string"
              ? content
              : Array.isArray(content)
                ? content.filter(c => c.type === "text").map(c => c.text).join("\n")
                : "";
            if (text.trim()) {
              totalMessages++;
              const display = text.length > 500 ? text.slice(0, 500) + "\n... (truncated)" : text;
              messages.push(`${role}:\n${display}`);
            }
          }
        } catch { /* skip malformed lines */ }
      }

      // Show last 20 messages (most recent conversation)
      const last20 = messages.slice(-20);
      const header = title ? `# ${title}\n\n` : "";
      const showing = totalMessages > 20
        ? `Showing last 20 of ${totalMessages} messages\n\n`
        : `${totalMessages} messages\n\n`;
      const preview = header + showing + last20.join("\n\n---\n\n");
      return json(res, { ok: true, content: preview || "(empty session)" });
    } catch {
      return json(res, { ok: false, error: "Cannot read session" }, 400);
    }
  }

  // ── Static UI files ──

  if (path === "/" || path === "/index.html") {
    return serveFile(res, join(UI_DIR, "index.html"));
  }
  if (path === "/style.css") {
    return serveFile(res, join(UI_DIR, "style.css"));
  }
  if (path === "/app.js") {
    return serveFile(res, join(UI_DIR, "app.js"));
  }

  // Suppress favicon 404
  if (path === "/favicon.ico") {
    res.writeHead(204);
    return res.end();
  }

  // ── 404 ──
  res.writeHead(404);
  res.end("Not found");
}

// ── Start server ─────────────────────────────────────────────────────

export function startServer(port = 3847, maxRetries = 10) {
  const server = createServer(async (req, res) => {
    try {
      await handleRequest(req, res);
    } catch (err) {
      console.error("Error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });

  let attempt = 0;
  function tryListen(p) {
    server.listen(p, () => {
      console.log(`Claude Code Organizer running at http://localhost:${p}`);
    });
  }

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempt < maxRetries) {
      attempt++;
      const nextPort = port + attempt;
      console.log(`Port ${port + attempt - 1} in use, trying ${nextPort}...`);
      tryListen(nextPort);
    } else {
      console.error(`Failed to start server: ${err.message}`);
      process.exit(1);
    }
  });

  tryListen(port);
  return server;
}
