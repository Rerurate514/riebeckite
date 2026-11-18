---
date: 2026-10-06
title: Separate content repository
sidebar.label: Separate content repository
aliases:
  - /docs/guides/content-repositories
---
# Separate content repository

This guide explains how to keep articles (Markdown/Obsidian vault) separate from the site (code, configuration, themes) in different repositories.

## What you can do

- Keep articles private while publishing the site publicly
- Share one vault across multiple sites
- Decouple article updates from site deployments
- Manage article and site updates independently

## Suitable scenarios

| Situation | Recommendation |
|---|---|
| You do not want articles public | Separate repositories. A private repository keeps the source repository private, but notes with `publish: true` are still published to the public site. Keep `publish: true` off for private notes, and exclude private folders with `content.exclude`. |
| Articles and site are both fine to publish | Integrated or separate directories. One repository to manage. |
| You want article updates decoupled from site deployments | Separate repositories. Add a repository-dispatch notification if an articles push must start a deploy; an extra checkout alone only supplies files to a deploy that already started. |
| You want one vault shared by several sites | Separate repositories, or a layout where the vault lives independently. Keep the vault in one place and have each site reference it read-only. |

## Page guide

- [Concepts](./separate-content-repository/concepts.md) — Repository separation concepts, terms, and layout judgment
- [Setup](./separate-content-repository/setup.md) — Step-by-step setup integrating content-repositories and repository-split. Unified procedures for secret setup, permission settings, and token issuance.
- [Publishing](./separate-content-repository/publishing.md) — Publication rules and verification. Troubleshooting table referenced from the dedicated troubleshooting page.
- [Troubleshooting](./separate-content-repository/troubleshooting.md) — Unified troubleshooting table covering common issues with repository separation.