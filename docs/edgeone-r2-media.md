# EdgeOne + Cloudflare R2 image origin

Status: **not enabled**. Do not replace production image URLs until the accelerated host has passed origin and cache checks.

## Scope

- Primary site: https://thinkerqaq.com — existing EdgeOne Makers static deployment.
- Proposed static media host: https://assets.thinkerqaq.com
- Existing R2 bucket: thinkerqaq-asset
- Existing public development URL: https://pub-366a15b6733345039775c083a1fffb3e.r2.dev/
- Site-generated Mermaid and PlantUML SVG are already included in the GitHub Pages / EdgeOne static artifact (`dist/diagrams/`). **Never send them to R2**.
- Original article images remain in R2, and the multi-platform BlogCTL publishing pipeline continues to use PNG + per-platform upload / R2 fallback.

## Configure in Tencent EdgeOne (one image first)

1. Add **assets.thinkerqaq.com** as an acceleration hostname under the existing zone.
2. Choose **Object Storage Origin → S3 Compatible**. R2's documented S3 API host is `<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com`.
3. Use **Private Access Authorization → AWS Signature V4**, with a dedicated *read-only* R2 API token restricted to `thinkerqaq-asset`. The R2 region is `auto`; R2 also accepts `us-east-1` if EdgeOne's region field does not accept `auto`. Keep the secret exclusively in EdgeOne, not in this repository.
4. Check object path mapping. R2 supports `/<bucket>/<object-key>` path-style S3 requests: a public request for `/articles/concurrency-series-07-volatile/cover-zh.jpg` needs an authenticated upstream request to `/thinkerqaq-asset/articles/concurrency-series-07-volatile/cover-zh.jpg`. Configure EdgeOne's origin path prefix/rewriting accordingly; validate signature generation after rewriting.
5. Configure HTTPS certificate, DNS pointing to **EdgeOne**, and image caching. Prefer immutable hashed asset names for long TTL. Existing cover filenames may be overwritten, so use a shorter TTL or purge them on updates.
6. Test both cache miss and cache hit with a known file; check HTTP 200, JPEG content, byte comparison/ETag if available, and EdgeOne cache headers. Test without a client-side proxy from mainland China, then compare TTFB with the existing R2 address.
7. Only after this passes, switch the image base URL in content, BlogCTL publishing configuration (Public Base URL), and all generated metadata. Keep old URLs working until published external links have been addressed.

Do not CNAME the custom host to `pub-*.r2.dev`: Cloudflare explicitly does not support this as a production configuration. Cloudflare R2 custom domains alone do **not** guarantee mainland China routing performance. The acceleration in this plan comes from EdgeOne edge cache hits.

## References

- [EdgeOne: S3-compatible object storage origin](https://cloud.tencent.com/document/product/1552/122800)
- [EdgeOne: origin rewrite](https://cloud.tencent.com/document/product/1552/71009)
- [EdgeOne: node cache TTL](https://cloud.tencent.com/document/product/1552/70777)
- [Cloudflare: R2 S3 API and region](https://developers.cloudflare.com/r2/api/s3/api/)
- [Cloudflare: r2.dev is not for production](https://developers.cloudflare.com/r2/buckets/public-buckets/)
