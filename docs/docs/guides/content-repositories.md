---
date: 2026-10-06
title: Separating content from the site
---
# Separating content from the site

For **keeping articles (Markdown / an Obsidian vault) separate from the site (code, configuration, themes)** — in different locations or different repositories — this guide explains why you might split them and what the resulting layout looks like. The concrete GitHub Actions automation, including repository dispatch and external checkout, lives in the [in-depth companion](./deployment/separate-content-repository.md).

## In this section

- [Basics](./content-repositories/basics.md)
- [Setup](./content-repositories/setup.md)
- [Publication and troubleshooting](./content-repositories/publishing.md)

## Summary

You do not have to separate repositories from the start.

```text
simple site
  → site + content in one repository

existing vault
  → an external directory is also an option

keep articles private
  → put content in a separate private repository

auto-deploy on content push
  → repository dispatch
```

When you do split repositories, keep these four concerns apart:

```mermaid
flowchart LR
    Read["1. Read content<br/>Checkout"]
    Trigger["2. Start the build<br/>Dispatch"]
    Publish["3. Choose what to publish<br/>publishStrategy / exclude"]
    Assets["4. Publish assets<br/>Prebuild copy"]
```

Separating repositories does not itself change Riebeckite's publication decision.

**The repository boundary, reading content, starting a deploy, and publishing to the site are separate responsibilities.**

## Further reading

- [Separating content and the site (in depth)](./deployment/separate-content-repository.md) — the in-depth companion (root resolution, CI auth, assets, troubleshooting)
- [Configuration](../reference/configuration.md) — root resolution details
- [Usage Guide](./README.md) — external vault examples and assets
- Cloudflare deploy template — deployment workflow details
