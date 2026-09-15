---
title: "Spring Bean Lifecycle"
description: "From bean definition and instantiation through dependency injection, post-processors, initialization, proxies, use, and destruction."
translationOf: "java/Framework/Spring/Bean/Bean生命周期"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

A useful high-level Spring bean lifecycle is:

1. bean definition is registered/merged;
2. bean instance is created;
3. dependencies/properties are populated;
4. awareness callbacks and `BeanPostProcessor` hooks run;
5. initialization callbacks run;
6. post-processors may return a wrapped/proxy object;
7. the bean is used;
8. managed destruction callbacks run when the owning context closes.

Exact hook ordering has version-specific details. The important design point is that framework post-processors can participate before/after initialization and can replace the exposed object with a proxy.