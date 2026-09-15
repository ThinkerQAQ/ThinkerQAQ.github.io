---
title: "Kubernetes"
description: "Declarative container orchestration with Pods, controllers, Services, scheduling, configuration, storage, probes, and resource limits."
translationOf: "container/Kubernetes/Kubernetes"
language: "en"
updatedAt: "2026-09-15T06:10:00Z"
---

Kubernetes is a declarative orchestration system. Users submit desired state to the API; controllers continuously reconcile actual cluster state toward it.

The basic scheduling unit is a Pod. Higher-level controllers such as Deployments/StatefulSets manage replicated or stateful workloads. Services provide stable discovery/load-balancing abstractions, while Ingress/Gateway-style components expose traffic according to cluster setup.

Production design needs requests/limits, readiness/liveness/startup probes, disruption/rolling-update policy, secrets/configuration, persistent volumes where required, and observability.

A successful Pod start does not mean the application is ready. Readiness should represent whether it can safely receive traffic, and resource limits should reflect measured workload behavior.