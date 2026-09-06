import { pathToFileURL } from "node:url";
import path from "node:path";
import { renderAll as renderPlantUml } from "./render-plantuml.mjs";
import { renderAll as renderDrawIo } from "./render-drawio.mjs";

function log(status, details = {}, severity = "info") {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    severity,
    operation: "diagram-build",
    status,
    ...details,
  }));
}

export async function renderAll() {
  const startedAt = Date.now();
  log("started");
  await renderPlantUml();
  await renderDrawIo();
  log("completed", { durationMs: Date.now() - startedAt });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  renderAll().catch((error) => {
    log("failed", {
      error: error instanceof Error ? error.message : String(error),
      durationMs: 0,
    }, "error");
    process.exitCode = 1;
  });
}
