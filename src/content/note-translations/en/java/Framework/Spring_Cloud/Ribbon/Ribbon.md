---
title: "Ribbon Client-Side Load Balancing (Historical)"
description: "Historical Ribbon client-side load balancing and durable instance-selection concepts."
translationOf: "java/Framework/Spring_Cloud/Ribbon/Ribbon"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

Netflix Ribbon is a **legacy** client-side load-balancing library formerly common in Spring Cloud stacks.

The durable design is: obtain candidate service instances, filter unhealthy/unavailable endpoints, select according to a policy, execute with deadlines, and feed observations back into health/outlier logic.

Round-robin alone is not enough when instances have uneven latency/capacity. Modern Spring ecosystems use newer load-balancing components, so Ribbon-specific classes/configuration should be treated as historical.