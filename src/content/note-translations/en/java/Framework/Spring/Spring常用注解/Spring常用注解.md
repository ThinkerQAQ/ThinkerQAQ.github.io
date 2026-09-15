---
title: "Common Spring Annotations"
description: "Common stereotypes, configuration, dependency injection, lifecycle, transaction, and web annotations with version-aware usage."
translationOf: "java/Framework/Spring/Spring常用注解"
language: "en"
updatedAt: "2026-09-15T05:40:00Z"
---

Common Spring annotations fall into roles:

- component stereotypes: `@Component`, `@Service`, `@Repository`, `@Controller`;
- Java configuration: `@Configuration`, `@Bean`, component/import/property mechanisms;
- dependency injection: constructor injection, `@Autowired`, `@Qualifier`, `@Primary`;
- lifecycle/conditional/configuration annotations;
- declarative transactions: `@Transactional`;
- web mappings/binding in Spring MVC.

Annotation behavior is implemented by container post-processors/configuration infrastructure. Use annotations to express architecture clearly rather than accumulating hidden framework magic.