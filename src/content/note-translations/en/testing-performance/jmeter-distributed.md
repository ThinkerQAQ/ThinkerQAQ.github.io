---
title: "4.1 Distributed Load Testing with JMeter"
description: "JMeter controller/worker architecture, CLI execution, RMI networking, version consistency, and result-collection constraints."
translationOf: "testing-performance/jmeter-distributed"
language: "en"
updatedAt: "2026-09-15T03:15:00Z"
---

## 1. When Distributed JMeter Helps

When one load generator is limited by CPU, memory, or network capacity, one JMeter controller can coordinate multiple remote workers.

Each worker runs the **entire test plan**. A plan with 1,000 threads executed on six workers produces roughly 6,000 threads; JMeter does not automatically split the 1,000 threads across workers.

## 2. Keep Nodes Consistent

Controller and workers should use:

- exactly the same JMeter version;
- preferably the same Java version;
- the same plugins and custom JARs;
- network access to the target;
- matching external data files on every worker, because the test plan is transferred but external data files are not automatically distributed.

Remote testing uses RMI. Configure ports and RMI SSL correctly; disabling SSL should be limited to explicitly trusted isolated networks where the risk is understood.

## 3. Start Workers

Run on each worker:

```bash
jmeter-server
```

When firewalls are present, define explicit rules for the RMI registry, server engine, and result-return connections. Properties such as `server.rmi.localport` and `client.rmi.localport` can make port usage predictable.

## 4. Run from the Controller

Use CLI mode for real load tests; use the GUI to build and debug plans.

```bash
jmeter -n \
  -t test-plan.jmx \
  -R load-1.example.net,load-2.example.net \
  -l results.jtl \
  -e \
  -o report
```

`-r` can use workers from `remote_hosts`; `-R` specifies workers for a particular run. `-e -o` generates the HTML dashboard after the test, and `-X` can request remote servers to exit after completion.

## 5. Watch the Load Generators

The controller can become a bottleneck while collecting worker results. Reduce unnecessary listeners and sample fields, monitor controller/worker CPU, memory, and network, and verify that the load generators are not saturating before the system under test.

Capacity conclusions are trustworthy only when the load-generation side is itself stable.
