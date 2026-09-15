---
title: "1.2 Base64"
description: "Base64 encoding, process, use cases, and comparison with URL encoding."
translationOf: "security/base64"
category: "security"
categoryLabel: "Security"
topic: "security"
topicLabel: "1.Security"
order: 2
tags: ["Security", "Base64"]
updatedAt: "2026-09-15T10:29:00Z"
status: "historical"
language: "en"
featured: false
indexable: true
---

## 1. What Is Base64
Base64 is an encoding scheme that represents binary data using a set of 64 printable characters. It is encoding, not encryption.

## 2. Base64 Process
Base64 groups input bytes into 24-bit blocks, splits each block into four 6-bit values, and maps those values to Base64 characters. Padding with `=` may be used when the input length is not a multiple of three bytes.

## 3. Base64 Use Cases
- Represent binary content in text-only contexts.
- Embed small binary values in formats such as MIME or data URLs.
- Transport values through systems that are safer with printable characters.

## 4. Base64 vs URL Encoding
- Base64 converts bytes into a printable character representation.
- URL encoding percent-encodes characters that have special meaning in URLs.
- Ordinary Base64 contains `+`, `/`, and `=`, while Base64URL uses a URL-safe alphabet.

## 5. References
- [Base64 - Wikipedia](https://en.wikipedia.org/wiki/Base64)
