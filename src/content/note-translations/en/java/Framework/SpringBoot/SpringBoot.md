---
title: "Spring Boot Overview"
description: "Spring Boot's opinionated application bootstrap, starters, auto-configuration, embedded servers, external configuration, and observability."
translationOf: "java/Framework/SpringBoot/SpringBoot"
language: "en"
updatedAt: "2026-09-15T05:50:00Z"
---

Spring Boot builds on Spring Framework to reduce application bootstrap/configuration work through starters, auto-configuration, externalized configuration, executable packaging, embedded server integration, and production tooling.

Boot does not replace Spring IoC/AOP/MVC; it assembles/configures those pieces according to conventions and detected dependencies.

The key operational rule is to understand what Boot auto-configured and why. User-defined beans/properties commonly override or disable defaults, and behavior changes across Boot major versions.