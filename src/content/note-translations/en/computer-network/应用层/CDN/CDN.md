---
title: "3.1 Content Delivery Networks (CDNs)"
description: "How CDNs cache and serve content near users, use DNS/anycast steering, fill from origins, invalidate content, and trade freshness for latency and origin load."
translationOf: "computer-network/应用层/CDN/CDN"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. What Is a CDN?

A Content Delivery Network operates distributed edge infrastructure that can serve content and proxy traffic closer to users than the origin server.

CDNs began primarily as static-content caches, but modern CDNs may also provide:

- dynamic reverse proxying;
- TLS termination;
- DDoS/WAF protection;
- image/video transformation;
- edge compute;
- load balancing and origin shielding.

## 2. Why Use a CDN?

A CDN can reduce:

- round-trip latency to users;
- origin bandwidth;
- repeated origin work;
- exposure of the origin to traffic spikes.

It can also improve availability by using multiple edge/origin paths.

## 3. Request Flow

A common flow is:

1. the site's DNS delegates or aliases traffic to the CDN;
2. DNS steering and/or anycast routes the client toward an appropriate edge;
3. the edge checks its cache/policy;
4. on a cache hit, the edge responds directly;
5. on a miss, the edge fetches from the origin or an upper-tier cache, then may cache the response.

The exact mechanism differs across CDN providers.

## 4. Cache Freshness

Caching introduces a freshness trade-off. Controls include:

- HTTP cache headers (`Cache-Control`, validators, TTLs);
- purge/invalidation APIs;
- versioned asset URLs;
- stale-while-revalidate / stale-if-error strategies.

A robust system prefers immutable versioned assets when possible because they are easy to cache aggressively.

## 5. Push vs. Pull

### Pull / Origin Fetch

The edge fetches content on demand after a cache miss. This is the common general-purpose CDN model.

### Push / Pre-Positioning

Content is uploaded or prefetched into the CDN before user demand. This can help large predictable objects or launches but requires more orchestration.

The distinction is not simply "push is real-time, pull is stale"; freshness depends on cache policy and invalidation design.