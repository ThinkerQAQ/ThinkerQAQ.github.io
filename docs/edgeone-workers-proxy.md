# EdgeOne Makers and Cloudflare proxy

## Scope
- The static site is still built to `dist/`. GitHub Pages receives unchanged static output.
- The Makers deployment job adds `edge-functions/` only to its own artifact.
- Routes: GET `/u.js` (Umami script), POST `/api/send` (Umami ingestion), GET/PUT/DELETE `/v1/reactions` (helpful reaction), GET `/api/edge-health` (read-only diagnostics).
- Upstreams are fixed to existing Cloudflare Workers. Browsers currently still use the old Cloudflare URLs, so deploying these routes by itself does not change production traffic.
- POST requires same-origin Origin; responses to analytics and reaction requests are not cacheable.

## Preview observations (2026-10-09)
- EdgeOne to Cloudflare health: HTTP 200 (approximately 413–465 ms).
- Umami JS GET and reactions GET: HTTP 200.
- Cross-site analytics POST was rejected (HTTP 403).
- Mainland direct to the signed preview URL returned HTTP 401, an EdgeOne preview-access restriction. This does **not** establish mainland production reachability.

## Required cutover checks
1. Deploy edge routes with unchanged browser URLs.
2. Direct mainland testing without proxy of `thinkerqaq.com/api/edge-health`, `/u.js` and reactions GET.
3. Test analytics ingestion, bot filtering, and reporting before switching production.
4. **Umami geolocation:** the Cloudflare Worker currently reads country/region from Cloudflare's `request.cf`. With EdgeOne egress as its client, this will not reliably describe the real visitor. Do not route analytics writes until an authenticated geo-forwarding mechanism or accepted tradeoff is implemented.
5. **Reaction rate limits:** the Cloudflare Worker keys limits from `cf-connecting-ip`, which may be a shared EdgeOne egress IP. Review fairness before switching writes.
6. Verify rollback via repository variables and rebuild.

When approved, point `PUBLIC_UMAMI_PROXY_ORIGIN` and `PUBLIC_REACTION_WORKER_URL` to `https://thinkerqaq.com`, trigger rebuild and verify. Keep the current defaults unchanged until then.

Documentation: [Makers Edge Functions](https://pages.edgeone.ai/document/edge-functions).
