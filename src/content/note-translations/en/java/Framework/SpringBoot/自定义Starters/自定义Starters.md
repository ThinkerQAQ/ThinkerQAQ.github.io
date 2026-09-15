---
title: "Creating a Spring Boot Starter"
description: "Packaging reusable dependencies plus conditional auto-configuration and typed configuration properties without surprising applications."
translationOf: "java/Framework/SpringBoot/自定义Starters/自定义Starters"
language: "en"
updatedAt: "2026-09-15T05:50:00Z"
---

A custom starter normally packages dependency choices and an auto-configuration module that contributes beans only when appropriate conditions match.

Good starter design:

- exposes typed configuration properties;
- backs off when users provide their own beans;
- avoids broad component scanning side effects;
- uses explicit condition/ordering contracts;
- provides metadata/documentation and tests for matched/unmatched conditions.

The registration mechanism for auto-configuration is Boot-version-specific, so follow the current Boot documentation rather than copying an old `spring.factories` recipe unmodified.