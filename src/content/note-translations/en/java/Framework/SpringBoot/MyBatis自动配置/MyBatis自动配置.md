---
title: "MyBatis Auto-Configuration in Spring Boot"
description: "Conditional creation of SqlSessionFactory, mapper integration, transaction participation, and application override points."
translationOf: "java/Framework/SpringBoot/MyBatis自动配置/MyBatis自动配置"
language: "en"
updatedAt: "2026-09-15T05:50:00Z"
---

The MyBatis Spring Boot integration detects the relevant MyBatis/Spring/JDBC infrastructure, a configured `DataSource`, and application settings, then supplies common beans such as a `SqlSessionFactory`/template and mapper scanning support when the application has not defined its own alternatives.

Mapper calls participate in Spring-managed transaction context through MyBatis-Spring integration rather than by sharing one `SqlSession` manually across threads.

Exact auto-configuration class names/properties depend on starter/version. Debug unexpected behavior with the Boot condition report and the starter's current reference documentation.