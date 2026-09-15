---
title: "4.2 Redis Sentinel"
description: "Redis Sentinel monitoring and failover for primary-replica deployments, including subjective/objective down states, quorum, failover authorization, promotion, and remaining consistency limits."
translationOf: "redis-cache/分布式/Redis Sentinel"
language: "en"
updatedAt: "2026-09-15T06:00:00Z"
---

## 1. What Sentinel Adds

Redis Sentinel provides high-availability coordination around a non-clustered primary/replica Redis deployment.

Its responsibilities include:

- monitoring;
- failure notification;
- discovering/reporting the current primary;
- coordinating automatic failover.

Sentinel does not shard data; there is still one writable primary for a given master group.

## 2. Failure Detection

A Sentinel can mark a primary **subjectively down (SDOWN)** when that Sentinel cannot communicate with it within configured limits.

The primary becomes **objectively down (ODOWN)** when enough Sentinels agree according to the configured quorum.

The quorum used to establish objective-down state and the majority authorization needed to perform failover are related but not identical concepts. "Half the Sentinels say it is down" is therefore too simplistic.

## 3. Failover Coordination

Sentinels coordinate to choose a Sentinel leader for a failover epoch. That leader selects an eligible replica, promotes it, reconfigures other replicas, and publishes the new primary information.

Replica selection considers factors such as reachability, priority, replication progress, and run ID tie-breaking rules.

Sentinel's election protocol should not casually be labeled "Raft". It has voting/epochs but is a Redis-specific failover protocol, not a general Raft replicated log.

## 4. Client Behavior

Sentinel-aware clients discover the current primary through Sentinels and must reconnect after failover.

Applications should expect transient connection errors, retries, and topology change rather than assuming failover is invisible.

## 5. Consistency Limit

Because underlying replication is asynchronous, automatic failover can promote a replica that does not contain the latest acknowledged writes. Sentinel improves availability; it does not remove Redis replication's data-loss window.