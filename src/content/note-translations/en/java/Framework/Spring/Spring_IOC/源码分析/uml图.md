---
title: "Spring IoC Class Relationships"
description: "A conceptual map of Spring container interfaces and extension points rather than a version-frozen UML diagram."
translationOf: "java/Framework/Spring/Spring_IOC/源码分析/uml图"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

For source reading, group Spring IoC types by role:

- `BeanFactory` / `ApplicationContext`: container contracts;
- bean-definition/registry types: metadata;
- bean factory implementations: creation and singleton management;
- `BeanFactoryPostProcessor`: definition/factory customization;
- `BeanPostProcessor`: instance lifecycle/proxy customization;
- resource/environment/event abstractions: application-context services.

Exact inheritance graphs change across releases, so regenerate UML from the actual source tag when class-level accuracy matters.