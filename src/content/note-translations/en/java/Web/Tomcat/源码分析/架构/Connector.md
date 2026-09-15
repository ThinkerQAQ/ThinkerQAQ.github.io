---
title: "Tomcat Connector"
description: "The Tomcat connector boundary between network/protocol handling and the servlet container request pipeline."
translationOf: "java/Web/Tomcat/源码分析/架构/Connector"
language: "en"
updatedAt: "2026-09-15T05:20:00Z"
---

A Tomcat Connector handles the network/protocol-facing side of request processing. It accepts connections/requests, parses protocol data into container request/response abstractions, and passes them into the container pipeline.

Connector configuration controls concerns such as port/protocol, TLS, connection/request limits, timeouts, proxy-related attributes, and execution resources depending on version/configuration.

Keep connector capacity aligned with application/downstream capacity; accepting more concurrent work than the service can process only moves overload into queues and latency.