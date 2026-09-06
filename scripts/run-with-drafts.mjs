import { spawn } from "node:child_process";

const startedAt = Date.now();
const npmExecutable = "npm";
const npmArguments = process.argv.slice(2);

if (npmArguments.length === 0) {
  throw new Error("Expected an npm command, for example: run build");
}

function log(severity, status, details = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation: "run-with-drafts",
    status,
    includeDrafts: true,
    ...details,
  }));
}

log("info", "started", { command: `npm ${npmArguments.join(" ")}` });

const exitCode = await new Promise((resolve, reject) => {
  const child = spawn(npmExecutable, npmArguments, {
    cwd: process.cwd(),
    env: { ...process.env, INCLUDE_DRAFTS: "true" },
    stdio: "inherit",
    shell: process.platform === "win32",
    windowsHide: true,
  });
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal) reject(new Error(`Draft build terminated by signal ${signal}`));
    else resolve(code ?? 1);
  });
});

if (exitCode !== 0) {
  log("error", "failed", { exitCode, durationMs: Date.now() - startedAt });
  process.exitCode = exitCode;
} else {
  log("info", "completed", { exitCode, durationMs: Date.now() - startedAt });
}
