import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export async function verifySiteOutput({ engineRoot, siteRoot }) {
  const engine = path.resolve(engineRoot);
  const site = path.resolve(siteRoot);
  const config = JSON.parse(await readFile(path.join(site, 'site.config.json'), 'utf8'));
  const { normalizeSiteFeatures } = await import(pathToFileURL(path.join(engine, 'src/lib/site-features.mjs')).href);
  const { isLegacyRoute } = await import(pathToFileURL(path.join(engine, 'src/lib/legacy-routes.mjs')).href);
  const { resolveAnalyticsIntegration, resolveReactionIntegration } = await import(pathToFileURL(path.join(engine, 'src/lib/site-integrations.mjs')).href);
  const policies = normalizeSiteFeatures(config);
  const dist = path.join(engine, 'dist');
  const [home, enHome, rssZh, rssEn, sitemap] = await Promise.all([
    readFile(path.join(dist, 'index.html'), 'utf8'),
    readFile(path.join(dist, 'en/index.html'), 'utf8'),
    readFile(path.join(dist, 'rss.xml'), 'utf8'),
    readFile(path.join(dist, 'en/rss.xml'), 'utf8'),
    readFile(path.join(dist, 'sitemap-all.txt'), 'utf8'),
  ]);
  assert.ok(home.includes(escapeXml(policies.home.hero.zh.title)), 'Chinese homepage missing configured hero title');
  assert.ok(enHome.includes(escapeXml(policies.home.hero.en.title)), 'English homepage missing configured hero title');
  assert.ok(home.includes(config.url), 'Homepage missing site-owned canonical origin');
  assert.ok(enHome.includes(config.url), 'English homepage missing site-owned canonical origin');
  assert.ok(rssZh.includes(escapeXml(policies.rss.descriptions.zh)), 'RSS zh description changed');
  assert.ok(rssEn.includes(escapeXml(policies.rss.descriptions.en)), 'RSS en description changed');

  const analytics = resolveAnalyticsIntegration(policies.integrations.analytics, process.env);
  const reactions = resolveReactionIntegration(policies.integrations.reactions, process.env);
  if (analytics?.provider === 'umami') {
    assert.ok(home.includes(`data-website-id="${escapeXml(analytics.websiteId)}"`), 'Configured Umami website ID missing from homepage');
    assert.ok(home.includes(`data-host-url="${escapeXml(analytics.collectorOrigin)}"`), 'Configured Umami collector origin changed');
    assert.ok(home.includes(`src="${escapeXml(analytics.src)}"`), 'Configured Umami tracker script missing');
    if (analytics.src.startsWith('/')) {
      const scriptPath = path.join(dist, analytics.src.slice(1));
      assert.ok((await readFile(scriptPath)).byteLength > 0, 'Site-local analytics script asset missing');
    }
  } else if (analytics?.provider === 'script') {
    assert.ok(home.includes(`src="${escapeXml(analytics.src)}"`), 'Custom analytics script missing');
  }
  if (reactions) {
    const articleEntries = await readdir(path.join(dist, 'articles'), { withFileTypes: true });
    let found = false;
    for (const item of articleEntries) {
      if (!item.isDirectory() || item.name === 'en') continue;
      let html;
      try { html = await readFile(path.join(dist, 'articles', item.name, 'index.html'), 'utf8'); }
      catch (error) { if (error?.code === 'ENOENT') continue; throw error; }
      if (!html.includes('class="content-reaction"')) continue;
      assert.ok(html.includes(`data-endpoint="${escapeXml(reactions.endpoint)}"`), 'Reaction endpoint changed in generated article');
      assert.ok(html.includes(`data-api-path="${escapeXml(reactions.apiPath)}"`), 'Reaction API contract changed in generated article');
      found = true;
      break;
    }
    assert.ok(found, 'Reactions are configured but no article reaction UI was generated');
  }


  const aliases = [...policies.legacyRedirects.exact, ...policies.legacyRedirects.categoryArchives];
  for (const { from, to } of aliases) {
    const content = await readFile(path.join(dist, from.slice(1), 'index.html'), 'utf8');
    assert.ok(content.includes(new URL(to, config.url).href), `Legacy canonical target changed: ${from}`);
    assert.ok(content.includes('noindex,follow'), `Legacy page must not be indexable: ${from}`);
  }
  const urls = sitemap.split(/\r?\n/).filter(Boolean);
  for (const row of urls) {
    const pathname = decodeURI(new URL(row).pathname);
    assert.equal(isLegacyRoute(pathname, policies.legacyRedirects), false, `Legacy URL leaked into sitemap: ${pathname}`);
  }
  return { origin: config.url, verifiedCanonicalRedirects: aliases.length, sitemapUrls: urls.length, analyticsProvider: analytics?.provider || 'none', reactionsEnabled: Boolean(reactions) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const engineArg = process.argv.indexOf('--engine');
  const siteArg = process.argv.indexOf('--site');
  if (engineArg < 0 || siteArg < 0 || !process.argv[engineArg + 1] || !process.argv[siteArg + 1]) {
    throw new Error('Usage: node scripts/verify-site-features.mjs --engine <engine> --site <wrapper>');
  }
  verifySiteOutput({ engineRoot: process.argv[engineArg + 1], siteRoot: process.argv[siteArg + 1] }).then(
    result => console.log(JSON.stringify({ operation: 'verify-site-features', status: 'passed', ...result })),
    error => { console.error(error.message); process.exitCode = 1; },
  );
}
