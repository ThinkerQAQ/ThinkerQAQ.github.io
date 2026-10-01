import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const backgroundPath = new URL("../tools/blogctl/extension/background.js", import.meta.url);
const nativeHostPath = new URL("../tools/blogctl/cmd/native_host.go", import.meta.url);
const serverPath = new URL("../tools/blogctl/bridge/server.go", import.meta.url);

test("Bridge restart is delegated to a fresh Native Host process", async () => {
  const [background, nativeHost, server] = await Promise.all([
    readFile(backgroundPath, "utf8"),
    readFile(nativeHostPath, "utf8"),
    readFile(serverPath, "utf8"),
  ]);

  assert.match(background, /fetchJSON\("\/v1\/restart\/check", \{ method: "POST" \}, false\)/u);
  assert.match(background, /requestNativeBridge\("restart_bridge"\)/u);
  assert.doesNotMatch(
    background.match(/async function restartBridge\(\) \{[\s\S]*?\n\}/u)?.[0] ?? "",
    /fetchJSON\("\/v1\/restart",/u,
  );
  assert.match(nativeHost, /request\.Command == "restart_bridge"/u);
  assert.match(nativeHost, /restartBridgeProcess\(\)/u);
  assert.match(server, /path == "v1\/restart\/check"/u);
});
