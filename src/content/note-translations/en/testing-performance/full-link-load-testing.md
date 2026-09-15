---
title: "3.1 Full-Link Load Testing"
description: "Traffic marking, data isolation, test-data construction, third-party protection, and production safety guardrails."
translationOf: "testing-performance/full-link-load-testing"
language: "en"
updatedAt: "2026-09-15T03:15:00Z"
---

## 1. What Full-Link Load Testing Is

Full-link load testing sends controlled test traffic through a near-real end-to-end call path to validate system-wide capacity, bottlenecks, and protection mechanisms.

Its defining characteristic is broader dependency and asynchronous-path coverage, not simply higher request volume.

## 2. Mark Test Traffic

A controlled ingress can attach a trusted test marker that is propagated through RPC, messaging, and asynchronous jobs.

Systems should not blindly trust a marker supplied by arbitrary external clients, because doing so could bypass isolation rules.

## 3. Isolate Data

Common patterns include:

- MySQL shadow databases/tables or dedicated test tenants;
- Redis namespaces, shadow keys, or isolated data sources;
- Kafka shadow topics or tightly governed message markers;
- separate search indexes or cache namespaces;
- mocks, sandboxes, or bounded test accounts for third parties.

Isolation must cover asynchronous consumers, compensation workflows, and offline jobs as well as synchronous RPC calls.

## 4. Build Test Data Safely

Production-derived data requires authorization, minimization, and desensitization. Synthetic data is often safer and should still reproduce realistic scale, distribution, and hotspots.

## 5. Guardrails

Near-production or production testing should include bounded traffic, automatic abort thresholds, real-time monitoring, third-party protection, data cleanup, named ownership, and rollback procedures.

Full-link load testing is a controlled, observable, stoppable capacity experiment—not merely “sending more traffic.”
