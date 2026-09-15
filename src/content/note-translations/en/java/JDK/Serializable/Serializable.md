---
title: "Java Serializable"
description: "Java native serialization, serialVersionUID, compatibility, security risks, and modern alternatives for service/data formats."
translationOf: "java/JDK/Serializable/Serializable"
language: "en"
updatedAt: "2026-09-15T05:00:00Z"
---

`Serializable` is a marker interface for Java's native object-serialization mechanism. `serialVersionUID` participates in compatibility checks between serialized form and class definition.

Native Java serialization can encode object graphs, but its format couples data closely to Java classes and has a long history of security risk when deserializing untrusted data.

For APIs, durable storage, and cross-language systems, prefer an explicit schema/data format such as JSON, Protobuf, Avro, or another protocol chosen for the contract. Never treat untrusted native serialized input as harmless.