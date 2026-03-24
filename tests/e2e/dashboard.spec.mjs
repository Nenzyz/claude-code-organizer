/**
 * E2E tests for Claude Code Organizer dashboard.
 *
 * Strategy:
 *   - Each test gets a fresh temp directory pretending to be $HOME
 *   - The server is spawned with HOME=<tmpDir> so scanner.mjs and
 *     mover.mjs naturally resolve to <tmpDir>/.claude/
 *   - After every move/delete, we verify the filesystem with Node.js fs
 */

import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, access, rm, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// ── Helpers ─────────────────────────────────────────────────────────

async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

// ── Fixture setup ───────────────────────────────────────────────────

const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
const NODE_BIN = process.execPath; // full path to node

/**
 * Create a temp HOME with fake .claude/ structure.
 * Returns { tmpDir, claudeDir, projectDir, encodedProjectName, fixtures }
 */
async function createFixtures() {
  const tmpDir = await mkdtemp(join(tmpdir(), 'cco-test-'));
  const claudeDir = join(tmpDir, '.claude');
  const globalMemDir = join(claudeDir, 'memory');
  const globalSkillDir = join(claudeDir, 'skills');

  // Create fake project repos on disk (scanner needs these to resolve encoded paths)
  // Level 1: workspace (parent of sub-projects)
  const projectDir = join(tmpDir, 'fake-repo');
  await mkdir(projectDir, { recursive: true });

  // Level 2: nested project inside fake-repo
  const nestedDir = join(projectDir, 'packages', 'sub-app');
  await mkdir(nestedDir, { recursive: true });

  // Level 3: deeply nested project
  const deepDir = join(nestedDir, 'modules', 'core');
  await mkdir(deepDir, { recursive: true });

  // Encoded names: replace / with - for each path
  const encodedProjectName = projectDir.replace(/\//g, '-');
  const encodedNestedName = nestedDir.replace(/\//g, '-');
  const encodedDeepName = deepDir.replace(/\//g, '-');

  const projectClaudeDir = join(claudeDir, 'projects', encodedProjectName);
  const nestedClaudeDir = join(claudeDir, 'projects', encodedNestedName);
  const deepClaudeDir = join(claudeDir, 'projects', encodedDeepName);
  const projectMemDir = join(projectClaudeDir, 'memory');
  const nestedMemDir = join(nestedClaudeDir, 'memory');
  const deepMemDir = join(deepClaudeDir, 'memory');
  const projectSkillDir = join(projectDir, '.claude', 'skills');

  // Create all directories
  await mkdir(globalMemDir, { recursive: true });
  await mkdir(globalSkillDir, { recursive: true });
  await mkdir(projectMemDir, { recursive: true });
  await mkdir(nestedMemDir, { recursive: true });
  await mkdir(deepMemDir, { recursive: true });
  await mkdir(projectSkillDir, { recursive: true });

  // ── Global memories ──
  const memories = {
    'user_pronouns.md': `---\nname: user_pronouns\ndescription: Nicole uses she/her pronouns\ntype: user\n---\nNicole uses she/her pronouns.`,
    'feedback_testing.md': `---\nname: feedback_testing\ndescription: Always run tests before pushing\ntype: feedback\n---\nAlways run tests before pushing code.`,
    'reference_npm.md': `---\nname: reference_npm\ndescription: npm account is ithiria\ntype: reference\n---\nnpm account is ithiria, org is @mcpware.`,
    'project_structure.md': `---\nname: project_structure\ndescription: Project uses ESM modules\ntype: project\n---\nProject uses ESM modules throughout.`,
  };

  // Memory index (scanner skips MEMORY.md)
  await writeFile(join(globalMemDir, 'MEMORY.md'), '# Memory Index\n');

  for (const [name, content] of Object.entries(memories)) {
    await writeFile(join(globalMemDir, name), content);
  }

  // ── Project memories (each scope gets its own) ──
  await writeFile(join(projectMemDir, 'MEMORY.md'), '# Memory Index\n');
  await writeFile(join(projectMemDir, 'project_local.md'),
    `---\nname: project_local\ndescription: Local project memory\ntype: project\n---\nThis memory is local to the project.`);

  await writeFile(join(nestedMemDir, 'MEMORY.md'), '# Memory Index\n');
  await writeFile(join(nestedMemDir, 'nested_config.md'),
    `---\nname: nested_config\ndescription: Config for sub-app\ntype: project\n---\nSub-app specific configuration.`);

  await writeFile(join(deepMemDir, 'MEMORY.md'), '# Memory Index\n');
  await writeFile(join(deepMemDir, 'deep_secret.md'),
    `---\nname: deep_secret\ndescription: Core module internal notes\ntype: reference\n---\nDeeply nested module reference.`);

  // ── Global skills ──
  const skillDir1 = join(globalSkillDir, 'deploy');
  const skillDir2 = join(globalSkillDir, 'lint-check');
  await mkdir(skillDir1, { recursive: true });
  await mkdir(skillDir2, { recursive: true });
  await writeFile(join(skillDir1, 'SKILL.md'), '# Deploy\nDeploy the application to production.');
  await writeFile(join(skillDir2, 'SKILL.md'), '# Lint Check\nRun linting across the codebase.');

  // ── Project skill ──
  const projectSkill = join(projectSkillDir, 'local-build');
  await mkdir(projectSkill, { recursive: true });
  await writeFile(join(projectSkill, 'SKILL.md'), '# Local Build\nBuild the project locally.');

  // ── Global MCP servers ──
  await writeFile(join(claudeDir, '.mcp.json'), JSON.stringify({
    mcpServers: {
      'test-server': { command: 'node', args: ['server.js'] },
      'another-server': { command: 'npx', args: ['-y', 'some-mcp'] },
    }
  }, null, 2));

  // ── Global settings (needed for scanner) ──
  await writeFile(join(claudeDir, 'settings.json'), JSON.stringify({}, null, 2));

  return {
    tmpDir,
    claudeDir,
    globalMemDir,
    globalSkillDir,
    projectDir,
    projectMemDir,
    projectSkillDir,
    nestedDir,
    nestedMemDir,
    deepDir,
    deepMemDir,
    encodedProjectName,
    encodedNestedName,
    encodedDeepName,
    memories,
  };
}

/**
 * Spawn the CCO server with a fake HOME directory.
 * Returns { process, port, kill() }
 */
function startServer(tmpDir, port) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      NODE_BIN,
      [join(PROJECT_ROOT, 'bin', 'cli.mjs'), '--port', String(port)],
      {
        env: {
          ...process.env,
          HOME: tmpDir,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) reject(new Error('Server did not start within 10s'));
    }, 10000);

    proc.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('running at') && !started) {
        started = true;
        clearTimeout(timeout);
        resolve({
          process: proc,
          port,
          kill: () => { proc.kill('SIGTERM'); },
        });
      }
    });

    proc.stderr.on('data', (data) => {
      // Ignore xdg-open errors (no display in test)
    });

    proc.on('error', reject);
  });
}

// ── Test suite ──────────────────────────────────────────────────────

const TEST_PORT = 13847; // avoid conflicting with real app on 3847

test.describe('Claude Code Organizer E2E', () => {
  let fixtures;
  let server;

  test.beforeAll(async () => {
    fixtures = await createFixtures();
    server = await startServer(fixtures.tmpDir, TEST_PORT);
  });

  test.afterAll(async () => {
    server?.kill();
    if (fixtures?.tmpDir) {
      await rm(fixtures.tmpDir, { recursive: true, force: true });
    }
  });

  // ── 1. API scan returns data ──

  test('API /api/scan returns scopes and items', async () => {
    const res = await fetch(`http://localhost:${TEST_PORT}/api/scan`);
    const data = await res.json();

    expect(data.scopes).toBeDefined();
    expect(data.items).toBeDefined();
    expect(data.counts).toBeDefined();

    // Must have global scope
    const global = data.scopes.find(s => s.id === 'global');
    expect(global).toBeTruthy();

    // Must have the fake-repo project scope
    const project = data.scopes.find(s => s.id === fixtures.encodedProjectName);
    expect(project).toBeTruthy();

    // Must have nested project scopes
    const nested = data.scopes.find(s => s.id === fixtures.encodedNestedName);
    expect(nested).toBeTruthy();
    const deep = data.scopes.find(s => s.id === fixtures.encodedDeepName);
    expect(deep).toBeTruthy();

    // Verify parent-child hierarchy: deep → nested → project → global
    expect(deep.parentId).toBe(fixtures.encodedNestedName);
    expect(nested.parentId).toBe(fixtures.encodedProjectName);
    expect(project.parentId).toBe('global');

    // Must have our fixture items
    expect(data.counts.memory).toBeGreaterThanOrEqual(7); // 4 global + 1 project + 1 nested + 1 deep
    expect(data.counts.skill).toBeGreaterThanOrEqual(3);  // 2 global + 1 project
    expect(data.counts.mcp).toBeGreaterThanOrEqual(2);    // 2 global MCP servers
  });

  // ── 2. Dashboard loads and renders scope tree ──

  test('dashboard loads with scope tree', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });

    // Global scope header visible (use data-scope-id to be precise)
    const globalScope = page.locator('.scope-hdr[data-scope-id="global"]');
    await expect(globalScope).toBeVisible();

    // Project scope header visible
    const projectScope = page.locator('.scope-hdr', { hasText: 'fake-repo' }).first();
    await expect(projectScope).toBeVisible();

    // Nested scopes visible (use data-scope-id to be precise)
    const nestedScope = page.locator(`.scope-hdr[data-scope-id="${fixtures.encodedNestedName}"]`);
    await expect(nestedScope).toBeVisible();
    const deepScope = page.locator(`.scope-hdr[data-scope-id="${fixtures.encodedDeepName}"]`);
    await expect(deepScope).toBeVisible();

    // Item count badges exist
    const counts = page.locator('.scope-cnt');
    expect(await counts.count()).toBeGreaterThan(0);
  });

  // ── 3. Filter pills toggle categories ──

  test('filter pills show/hide categories', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });

    // Click Memory pill
    await page.click('.pill[data-filter="memory"]');

    // Memory categories visible, skill categories hidden
    const memCats = page.locator('.cat-hdr[data-cat="memory"]');
    const skillCats = page.locator('.cat-hdr[data-cat="skill"]');
    await expect(memCats.first()).toBeVisible();
    await expect(skillCats.first()).toBeHidden();

    // Click All to reset
    await page.click('.pill[data-filter="all"]');
    await expect(skillCats.first()).toBeVisible();
  });

  // ── 4. Search filters items ──

  test('search filters items by name', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });

    await page.fill('#searchInput', 'pronouns');

    // Only the matching item should be visible
    const visibleRows = page.locator('.item-row:visible');
    const pronounsRow = page.locator('.item-row', { hasText: 'user_pronouns' });
    await expect(pronounsRow).toBeVisible();

    // Other memories should be hidden
    const feedbackRow = page.locator('.item-row', { hasText: 'feedback_testing' });
    await expect(feedbackRow).toBeHidden();

    // Clear search — categories collapse back, need to re-expand
    await page.fill('#searchInput', '');
    // Search clear sets allExpanded=false and collapses categories.
    // One click on expandToggle sets allExpanded=true and expands.
    await page.click('#expandToggle');
    await expect(feedbackRow).toBeVisible();
  });

  // ── 5. Detail panel opens and closes ──

  test('clicking item opens detail panel', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });

    // Expand all to reveal items
    await page.click('#expandToggle');

    // Click a memory item
    const row = page.locator('.item-row', { hasText: 'user_pronouns' });
    await row.click();

    // Detail panel should show
    const panel = page.locator('#detailPanel');
    await expect(panel).not.toHaveClass(/hidden/);
    await expect(page.locator('#detailTitle')).toHaveText('user_pronouns');

    // Preview should show file content
    await expect(page.locator('#previewContent')).toContainText('she/her');

    // Close it
    await page.click('#detailClose');
    await expect(panel).toHaveClass(/hidden/);
  });

  // ── 6. Move modal shows correct scope hierarchy ──

  test('move modal displays scope hierarchy with current scope marked', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#expandToggle');

    // Open move modal for a global memory
    const row = page.locator('.item-row', { hasText: 'user_pronouns' });
    await row.locator('.rbtn[data-action="move"]').click();
    await expect(page.locator('#moveModal')).not.toHaveClass(/hidden/);

    // Should show destination scopes
    const destList = page.locator('#moveDestList');
    const destinations = destList.locator('.dest');
    expect(await destinations.count()).toBeGreaterThanOrEqual(2); // at least global + project

    // Current scope (global) should be marked with "(current)"
    const currentDest = destList.locator('.dest.cur');
    await expect(currentDest).toBeVisible();
    await expect(currentDest).toContainText('Global');

    // Project scope should be a selectable destination
    const projectDest = destList.locator('.dest', { hasText: 'fake-repo' });
    await expect(projectDest).toBeVisible();

    // Verify hierarchy order: Global should appear before project
    const allDestTexts = await destinations.allTextContents();
    const globalIdx = allDestTexts.findIndex(t => t.includes('Global'));
    const projectIdx = allDestTexts.findIndex(t => t.includes('fake-repo'));
    expect(globalIdx).toBeLessThan(projectIdx);

    // Close modal
    await page.click('#moveCancel');
    await expect(page.locator('#moveModal')).toHaveClass(/hidden/);
  });

  // ── 7. Move a memory via "Move to..." button ──

  test('move memory to project scope and verify on disk', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#expandToggle');

    const srcPath = join(fixtures.globalMemDir, 'user_pronouns.md');
    const dstPath = join(fixtures.projectMemDir, 'user_pronouns.md');

    // Confirm source exists before move
    expect(await fileExists(srcPath)).toBe(true);

    // Click the item's Move button
    const row = page.locator('.item-row', { hasText: 'user_pronouns' });
    await row.locator('.rbtn[data-action="move"]').click();

    // Move modal should appear
    await expect(page.locator('#moveModal')).not.toHaveClass(/hidden/);

    // Select the project destination
    const dest = page.locator('#moveDestList .dest', { hasText: 'fake-repo' });
    await dest.click();
    await page.click('#moveConfirm');

    // Wait for toast
    await expect(page.locator('#toast')).not.toHaveClass(/hidden/);

    // ── FILESYSTEM VERIFICATION ──
    expect(await fileExists(srcPath)).toBe(false);
    expect(await fileExists(dstPath)).toBe(true);
    const content = await readFile(dstPath, 'utf-8');
    expect(content).toContain('she/her');
  });

  // ── 7. Delete a memory and verify on disk ──

  test('delete memory and verify on disk', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#expandToggle');

    const targetPath = join(fixtures.globalMemDir, 'feedback_testing.md');
    expect(await fileExists(targetPath)).toBe(true);

    // Click the item's Delete button
    const row = page.locator('.item-row', { hasText: 'feedback_testing' });
    await row.locator('.rbtn[data-action="delete"]').click();

    // Confirm delete modal
    await expect(page.locator('#deleteModal')).not.toHaveClass(/hidden/);
    await page.click('#deleteConfirm');

    // Wait for toast
    await expect(page.locator('#toast')).not.toHaveClass(/hidden/);

    // ── FILESYSTEM VERIFICATION ──
    expect(await fileExists(targetPath)).toBe(false);
  });

  // ── 8. Undo after delete restores file ──

  test('undo delete restores file on disk', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#expandToggle');

    const targetPath = join(fixtures.globalMemDir, 'reference_npm.md');
    const originalContent = await readFile(targetPath, 'utf-8');
    expect(await fileExists(targetPath)).toBe(true);

    // Delete
    const row = page.locator('.item-row', { hasText: 'reference_npm' });
    await row.locator('.rbtn[data-action="delete"]').click();
    await page.click('#deleteConfirm');
    await expect(page.locator('#toast')).not.toHaveClass(/hidden/);

    // Verify deleted
    expect(await fileExists(targetPath)).toBe(false);

    // Click Undo in toast (8s window)
    await page.click('#toastUndo');

    // Wait for "undone" toast
    await page.waitForFunction(() => {
      const toast = document.getElementById('toastMsg');
      return toast && toast.textContent.includes('undone');
    });

    // ── FILESYSTEM VERIFICATION ──
    expect(await fileExists(targetPath)).toBe(true);
    const restored = await readFile(targetPath, 'utf-8');
    expect(restored).toBe(originalContent);
  });

  // ── 9. Bulk move memories to another scope ──

  test('bulk move memories to project scope and verify on disk', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#expandToggle');

    // We'll bulk-move reference_npm and project_structure to the project scope
    const file1 = 'reference_npm.md';
    const file2 = 'project_structure.md';
    const src1 = join(fixtures.globalMemDir, file1);
    const src2 = join(fixtures.globalMemDir, file2);
    const dst1 = join(fixtures.projectMemDir, file1);
    const dst2 = join(fixtures.projectMemDir, file2);

    expect(await fileExists(src1)).toBe(true);
    expect(await fileExists(src2)).toBe(true);

    // Check the checkboxes — use scope-specific selectors to avoid
    // matching items in other scopes
    const globalBlock = page.locator('.scope-block:has(.scope-hdr[data-scope-id="global"])').first();
    const chk1 = globalBlock.locator(`.item-row:has-text("reference_npm") .row-chk`);
    const chk2 = globalBlock.locator(`.item-row:has-text("project_structure") .row-chk`);
    await chk1.check();
    await chk2.check();

    // Bulk bar should show
    await expect(page.locator('#bulkBar')).not.toHaveClass(/hidden/);
    await expect(page.locator('#bulkCount')).toHaveText('2 selected');

    // Click bulk move
    await page.click('#bulkMove');
    await expect(page.locator('#moveModal')).not.toHaveClass(/hidden/);

    // Verify hierarchy in modal: should show Global (current) + project + nested + deep
    const destinations = page.locator('#moveDestList .dest');
    expect(await destinations.count()).toBeGreaterThanOrEqual(4);

    // Select project destination (not the current scope)
    const dest = page.locator('#moveDestList .dest:not(.cur)', { hasText: 'fake-repo' }).first();
    await dest.click();
    await page.click('#moveConfirm');

    // Wait for toast
    await expect(page.locator('#toast')).not.toHaveClass(/hidden/);
    await expect(page.locator('#toastMsg')).toContainText('Moved 2');

    // ── FILESYSTEM VERIFICATION ──
    expect(await fileExists(src1)).toBe(false);
    expect(await fileExists(src2)).toBe(false);
    expect(await fileExists(dst1)).toBe(true);
    expect(await fileExists(dst2)).toBe(true);

    // Verify content preserved
    const content1 = await readFile(dst1, 'utf-8');
    const content2 = await readFile(dst2, 'utf-8');
    expect(content1).toContain('npm account is ithiria');
    expect(content2).toContain('ESM modules');
  });

  // ── 10. Bulk delete and verify on disk ──

  test('bulk delete memories and verify on disk', async ({ page }) => {
    await page.goto(`http://localhost:${TEST_PORT}/`);
    await page.waitForSelector('#loading', { state: 'hidden' });
    await page.click('#expandToggle');

    // After previous tests, project scope should have several memories.
    // Let's delete project_local from the project scope.
    const targetPath = join(fixtures.projectMemDir, 'project_local.md');
    expect(await fileExists(targetPath)).toBe(true);

    // Check the checkbox
    const chk = page.locator(`.item-row:has-text("project_local") .row-chk`);
    await chk.check();

    await expect(page.locator('#bulkBar')).not.toHaveClass(/hidden/);

    // Accept the confirm() dialog
    page.on('dialog', dialog => dialog.accept());

    // Click bulk delete
    await page.click('#bulkDelete');

    // Wait for toast
    await expect(page.locator('#toast')).not.toHaveClass(/hidden/);
    await expect(page.locator('#toastMsg')).toContainText('Deleted 1');

    // ── FILESYSTEM VERIFICATION ──
    expect(await fileExists(targetPath)).toBe(false);
  });
});
