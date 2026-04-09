#!/usr/bin/env node

/**
 * cli.mjs — Entry point for Claude Code Organizer.
 * Usage:
 *   node bin/cli.mjs              → Start web dashboard (HTTP server)
 *   node bin/cli.mjs --mcp        → Start MCP server (stdio, for AI clients)
 *   node bin/cli.mjs --port 3847  → Start web dashboard on custom port
 *   node bin/cli.mjs --no-open    → Start web dashboard without opening browser
 *   node bin/cli.mjs --backup init <remote-url>  → Init backup repo with optional remote
 *   node bin/cli.mjs --backup run                → Run backup now (export + commit + push)
 *   node bin/cli.mjs --backup status             → Show backup status
 *   node bin/cli.mjs --backup schedule [hours]   → Install scheduled backup (default: 4h)
 *   node bin/cli.mjs --backup unschedule         → Remove scheduled backup
 */

import { access, constants, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';

const args = process.argv.slice(2);
const isMcpMode = args.includes('--mcp');
const distillIdx = args.indexOf('--distill');
const isDistillMode = distillIdx !== -1;
const backupIdx = args.indexOf('--backup');
const isBackupMode = backupIdx !== -1;

// ── Pre-flight check: verify ~/.claude/ exists and is readable ──
// Skip for MCP mode — server returns empty results if ~/.claude/ missing
if (!isMcpMode) {
  const claudeDir = join(homedir(), '.claude');
  try {
    await access(claudeDir, constants.R_OK);
  } catch {
    console.error(`\n  ✗ Cannot read ${claudeDir}\n`);
    console.error(`  Claude Code stores its config in ~/.claude/ but this directory`);
    console.error(`  either doesn't exist or isn't readable by your current user.\n`);
    console.error(`  To fix:`);
    console.error(`    1. Make sure Claude Code has been run at least once`);
    console.error(`    2. Check permissions: ls -la ~/.claude/`);
    console.error(`    3. If needed:  chmod u+r ~/.claude\n`);
    process.exit(1);
  }
}

// ── Auto-install /cco skill if not present ──
if (!isMcpMode) {
  const skillDir = join(homedir(), '.claude', 'skills', 'cco');
  const skillFile = join(skillDir, 'SKILL.md');
  try {
    await access(skillFile, constants.R_OK);
  } catch {
    // Skill doesn't exist yet — install it
    try {
      await mkdir(skillDir, { recursive: true });
      await writeFile(skillFile, [
        '---',
        'name: cco',
        'description: Open Claude Code Organizer dashboard to manage memories, skills, MCP servers across scopes',
        'model: haiku',
        '---',
        '',
        '1. Run `npx @mcpware/claude-code-organizer@latest` in background',
        '2. Wait 3 seconds for the server to start',
        '3. Open the browser: `xdg-open http://localhost:3847` (Linux) or `open http://localhost:3847` (macOS)',
        '4. Always tell the user: **http://localhost:3847**',
        '',
        'The dashboard shows your full scope hierarchy (Global > Workspace > Project) with drag-and-drop between scopes.',
        ''
      ].join('\n'));
      console.log('  ✓ Installed /cco skill globally — next time just type /cco in Claude Code!\n');
    } catch {
      // Non-critical — skip silently if we can't write
    }
  }
}

// ── Update check (non-blocking) ──
async function checkForUpdate() {
  try {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    const pkg = require('../package.json');
    const localVersion = pkg.version;

    const resp = await fetch('https://registry.npmjs.org/@mcpware/claude-code-organizer/latest', { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const latestVersion = data.version;

    if (localVersion !== latestVersion) {
      return { local: localVersion, latest: latestVersion };
    }
  } catch { /* silent — don't block startup */ }
  return null;
}

if (isBackupMode) {
  // CLI backup mode: npx @mcpware/claude-code-organizer --backup <command> [args]
  const subCmd = args[backupIdx + 1] || 'help';
  const BACKUP_DIR = join(homedir(), '.claude-backups');
  const BACKUP_CONFIG = join(BACKUP_DIR, 'config.json');

  if (subCmd === 'init') {
    const remoteUrl = args[backupIdx + 2];
    const { mkdir: mk, writeFile: wf } = await import('node:fs/promises');
    const { isGitRepo, initRepo, hasRemote, addRemote, getRemoteUrl } = await import('../src/backup-git.mjs');

    await mk(BACKUP_DIR, { recursive: true });

    if (!(await isGitRepo(BACKUP_DIR))) {
      await initRepo(BACKUP_DIR);
      await wf(join(BACKUP_DIR, '.gitignore'), 'backup-*/\n*.log\nconfig.json\n');
      console.log(`  ✓ Initialized backup repo at ${BACKUP_DIR}`);
    } else {
      console.log(`  ✓ Backup repo already exists at ${BACKUP_DIR}`);
    }

    if (remoteUrl) {
      if (await hasRemote(BACKUP_DIR)) {
        const { execFile } = await import('node:child_process');
        const { promisify } = await import('node:util');
        await promisify(execFile)('git', ['remote', 'set-url', 'origin', remoteUrl], { cwd: BACKUP_DIR });
        console.log(`  ✓ Updated remote: ${remoteUrl}`);
      } else {
        await addRemote(BACKUP_DIR, remoteUrl);
        console.log(`  ✓ Added remote: ${remoteUrl}`);
      }
    } else {
      console.log(`  ℹ No remote set. Add one with: npx @mcpware/claude-code-organizer --backup init <git-url>`);
    }

  } else if (subCmd === 'run') {
    const { rm, mkdir: mk, copyFile: cpf, writeFile: wf, cp: cpDir, readFile: rf } = await import('node:fs/promises');
    const { basename } = await import('node:path');
    const { isGitRepo, commitAndPush } = await import('../src/backup-git.mjs');
    const { scan } = await import('../src/scanner.mjs');

    if (!(await isGitRepo(BACKUP_DIR))) {
      console.error(`  ✗ Backup repo not initialized. Run: npx @mcpware/claude-code-organizer --backup init`);
      process.exit(1);
    }

    const quiet = args.includes('--quiet');
    if (!quiet) console.log('  Scanning...');
    const scanData = await scan();
    const latestDir = join(BACKUP_DIR, 'latest');
    try { await rm(latestDir, { recursive: true, force: true }); } catch {}

    let copied = 0;
    const errors = [];
    const exportableItems = scanData.items.filter(i => i.category !== 'setting' && i.category !== 'hook');

    for (const item of exportableItems) {
      try {
        const subDir = join(latestDir, item.scopeId, item.category);
        await mk(subDir, { recursive: true });
        if (item.category === 'skill') {
          await cpDir(item.path, join(subDir, item.fileName || basename(item.path)), { recursive: true });
        } else if (item.category === 'mcp') {
          await wf(join(subDir, `${item.name}.json`), JSON.stringify({ [item.name]: item.mcpConfig || {} }, null, 2) + '\n');
        } else if (item.category === 'plugin' && item.path) {
          await cpDir(item.path, join(subDir, item.fileName || basename(item.path)), { recursive: true });
        } else if (item.path) {
          await cpf(item.path, join(subDir, item.fileName || basename(item.path)));
        }
        copied++;
      } catch (e) {
        errors.push(`${item.category}/${item.name}: ${e.message}`);
      }
    }

    await wf(join(latestDir, 'backup-summary.json'), JSON.stringify({
      exportedAt: new Date().toISOString(), totalItems: exportableItems.length, copied, errors: errors.length, counts: scanData.counts,
    }, null, 2) + '\n');

    const gitResult = await commitAndPush(BACKUP_DIR);

    let config = {};
    try { config = JSON.parse(await rf(BACKUP_CONFIG, 'utf-8')); } catch {}
    await wf(BACKUP_CONFIG, JSON.stringify({ ...config, lastRun: new Date().toISOString(), lastCopied: copied, lastErrors: errors.length }, null, 2) + '\n');

    if (!quiet) {
      console.log(`\n  Backup Complete`);
      console.log(`  ───────────────`);
      console.log(`  Items: ${copied} exported${errors.length ? `, ${errors.length} errors` : ''}`);
      console.log(`  Git:   ${gitResult.committed ? gitResult.message : 'No changes to commit'}${gitResult.pushed ? ' (pushed)' : ''}`);
      if (errors.length) errors.forEach(e => console.log(`  ⚠ ${e}`));
      console.log();
    }

  } else if (subCmd === 'status') {
    const { readFile: rf } = await import('node:fs/promises');
    const { isGitRepo, hasRemote, getRemoteUrl, getLastCommit } = await import('../src/backup-git.mjs');
    const { isInstalled, status: schedulerStatus } = await import('../src/backup-scheduler.mjs');

    let config = {};
    try { config = JSON.parse(await rf(BACKUP_CONFIG, 'utf-8')); } catch {}

    const gitRepo = await isGitRepo(BACKUP_DIR);
    const remote = gitRepo ? await hasRemote(BACKUP_DIR) : false;
    const remoteUrl = remote ? await getRemoteUrl(BACKUP_DIR) : null;
    const lastCommit = gitRepo ? await getLastCommit(BACKUP_DIR) : { msg: null, date: null };
    const scheduled = await isInstalled();

    console.log(`\n  Backup Status`);
    console.log(`  ─────────────`);
    console.log(`  Repo:      ${gitRepo ? BACKUP_DIR : 'Not initialized'}`);
    console.log(`  Remote:    ${remoteUrl || 'None'}`);
    console.log(`  Last run:  ${config.lastRun || 'Never'}`);
    console.log(`  Last copy: ${config.lastCopied ?? '—'} items${config.lastErrors ? ` (${config.lastErrors} errors)` : ''}`);
    console.log(`  Last commit: ${lastCommit.msg || '—'} ${lastCommit.date ? `(${lastCommit.date})` : ''}`);
    console.log(`  Scheduler: ${scheduled ? `Active (every ${config.interval || 4}h)` : 'Not installed'}`);
    console.log();

  } else if (subCmd === 'schedule') {
    const hours = parseInt(args[backupIdx + 2], 10) || 4;
    const { install } = await import('../src/backup-scheduler.mjs');
    const { writeFile: wf, readFile: rf } = await import('node:fs/promises');

    const result = await install(hours);
    let config = {};
    try { config = JSON.parse(await rf(BACKUP_CONFIG, 'utf-8')); } catch {}
    await wf(BACKUP_CONFIG, JSON.stringify({ ...config, interval: hours }, null, 2) + '\n');

    console.log(`  ✓ Backup scheduled every ${hours} hours`);
    if (result.plistPath) console.log(`  LaunchAgent: ${result.plistPath}`);
    if (result.servicePath) console.log(`  Service: ${result.servicePath}`);

  } else if (subCmd === 'unschedule') {
    const { remove } = await import('../src/backup-scheduler.mjs');
    await remove();
    console.log('  ✓ Backup schedule removed');

  } else {
    console.log(`
  Usage: npx @mcpware/claude-code-organizer --backup <command>

  Commands:
    init [remote-url]    Initialize backup repo (optionally set git remote)
    run                  Run backup now (export + commit + push)
    status               Show backup status and config
    schedule [hours]     Install scheduled backup (default: every 4 hours)
    unschedule           Remove scheduled backup
`);
  }

} else if (isDistillMode) {
  // CLI distill mode: npx @mcpware/claude-code-organizer --distill <session.jsonl>
  const sessionPath = args[distillIdx + 1];
  if (!sessionPath || !sessionPath.endsWith('.jsonl')) {
    console.error('\n  Usage: npx @mcpware/claude-code-organizer --distill <session.jsonl>\n');
    process.exit(1);
  }
  const { resolve } = await import('node:path');
  const { distillSession } = await import('../src/session-distiller.mjs');
  const fmt = b => b < 1024 ? b + 'B' : b < 1048576 ? (b / 1024).toFixed(1) + 'K' : (b / 1048576).toFixed(1) + 'M';
  try {
    const r = await distillSession(resolve(sessionPath));
    const s = r.stats;
    console.log(`\n  Session Distiller — by @mcpware/claude-code-organizer`);
    console.log(`  ─────────────────────────────────────────────────────`);
    console.log(`  Backup:    ${r.backupPath} (${fmt(s.backupBytes)})`);
    console.log(`  Distilled: ${r.outputPath} (${fmt(s.outputBytes)}, ${s.reduction} reduction)`);
    if (s.indexEntries > 0) {
      console.log(`  Index:     ${s.indexPath} (${s.indexEntries} refs)`);
    }
    console.log(`  Lines:     ${s.inputLines} → ${s.keptLines}\n`);
  } catch (err) {
    console.error(`\n  Error: ${err.message}\n`);
    process.exit(1);
  }
} else if (isMcpMode) {
  // MCP server mode — AI clients connect via stdio
  await import('../src/mcp-server.mjs');
} else {
  // Web dashboard mode — human opens browser
  const { startServer } = await import('../src/server.mjs');
  const { execSync } = await import('node:child_process');

  const portIdx = args.indexOf('--port');
  const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 3847;

  // Check for update in background (don't block server start)
  const updatePromise = checkForUpdate();

  startServer(port);

  // Show update notice after server starts (CLI users)
  updatePromise.then(update => {
    if (update) {
      console.log(`\n  📦 New version available! You're not on the latest.`);
      console.log(`     Run: npx @mcpware/claude-code-organizer@latest`);
      console.log(`     Or:  npm update -g @mcpware/claude-code-organizer\n`);
    }
  });

  if (!args.includes('--no-open')) {
    try {
      const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
      execSync(`${openCmd} http://localhost:${port}`, { stdio: 'ignore' });
    } catch {
      // Browser didn't open, user can navigate manually
    }
  }
}
