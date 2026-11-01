import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { prepareDeployment } from "./prepare-inkerio-deployment.mjs";

async function createFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "inkerio-site-wrapper-"));
  const siteRoot = path.join(root, "site");
  const engineRoot = path.join(root, "engine");
  await mkdir(path.join(siteRoot, "public"), { recursive: true });
  await mkdir(path.join(engineRoot, "public"), { recursive: true });
  await writeFile(path.join(siteRoot, "site.config.json"), JSON.stringify({
    title: "Demo", homeTitle: "Demo", homeTitleEn: "Demo", description: "Demo",
    author: "Demo", url: "https://example.com", commentsRepository: "",
  }));
  await writeFile(path.join(siteRoot, "public", "favicon.svg"), "<svg></svg>");
  return { siteRoot, engineRoot };
}

test("overlays configuration and site assets only", async () => {
  const fixture = await createFixture();
  const result = await prepareDeployment(fixture);
  assert.equal(result.origin, "https://example.com");
  assert.equal((await readFile(path.join(fixture.engineRoot, "public/favicon.svg"), "utf8")), "<svg></svg>");
  assert.equal(JSON.parse(await readFile(path.join(fixture.engineRoot, "site.config.json"), "utf8")).title, "Demo");
});

test("blocks symlinks from the public asset tree", async () => {
  const fixture = await createFixture();
  await symlink("/etc/passwd", path.join(fixture.siteRoot, "public", "private"));
  await assert.rejects(prepareDeployment(fixture), /Refusing symlink/);
});

test("rejects a URL containing user credentials or path", async () => {
  const fixture = await createFixture();
  const configPath = path.join(fixture.siteRoot, "site.config.json");
  const cfg = JSON.parse(await readFile(configPath, "utf8"));
  cfg.url = "https://admin:pass@example.com/path";
  await writeFile(configPath, JSON.stringify(cfg));
  await assert.rejects(prepareDeployment(fixture), /Site config URL/);
});

test("rejects malformed optional English description", async () => {
  const fixture = await createFixture();
  const configPath = path.join(fixture.siteRoot, "site.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.descriptionEn = 42;
  await writeFile(configPath, JSON.stringify(config));
  await assert.rejects(prepareDeployment(fixture), /English description/);
});

test("preserves portable optional integration policy without importing service credentials", async () => {
  const fixture = await createFixture();
  const configPath = path.join(fixture.siteRoot, "site.config.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  config.integrations = {
    analytics: { provider: "umami", scriptSrc: "/u.js" },
    reactions: { provider: "http", apiPath: "/v1/reactions" },
  };
  await writeFile(configPath, JSON.stringify(config));
  await prepareDeployment(fixture);
  const result = JSON.parse(await readFile(path.join(fixture.engineRoot, "site.config.json"), "utf8"));
  assert.deepEqual(result.integrations, config.integrations);
  assert.equal(JSON.stringify(result).includes("API_TOKEN"), false);
});
