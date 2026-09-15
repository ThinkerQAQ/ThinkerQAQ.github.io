---
title: "How an Executable Spring Boot Jar Starts"
description: "Executable Boot archive layout, launcher/class-loader concept, nested dependencies, and why exact launcher classes are version-specific."
translationOf: "java/Framework/SpringBoot/jar包启动原理/Spring Boot Jar启动原理"
language: "en"
updatedAt: "2026-09-15T05:50:00Z"
---

A Spring Boot executable archive packages application classes plus dependencies in a layout understood by Boot's launcher support. The manifest identifies launcher/application entry information, and Boot's loader infrastructure makes nested library contents visible to the application class path without requiring users to unpack them manually.

This is different from a plain JAR whose dependency JARs are not automatically nested-classpath entries.

Exact archive directories, launcher class names, and class-loader implementation have evolved. When debugging startup/class loading, inspect the archive and loader implementation for the deployed Boot version.