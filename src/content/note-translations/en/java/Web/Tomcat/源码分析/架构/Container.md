---
title: "Tomcat Container Hierarchy"
description: "Engine, Host, Context, Wrapper, request routing, and the hierarchical Tomcat container model."
translationOf: "java/Web/Tomcat/源码分析/架构/Container"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

Tomcat historically models request processing through a container hierarchy such as Engine → Host → Context → Wrapper.

Conceptually these layers select virtual host, web application/context, and target servlet while applying container pipeline/valve behavior.

Exact implementation classes evolve, but the useful architecture is hierarchical request routing plus lifecycle/configuration boundaries.