# How to diagnose missing site analytics

**Task:** determine whether a blank Umami dashboard is caused by site instrumentation, requests, or upstream reporting.

## Prerequisites

A built/deployed site, browser DevTools and read-only access to its analytics dashboard or logs.

## Steps

1. Inspect the page source/Network tab for the Umami script. [BaseLayout](../../src/layouts/BaseLayout.astro) only includes it when the website ID and proxy origin are configured and analytics are enabled on that page.
2. Open a normal article, not the [disable-analytics page](../../src/pages/disable-analytics.astro). Check the script GET request and analytics POST request independently.
3. In the browser Network tab, distinguish a blocked/failed script load from an ingestion failure (status, CORS, proxy, or endpoint). A successful HTTP response proves transport reached an endpoint, not that Umami recorded the correct website/session.
4. Compare the site ID, dashboard time range and filters with the deployed build configuration in [Deployment Reference](../reference/deployment.md).
5. Verify that the configured Umami Worker endpoint accepts ingestion, using the browser Network panel. Successful transport alone does not establish recorded visits.

## Verify

Use a test browser session with analytics allowed, confirm a request succeeds, then check that the same website and time window records a visit. Do not log raw analytics tokens, private headers or visitor identifiers.
