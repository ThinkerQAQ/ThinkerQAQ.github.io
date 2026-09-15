---
title: "Eureka Service Discovery"
description: "Eureka-style client registration and discovery, heartbeats, cached registries, and availability-oriented semantics."
translationOf: "java/Framework/Spring_Cloud/Eureka/Eureka"
language: "en"
updatedAt: "2026-09-15T05:30:00Z"
---

Eureka is a service registry/discovery system historically common in Netflix OSS/Spring Cloud stacks. Service instances register metadata and send heartbeats; clients can obtain/cache registry information and choose an instance.

Discovery data is not a linearizable source of truth. Registration, heartbeat expiry, cache propagation, and network partitions create windows where stale instances may appear.

Clients therefore need connect/request timeouts, retries only where safe, health/outlier handling, and load-balancing logic that tolerates stale discovery information.