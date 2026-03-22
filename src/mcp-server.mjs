#!/usr/bin/env node

/**
 * MCP server layer for Claude Code Organizer.
 * Wraps existing scan/move/delete functions as MCP tools
 * so AI clients (Claude, Cursor, Windsurf) can discover and call them.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { scan } from './scanner.mjs';
import { moveItem, deleteItem, getValidDestinations } from './mover.mjs';

const server = new McpServer({
  name: 'claude-code-organizer',
  version: '0.3.0',
});

server.tool(
  'scan_inventory',
  'Scan all Claude Code configurations across every scope (global, workspace, project). Returns memories, skills, MCP servers, hooks, configs, plugins, and plans with their file paths and metadata.',
  {},
  async () => {
    const data = await scan();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'move_item',
  'Move a Claude Code configuration item (memory, skill, MCP server, hook) from one scope to another. For example, move a memory from project scope to global scope.',
  {
    type: z.enum(['memory', 'skill', 'mcp', 'hook', 'config', 'plugin', 'plan']).describe('Type of item to move'),
    name: z.string().describe('Name/filename of the item'),
    fromScope: z.string().describe('Source scope path (e.g. "~/.claude" for global, "~/MyProject/.claude" for project)'),
    toScope: z.string().describe('Destination scope path'),
  },
  async ({ type, name, fromScope, toScope }) => {
    const result = await moveItem({ type, name, fromScope, toScope });
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  'delete_item',
  'Delete a Claude Code configuration item (memory, skill, MCP server entry, hook).',
  {
    type: z.enum(['memory', 'skill', 'mcp', 'hook', 'config', 'plugin', 'plan']).describe('Type of item to delete'),
    name: z.string().describe('Name/filename of the item'),
    scope: z.string().describe('Scope path where the item lives'),
  },
  async ({ type, name, scope }) => {
    const result = await deleteItem({ type, name, scope });
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  }
);

server.tool(
  'list_destinations',
  'List all valid destination scopes where items can be moved to. Shows global, workspace, and project scopes with their paths.',
  {},
  async () => {
    const destinations = await getValidDestinations();
    return {
      content: [{ type: 'text', text: JSON.stringify(destinations, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
