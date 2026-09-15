import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const MEDIUM_BRIDGE_PORT = 32145;
export const MEDIUM_BRIDGE_ORIGIN = `http://127.0.0.1:${MEDIUM_BRIDGE_PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

export async function startMediumBridge({ port = MEDIUM_BRIDGE_PORT } = {}) {
  const token = randomBytes(32).toString("hex");
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const bridgeScript = path.resolve(scriptDir, "../tools/medium-bridge/bridge.mjs");
  const child = spawn(process.execPath, [bridgeScript, "--port", String(port), "--parent-pid", String(process.pid)], {
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      THINKERQAQ_MEDIUM_BRIDGE_TOKEN: token,
    },
  });

  const origin = `http://127.0.0.1:${port}`;
  let stdoutBuffer = "";
  let stderrBuffer = "";

  child.stderr.on("data", (chunk) => {
    stderrBuffer += chunk.toString();
  });

  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Medium bridge did not start within 5 seconds${stderrBuffer ? `: ${stderrBuffer.trim()}` : ""}`));
    }, 5000);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timer);
        reject(new Error(`Medium bridge exited with code ${code}${stderrBuffer ? `: ${stderrBuffer.trim()}` : ""}`));
      }
    });

    child.stdout.on("data", (chunk) => {
      stdoutBuffer += chunk.toString();
      for (;;) {
        const newline = stdoutBuffer.indexOf("\n");
        if (newline < 0) break;
        const line = stdoutBuffer.slice(0, newline).trim();
        stdoutBuffer = stdoutBuffer.slice(newline + 1);
        const event = parseJsonLine(line);
        if (event?.event === "ready") {
          clearTimeout(timer);
          resolve(event);
        }
      }
    });
  });

  await ready;
  return {
    child,
    token,
    origin,
    async close() {
      if (!child.killed) child.kill();
    },
  };
}

async function bridgeRequest(bridge, pathname, options = {}) {
  const response = await fetch(new URL(pathname, bridge.origin), {
    ...options,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-thinkerqaq-token": bridge.token,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    const error = new Error(`Medium bridge ${response.status}: ${detail}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export async function waitForMediumSession(bridge, {
  timeoutMs = 60_000,
  pollMs = 1000,
  onWaiting = () => {},
} = {}) {
  const startedAt = Date.now();
  let announced = false;
  while (Date.now() - startedAt < timeoutMs) {
    const status = await bridgeRequest(bridge, "/v1/session/status", { method: "GET" });
    if (status?.authenticated) return status;
    if (!announced) {
      announced = true;
      onWaiting({
        message: "Waiting for Medium browser session. Click the ThinkerQAQ Medium Bridge extension once while logged in to medium.com.",
      });
    }
    await sleep(pollMs);
  }
  throw new Error("Timed out waiting for Medium browser session. Keep Medium logged in, then click the ThinkerQAQ Medium Bridge extension and retry.");
}

export async function createMediumDraftViaBridge(bridge, draft) {
  return bridgeRequest(bridge, "/v1/medium/drafts", {
    method: "POST",
    body: JSON.stringify(draft),
  });
}
