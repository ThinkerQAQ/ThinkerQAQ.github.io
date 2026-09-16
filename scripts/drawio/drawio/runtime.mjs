import { execFile } from "node:child_process";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { OUTPUT_ROOT, ROOT, validateSvg } from "./core.mjs";

async function isExecutable(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function pathCandidates(command) {
  const extensions = process.platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  return (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .flatMap((directory) => extensions.map((extension) => path.join(directory, `${command}${extension}`)));
}

export async function findDrawIoExecutable() {
  const configured = process.env.DRAWIO_EXECUTABLE;
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = [
    configured,
    ...pathCandidates("drawio"),
    ...pathCandidates("draw.io"),
    process.platform === "win32" ? "C:\\Program Files\\draw.io\\draw.io.exe" : undefined,
    process.platform === "win32"
      ? "C:\\software\\Office\\DrawioPortable\\App\\Drawio\\draw.io.exe"
      : undefined,
    process.platform === "win32" && localAppData
      ? path.join(localAppData, "Programs", "draw.io", "draw.io.exe")
      : undefined,
    process.platform === "darwin" ? "/Applications/draw.io.app/Contents/MacOS/draw.io" : undefined,
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await isExecutable(candidate)) return candidate;
  }
  return null;
}

function execute(command, args, { timeout = 90000 } = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      cwd: ROOT,
      timeout,
      maxBuffer: 8 * 1024 * 1024,
      encoding: "utf8",
      windowsHide: true,
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = (stderr || stdout || error.message).trim().split(/\r?\n/).slice(-3).join(" ");
        const failure = new Error(`draw.io export failed (${error.killed ? "timeout" : error.code}): ${detail}`);
        failure.code = error.code;
        reject(failure);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function exportSvg(executable, source, output) {
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = path.join(OUTPUT_ROOT, `.drawio-${process.pid}-${Date.now()}.tmp.svg`);
  try {
    await execute(executable, [
      "--export",
      "--format", "svg",
      "--border", "8",
      "--output", temporary,
      source,
    ]);
    const svg = validateSvg(await readFile(temporary));
    await writeFile(output, svg, "utf8");
    return svg;
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
