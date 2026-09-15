---
title: "1.1 Nginx Overview"
description: "Nginx fundamentals: common roles, process model, event-driven I/O, and its place as a web server, reverse proxy, and load balancer."
translationOf: "web-server-nginx/overview"
language: "en"
updatedAt: "2026-09-15T03:10:00Z"
---

## 1. What Nginx Is

Nginx is an event-driven web and proxy server. It became well known for handling large numbers of concurrent connections, but its common roles today include:

- serving static content;
- reverse proxying requests to upstream applications;
- load balancing across upstream instances;
- response caching and traffic limiting;
- proxying TCP/UDP traffic when the `stream` module is enabled.

The C10K problem is useful historical context, not a complete modern definition of Nginx.

## 2. Process Model

A typical Nginx deployment has one master process and multiple worker processes:

- the master reads and validates configuration and manages workers;
- workers handle connections and requests;
- `worker_processes auto;` can size the worker count according to available CPUs.

Nginx uses an event-driven model and OS-specific event mechanisms. Linux commonly uses epoll, while other operating systems use their corresponding mechanisms, so Nginx should not be described as simply “an epoll server.”

## 3. I/O Multiplexing

Network I/O can be viewed roughly as waiting for data to become ready and then moving data from kernel space to user space. I/O multiplexing lets an execution thread observe readiness across many connections instead of dedicating one thread to every connection.

This is one of the foundations that allows an Nginx worker to handle many concurrent connections efficiently.

## 4. Common Capabilities

### Static content

Nginx can serve HTML, CSS, JavaScript, images, and downloads directly from the filesystem, with features such as `sendfile`, gzip, and cache headers.

### Reverse proxy

```nginx
location /api/ {
    proxy_pass http://app_backend;
}
```

### Load balancing

```nginx
upstream app_backend {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
}
```

Round robin is the default upstream strategy, with additional options for weights, hashing, and failure handling.

## 5. Position in a System

Nginx commonly sits in front of applications and handles connection acceptance, static content, routing, TLS, proxying, and traffic policy. Application business logic remains in backend services.
