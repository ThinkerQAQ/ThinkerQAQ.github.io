---
title: "3.2 DNS"
description: "DNS hierarchy, recursive resolvers, authoritative servers, A/AAAA/CNAME records, caching/TTL, DNS security, encrypted DNS, and traffic steering."
translationOf: "computer-network/应用层/DNS/DNS"
language: "en"
updatedAt: "2026-09-15T05:25:00Z"
---

## 1. What Is DNS?

The Domain Name System is a distributed hierarchical database used to resolve names and publish other service metadata.

Common record types include:

- `A` — IPv4 address;
- `AAAA` — IPv6 address;
- `CNAME` — alias to another canonical name;
- `NS` — authoritative name servers;
- `MX` — mail routing;
- `TXT` — arbitrary text used by many verification/security mechanisms.

DNS is therefore more than a simple `domain → IP` table.

## 2. Typical Resolution Path

For a hostname such as `www.example.com`, an application normally asks a **recursive resolver** configured by the OS/network.

The resolver checks caches first. If it lacks an answer, it performs iterative DNS resolution through the hierarchy as needed:

1. root servers point toward the relevant top-level domain;
2. TLD servers point toward the domain's authoritative servers;
3. the authoritative server returns the requested record or referral/negative answer.

The recursive resolver caches results according to TTL and returns the answer to the client.

`/etc/hosts` and OS/browser/application caches can short-circuit this path before external DNS is queried.

## 3. Recursive vs. Iterative

- **recursive query**: the client asks a resolver to obtain the final answer on its behalf;
- **iterative resolution**: the resolver follows referrals from one authoritative layer to the next.

The original note's picture of the end-user repeatedly querying root/TLD servers is not the usual client behavior; that iterative work is normally performed by the recursive resolver.

## 4. Security and Privacy

Traditional DNS over UDP/TCP does not encrypt the path to the recursive resolver.

Modern options include:

- DNSSEC for authenticated DNS data (integrity/origin, not confidentiality);
- DNS over TLS (DoT);
- DNS over HTTPS (DoH).

Vendor-specific "HTTPDNS" APIs can bypass a local resolver and query a provider over HTTP(S), but this is not the only modern solution to DNS interception or privacy problems.

## 5. Traffic Steering

DNS answers can vary by resolver/client geography, EDNS Client Subnet, health, latency, or policy. CDNs commonly use DNS as one layer of directing clients toward suitable edge locations.