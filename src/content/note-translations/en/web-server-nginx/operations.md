---
title: "6.1 Nginx Operations and Performance Configuration"
description: "Nginx operations notes covering workers, file descriptors, CPU affinity, configuration validation, graceful reloads, and performance tuning principles."
translationOf: "web-server-nginx/operations"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. Workers

A reasonable general starting point is:

```nginx
worker_processes auto;

events {
    worker_connections 4096;
}
```

`worker_connections` is one limit on connections per worker, but real capacity also depends on file descriptors, upstream connections, memory, and the workload. Multiplying it by worker count does not directly give real QPS.

## 2. CPU Affinity

Nginx supports `worker_cpu_affinity`, but modern deployments should normally begin with `worker_processes auto;` and pin workers only after benchmarks show CPU scheduling is a bottleneck.

```nginx
worker_cpu_affinity auto;
```

Containers also introduce cgroup CPU quotas and scheduling constraints.

## 3. File Descriptors

```nginx
worker_rlimit_nofile 65535;
```

Systemd, the container runtime, and OS-level `nofile` limits must also permit the desired value. Nginx configuration alone cannot bypass operating-system limits.

## 4. Baseline HTTP Configuration

```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    gzip on;
    include /etc/nginx/conf.d/*.conf;
}
```

Treat this as a starting point. Timeouts, caching, compression, workers, and connection values should be adjusted from workload measurements.

## 5. Validate and Reload

```bash
nginx -t
nginx -s reload
```

A reload asks the master to read the new configuration and lets old workers finish existing requests before exiting.

Other common signals are `quit`, `stop`, and `reopen`.

## 6. Tuning Principle

Do not enable CPU pinning, very large connection limits, aggressive caching, or extreme timeout values by default. Identify a bottleneck and validate one change at a time with load tests and metrics.
