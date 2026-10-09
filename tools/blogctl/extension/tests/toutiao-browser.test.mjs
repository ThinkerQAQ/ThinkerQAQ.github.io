import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateToutiaoBrowserRequest, executeToutiaoEditorFetch } from '../toutiao-browser.js';

const root = dirname(fileURLToPath(import.meta.url));
const acceptable = {
  id: '1234abcd1234abcd',
  path: '/mp/agw/article/publish?source=mp&type=article&aid=1231&mp_publish_ab_val=0',
  body: 'title=hello&save=0',
};

test('Toutiao browser signing accepts only creator publish endpoints', () => {
  assert.deepEqual(validateToutiaoBrowserRequest(acceptable), acceptable);
  for (const path of [
    'https://example.com/exfiltrate',
    '//example.com/exfiltrate',
    '/mp/agw/article/publish?source=mp&type=article&aid=1231&redirect=https://evil.example/',
    '/mp/agw/article/publish?source=mp&type=article&aid=456',
    '/mp/agw/article/publish?source=mp&type=article',
    '/mp/agw/creator_center/list/v2?source=mp&type=article&aid=1231',
  ]) {
    assert.throws(() => validateToutiaoBrowserRequest({...acceptable, path}), /Unexpected/);
  }
  assert.throws(() => validateToutiaoBrowserRequest({...acceptable, id: 'foo'}), /Invalid/);
});

test('Toutiao MAIN-world fetch uses same-origin editor credentials without credentials transport', async () => {
  const oldLocation = globalThis.location;
  const oldFetch = globalThis.fetch;
  let seen;
  try {
    globalThis.location = {origin: 'https://mp.toutiao.com'};
    globalThis.fetch = async (path, options) => {
      seen = {path, options};
      return { status: 200, text: async () => '{"code":0,"data":{"pgc_id":"123"}}' };
    };
    const response = await executeToutiaoEditorFetch(acceptable.path, acceptable.body);
    assert.equal(response.status, 200);
    assert.equal(JSON.parse(response.body).code, 0);
    assert.equal(seen.path, acceptable.path);
    assert.equal(seen.options.method, 'POST');
    assert.equal(seen.options.credentials, 'include');
    assert.equal(seen.options.body, acceptable.body);
    assert.equal(seen.options.headers.authorization, undefined);
    globalThis.location = {origin: 'https://evil.example'};
    const bad = await executeToutiaoEditorFetch(acceptable.path, acceptable.body);
    assert.equal(bad.status, 0);
  } finally {
    globalThis.location = oldLocation;
    globalThis.fetch = oldFetch;
  }
});

test('Background pumps Toutiao jobs through MAIN-world signing transport', async () => {
  const background = await readFile(join(root, '../background.js'),'utf-8');
  assert.match(background, /kickToutiaoBrowserPump\(result\.job\.id\)/);
  assert.match(background, /world: "MAIN"/);
  assert.match(background, /"\/v1\/toutiao\/browser\/next"/);
  assert.match(background, /"\/v1\/toutiao\/browser\/complete"/);
  assert.match(background, /chrome\.scripting\.executeScript/u);
});
