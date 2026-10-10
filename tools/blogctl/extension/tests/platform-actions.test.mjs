import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("only Detection, Creation, Update, Tasks, Logs, Index and Settings are navigable", async () => {
  const html = await source("popup/popup.html");
  const tabs = [...html.matchAll(/data-tab="([^"]+)"/gu)].map((item) => item[1]);
  assert.deepEqual(tabs, ["binding","creation","drafts","tasks","logs","indexing","environment"]);
  assert.doesNotMatch(html, /data-panel="publications"/u);
  assert.doesNotMatch(html, /id="publishSelected"/u);
  assert.match(html, /id="publishAfterSave"/u);
  assert.match(html, /id="sharedDraftWorkspace"/u);
});

test("Extension and Web Console use the same Feature DOM and transport contract", async () => {
  const [html, popup, transport, relay] = await Promise.all([
    source("popup/popup.html"), source("popup/popup.js"),
    source("popup/transport.js"), source("console-relay.js"),
  ]);
  assert.match(popup, /document\.getElementById\("sharedDraftWorkspace"\)/u);
  assert.match(popup, /BlogCTLDrafts\.setMode/u);
  assert.match(html, /src="transport\.js"/u);
  assert.match(transport, /blogctl:console:request:v1/u);
  assert.match(transport, /http:\/\/127\.0\.0\.1:32145/u);
  assert.match(relay, /location\.pathname\.startsWith\("\/console\/"\)/u);
  assert.doesNotMatch(relay, /x-thinkerqaq-token|Cookie:/u);
});

test("the same Settings Catalog and controls mount in both UI hosts", async () => {
  const [settings, popup, html] = await Promise.all([
    source("popup/settings-navigation.js"), source("popup/popup.js"), source("popup/popup.html"),
  ]);
  assert.match(settings, /CATEGORY_META/u);
  assert.match(settings, /#platformConfigEnvironmentCard/u);
  assert.match(settings, /#assetConfigEnvironmentCard/u);
  assert.match(settings, /#searchEngineEnvironmentCard/u);
  assert.match(settings, /section\.append\(element\)/u);
  assert.match(popup, /BlogCTLSettingsNavigation\.init\(\)/u);
  assert.match(html, /id="environmentRuntimeTools"/u);
});

test("Update sends selected remote IDs directly and never silently creates", async () => {
  const [drafts, sync, html] = await Promise.all([
    source("popup/drafts.js"), source("popup/sync.js"), source("popup/popup.html"),
  ]);
  assert.match(sync, /selectedTargets\(\)/u);
  assert.match(drafts, /operation:state\.mode/u);
  assert.match(drafts, /targets:state\.mode==="create"\?\[\]:targets/u);
  assert.match(drafts, /请选择先检测|请先检测并勾选至少一篇远端文章/u);
  assert.doesNotMatch(drafts, /usePlatformChangedOnly|operation:"draft"/u);
  assert.doesNotMatch(html, /id="bindSelectedMatches"|id="unbindSelectedMatches"/u);
  assert.match(sync, /textContent = "更新此文章"/u);
});

test("Creation is a separate explicit task and exposes create or create-and-publish", async () => {
  const drafts = await source("popup/drafts.js");
  assert.match(drafts, /state\.mode==="create"\?"创建草稿":"更新所选"/u);
  assert.match(drafts, /"创建并发布":"更新并发布"/u);
  assert.match(drafts, /if\(state\.mode==="update"\)validateTargets\(targets\)/u);
  assert.match(drafts, /!window\.confirm/u);
});

test("native publishing adapters retain authorization and disabled experimental platforms", async () => {
  const [background, model] = await Promise.all([source("background.js"),source("popup/sync-model.js")]);
  assert.match(model, /new Set\(\["medium", "toutiao"\]\)/u);
  assert.match(background, /platform === "toutiao"/u);
  assert.match(background, /case "blogctl\.job\.start":/u);
  assert.doesNotMatch(background, /cto51PublishInBrowser|ensureToutiaoEditorTab/u);
});
