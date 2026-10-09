# BlogCTL v0.1.109

Align the Google Search Console integration with the verified sc-domain:thinkerqaq.com property.

## Changes

- Open and reuse the verified Search Console domain property in the browser extension, avoiding the unprivileged URL-prefix property.
- Use the domain property as the default site for automated Search Console sitemap notification.
- Keep existing canonical URLs and sitemap contents under https://thinkerqaq.com.
- Keep CLI, browser extension, and Native Host versions aligned.

The Search Console service account has successfully submitted the two existing sitemaps under the domain property; indexing and crawling are still determined by Google.
