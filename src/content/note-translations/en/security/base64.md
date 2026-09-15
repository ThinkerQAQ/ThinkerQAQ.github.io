---
title: "2.1 Base64"
description: "How Base64 encoding works, where it is useful, and how it differs from encryption and URL encoding."
translationOf: "security/base64"
language: "en"
updatedAt: "2026-09-15T02:00:00Z"
---
## 1. What Base64 Is

Base64 is a **binary-to-text encoding** that represents an arbitrary byte sequence using a restricted set of ASCII characters.

> Base64 is not encryption and provides no confidentiality. Anyone can decode it.

## 2. Encoding Process

1. Split input into groups of 3 bytes, or 24 bits.
2. Split those 24 bits into four 6-bit groups.
3. Use each 6-bit value as an index into the Base64 alphabet.
4. If the input length is not a multiple of 3, standard Base64 commonly uses `=` padding.

## 3. Common Uses

- Carrying binary data through protocols or formats that safely transport text.
- MIME email attachments.
- Data URLs and other text representations.

Base64 increases the encoded size by roughly one third, so it is not a good default representation for large binary objects.

## 4. Base64 vs. URL Encoding

They solve different problems:

- Base64 converts arbitrary bytes into text.
- URL percent-encoding represents bytes that have special meaning or cannot safely appear directly in a URL as `%HH`.

URL-safe Base64 replaces `+` and `/` with `-` and `_`, but it is still only an encoding.
