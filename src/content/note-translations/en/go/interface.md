---
title: "Go Interfaces"
description: "Implicit interface satisfaction, dynamic type/value pairs, nil subtleties, and API design."
translationOf: "go/interface"
language: "en"
updatedAt: "2026-09-15T07:30:00Z"
---

A Go interface describes a method set; concrete types satisfy it implicitly. An interface value carries a dynamic type and value, so an interface containing a typed nil pointer is not itself a nil interface.

Define small interfaces at the point of use when they represent a meaningful capability. Accepting interfaces can decouple clients; returning concrete types often preserves more functionality. Avoid `interface{}`/`any` when static type information is available.