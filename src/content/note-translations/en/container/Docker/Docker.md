---
title: "Docker"
description: "Container images, namespaces/cgroups, layers, networking, storage, build practices, and runtime isolation boundaries."
translationOf: "container/Docker/Docker"
language: "en"
updatedAt: "2026-09-15T06:10:00Z"
---

Docker packages an application and its filesystem/runtime dependencies as an image and runs it as a container using operating-system isolation primitives such as namespaces and cgroups through a container runtime stack.

Images are built from immutable layers; containers add writable runtime state. Keep application data in explicit persistent storage rather than relying on the container writable layer.

Good image practice includes small trusted base images, reproducible builds, multi-stage builds, non-root execution where possible, pinned/scanned dependencies, and no secrets baked into image layers.

Containers share the host kernel. They provide process/resource isolation, not the same isolation boundary as a separate virtual machine.