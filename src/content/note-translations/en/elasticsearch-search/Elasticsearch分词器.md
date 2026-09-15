---
title: "Elasticsearch Analyzers"
description: "Character filters, tokenizers, token filters, index/search analyzers, and why analysis is part of the search schema."
translationOf: "elasticsearch-search/Elasticsearch分词器"
language: "en"
updatedAt: "2026-09-15T06:05:00Z"
---

An analyzer converts text into searchable tokens through a pipeline commonly composed of character filters, a tokenizer, and token filters.

Index-time and search-time analysis must be compatible with the intended matching semantics. Language-specific tokenization, lowercasing, stemming, synonyms, n-grams, and normalization can dramatically change recall/precision and index size.

Treat analyzer configuration as part of the index schema. Changing analysis for existing data generally requires reindexing into a new mapping/index generation.