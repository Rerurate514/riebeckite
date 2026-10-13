---
title: Locale
sidebar:
  hidden: true
---

# Locale

The language and region identifier a site or page is written for, such as en or ja. The default locale decides which language is served without a URL prefix.

## Default locale and prefixes

| Setting | Effect |
| --- | --- |
| `defaultLang: en` | English is served unprefixed |
| `languages: [en, ja]` | Japanese is served under `/ja/` |

## Per-page language

A page's locale comes from the `lang` frontmatter field or the filename suffix. It determines which URL prefix the page gets.
