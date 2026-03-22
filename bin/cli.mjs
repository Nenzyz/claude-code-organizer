#!/usr/bin/env node

/**
 * cli.mjs — Entry point for Claude Code Organizer.
 * Usage:
 *   node bin/cli.mjs              → Start web dashboard (HTTP server)
 *   node bin/cli.mjs --mcp        → Start MCP server (stdio, for AI clients)
 *   node bin/cli.mjs --port 3847  → Start web dashboard on custom port
 */

const args = process.argv.slice(2);

if (args.includes('--mcp')) {
  // MCP server mode — AI clients connect via stdio
  await import('../src/mcp-server.mjs');
} else {
  // Web dashboard mode — human opens browser
  const { startServer } = await import('../src/server.mjs');
  const { execSync } = await import('node:child_process');

  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3847;

  startServer(port);

  try {
    const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
    execSync(`${openCmd} http://localhost:${port}`, { stdio: 'ignore' });
  } catch {
    // Browser didn't open, user can navigate manually
  }
}
