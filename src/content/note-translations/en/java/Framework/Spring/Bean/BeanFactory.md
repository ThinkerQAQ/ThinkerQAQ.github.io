---
title: "Spring BeanFactory"
description: "BeanFactory as Spring's dependency-container contract and its relationship with ApplicationContext."
translationOf: "java/Framework/Spring/Bean/BeanFactory"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

`BeanFactory` is Spring's fundamental bean-container contract: obtain/manage objects defined by bean metadata and their dependencies/lifecycle.

`ApplicationContext` builds on this foundation with richer application services such as events, resource loading, environment/property support, internationalization, and common framework integration.

Application code should usually depend on injected collaborators rather than repeatedly calling `getBean`, which turns dependency injection back into service location.