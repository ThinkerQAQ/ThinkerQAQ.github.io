import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const html=await readFile(new URL("../popup/popup.html",import.meta.url),"utf8");
const app=await readFile(new URL("../popup/social.js",import.meta.url),"utf8");
const bg=await readFile(new URL("../background.js",import.meta.url),"utf8");
const env=await readFile(new URL("../popup/environment.js",import.meta.url),"utf8");

test("social panel shares side panel and web console UI",()=>{
 assert.match(html,/data-tab="social"/u);
 assert.match(html,/data-panel="social"/u);
 assert.match(html,/<script src="social\.js"><\/script>/u);
 for(const id of ["socialDraftPicker","socialPlatform","socialText","socialApprove","socialStage","socialPublish"]) {
  assert.match(html,new RegExp(`id="${id}"`));
 }
 assert.match(app,/root\.BlogCTLSocial=api/u);
 assert.doesNotMatch(app,/innerHTML/u);
});
test("separate publication confirmation and version-bound review",()=>{
 assert.match(app,/action==="publish"/u);
 assert.match(app,/confirm\("/u);
 assert.match(app,/revision:draft\.revision/u);
 assert.match(app,/action==="stage"/u);
 assert.match(bg,/blogctl\.social\.stage/u);
 assert.match(bg,/blogctl\.social\.publish/u);
});
test("Buffer secret is displayed through existing masked config UI",()=>{
 assert.match(env,/socialPlatformAccess/u);
 assert.match(html,/id="socialPlatformAccessConfig"/u);
});

