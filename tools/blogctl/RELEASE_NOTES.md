# BlogCTL v0.1.107

BlogCTL is the local publishing and search-indexing control plane for the ThinkerQAQ blog.

## Changes

- Switch generated canonical URLs, article links, sitemap/search defaults, and AI Search document origins to `https://thinkerqaq.com`.
- Keep DEV.to binding discovery compatible with articles originally published with the `thinkerqaq.github.io` canonical origin, without changing historical posts by default.
- Use the latest BlogCTL code built from the public engine on the main branch, including the prior indexing-queue and durable task fixes.
- Retain Windows, macOS and Linux command-line packages, the browser extension and native messaging installation scripts.

The GitHub Pages hostname remains a legacy URL; do not assume server-side redirects are in place until separately verified.
