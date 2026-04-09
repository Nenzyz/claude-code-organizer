/**
 * backup-scheduler.mjs — Install/remove/status systemd timer (Linux) or launchd plist (macOS).
 * Used by Backup Center in CCO and by the standalone claude-code-backup CLI.
 */

import { writeFile, mkdir, unlink, access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir, platform } from "node:os";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const HOME = homedir();
const SERVICE_NAME = "claude-code-backup";

// ── Linux (systemd user timer) ──────────────────────────────────────

function systemdDir() {
  return join(HOME, ".config", "systemd", "user");
}

function serviceContent() {
  const cmd = resolveCliCommand();
  return `[Unit]
Description=Claude Code Backup — scan and push settings to GitHub

[Service]
Type=oneshot
ExecStart=${cmd.join(" ")}
Environment=HOME=${HOME}
Environment=PATH=${process.env.PATH}
`;
}

function timerContent(intervalHours) {
  return `[Unit]
Description=Claude Code Backup Timer

[Timer]
OnBootSec=5min
OnUnitActiveSec=${intervalHours}h
Persistent=true

[Install]
WantedBy=timers.target
`;
}

async function installSystemd(intervalHours) {
  const dir = systemdDir();
  await mkdir(dir, { recursive: true });

  await writeFile(join(dir, `${SERVICE_NAME}.service`), serviceContent());
  await writeFile(join(dir, `${SERVICE_NAME}.timer`), timerContent(intervalHours));

  await exec("systemctl", ["--user", "daemon-reload"]);
  await exec("systemctl", ["--user", "enable", "--now", `${SERVICE_NAME}.timer`]);

  return {
    servicePath: join(dir, `${SERVICE_NAME}.service`),
    timerPath: join(dir, `${SERVICE_NAME}.timer`),
  };
}

async function removeSystemd() {
  try { await exec("systemctl", ["--user", "disable", "--now", `${SERVICE_NAME}.timer`]); } catch {}
  const dir = systemdDir();
  try { await unlink(join(dir, `${SERVICE_NAME}.service`)); } catch {}
  try { await unlink(join(dir, `${SERVICE_NAME}.timer`)); } catch {}
  try { await exec("systemctl", ["--user", "daemon-reload"]); } catch {}
}

async function statusSystemd() {
  try {
    const { stdout } = await exec("systemctl", [
      "--user", "status", `${SERVICE_NAME}.timer`, "--no-pager",
    ]);
    return stdout;
  } catch (err) {
    return err.stdout || err.stderr || "Timer not installed";
  }
}

async function isInstalledSystemd() {
  try {
    await access(join(systemdDir(), `${SERVICE_NAME}.timer`));
    return true;
  } catch {
    return false;
  }
}


// ── macOS (launchd plist) ───────────────────────────────────────────

function launchdDir() {
  return join(HOME, "Library", "LaunchAgents");
}

function plistLabel() {
  return `com.mcpware.${SERVICE_NAME}`;
}

function resolveCliCommand() {
  // Prefer the globally installed binary over npx (npx may cache old versions)
  try {
    const globalBin = execFileSync("which", ["claude-code-organizer"], { encoding: "utf-8" }).trim();
    if (globalBin) return [globalBin, "--backup", "run", "--quiet"];
  } catch {}
  // Fallback to node + cli.mjs from this package
  const cliPath = join(import.meta.dirname, "..", "bin", "cli.mjs");
  return [process.execPath, cliPath, "--backup", "run", "--quiet"];
}

function plistContent(intervalSeconds) {
  const cmd = resolveCliCommand();
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${plistLabel()}</string>
  <key>ProgramArguments</key>
  <array>
${cmd.map(a => `    <string>${a}</string>`).join("\n")}
  </array>
  <key>StartInterval</key>
  <integer>${intervalSeconds}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${process.env.PATH}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${HOME}/.claude-backups/backup.log</string>
  <key>StandardErrorPath</key>
  <string>${HOME}/.claude-backups/backup.log</string>
</dict>
</plist>
`;
}

async function installLaunchd(intervalHours) {
  const dir = launchdDir();
  await mkdir(dir, { recursive: true });
  const plistPath = join(dir, `${plistLabel()}.plist`);
  await writeFile(plistPath, plistContent(intervalHours * 3600));
  try { await exec("launchctl", ["unload", plistPath]); } catch {}
  await exec("launchctl", ["load", plistPath]);
  return { plistPath };
}

async function removeLaunchd() {
  const plistPath = join(launchdDir(), `${plistLabel()}.plist`);
  try { await exec("launchctl", ["unload", plistPath]); } catch {}
  try { await unlink(plistPath); } catch {}
}

async function statusLaunchd() {
  try {
    const { stdout } = await exec("launchctl", ["list", plistLabel()]);
    return stdout;
  } catch {
    return "LaunchAgent not installed";
  }
}

async function isInstalledLaunchd() {
  try {
    await access(join(launchdDir(), `${plistLabel()}.plist`));
    return true;
  } catch {
    return false;
  }
}

async function getNodeAndCliPathLaunchd() {
  try {
    const plistPath = join(launchdDir(), `${plistLabel()}.plist`);
    const content = await readFile(plistPath, "utf-8");
    const block = content.match(/<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/);
    if (!block) return null;
    const args = [...block[1].matchAll(/<string>([^<]+)<\/string>/g)].map((m) => m[1]);
    if (args.length >= 2) return { nodePath: args[0], cliPath: args[1] };
  } catch {}
  return null;
}

// ── Public API ──────────────────────────────────────────────────────

export async function install(intervalHours = 4) {
  if (platform() === "darwin") return installLaunchd(intervalHours);
  return installSystemd(intervalHours);
}

export async function remove() {
  if (platform() === "darwin") return removeLaunchd();
  return removeSystemd();
}

export async function status() {
  if (platform() === "darwin") return statusLaunchd();
  return statusSystemd();
}

export async function isInstalled() {
  if (platform() === "darwin") return isInstalledLaunchd();
  return isInstalledSystemd();
}

