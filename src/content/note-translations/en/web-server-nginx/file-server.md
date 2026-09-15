---
title: "Nginx as a File Server"
description: "File download serving, directory exposure, ranges, permissions, and access controls."
translationOf: "web-server-nginx/file-server"
language: "en"
updatedAt: "2026-09-15T07:10:00Z"
---

Nginx can serve downloadable files efficiently and supports range requests useful for resumable or media downloads. Configure filesystem permissions, content types, caching, and bandwidth/request limits according to the use case.

Directory listing should be enabled only intentionally. Do not rely on obscurity for private files: enforce authentication/authorization or signed/time-limited access at an appropriate layer.