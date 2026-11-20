---
title: How to Publish Obsidian Notes for Free
description: Obsidian Publish costs $8–10 per month. This post covers the free ways to get notes on the web — what each involves, the real limits of free hosting, and what breaks on the way.
date: 2026-11-20
category: Tutorials
author: Rerurate_514
tags:
  - obsidian
  - publishing
  - tutorial
---

The official way to put Obsidian notes on the web is [Obsidian Publish](https://obsidian.md/publish): $10 per month, or $8 if you pay a year up front. It works, the Obsidian team maintains it, and if you never want to hear the words *Git* or *deploy*, it is a fair price. This post is for everyone else: the free routes, ordered roughly by how little setup each needs, followed by the two parts that introductions tend to skip — the real limits of free hosting, and the things that break on the way from a vault to a website.

One disclosure first: this blog runs on Riebeckite, a framework we develop, and it appears in the list below. The order is setup effort, not preference.

## If you only need to share one note

Sharing is not publishing. When the whole task is "let one person read this note," export it — Obsidian's built-in Markdown or PDF export, or the single-file mode of [Webpage Export](https://github.com/KosmosisDire/obsidian-webpage-export), which produces an HTML file that keeps your theme. Publishing is for notes that should live at a URL, keep growing, and be findable later. The rest of this post assumes that is the goal.

## What the $8–10 actually buys

Publish is one site with hosting included: up to 4 GB per site, a custom domain, customization via CSS and JavaScript, password protection, and priority email support. Readers get hover previews, a graph view, backlinks, and full-text search. Assembled by someone else, maintained by someone else.

Read the [official limitations](https://help.obsidian.md/publish/limitations) before paying, for the sake of one line in particular: community plugins mostly do not work. Raw-markdown output is fine, but plugin-rendered blocks — Dataview above all — do not render, and site search is basic. If your notes are held together by Dataview, paying does not fix that; only a tool that reads your vault does. That constraint alone pushes even happily-paying people toward the free routes.

## The gentlest route: a publishing plugin

[Digital Garden](https://github.com/oleeskild/obsidian-digital-garden) is an Obsidian plugin with the least invasive model here: the vault never leaves your machine. You add a `dg-publish: true` property to a note, press the plugin's publish button, and only the flagged notes go to a GitHub repository. A starter site builds from that repository on the free tiers of Vercel or Netlify — [the docs](https://docs.forestry.md/) walk through the setup, and the standard setup never touches a terminal. [Forestry.md](https://forestry.md), a managed variant of the same idea, skips even the GitHub account (open beta).

Two design decisions stand out. Linked notes are never auto-published: a published note linking to a private one does not drag the private one along. And the plugin supports the community plugins people actually miss on Publish — the README lists Dataview (including dataviewjs), Canvas, Bases, and Excalidraw embeds. The project is active; release 2.103.0 shipped in October 2026.

## The route everyone recommends: Quartz

[Quartz](https://quartz.jzhao.xyz/) is the default free answer by now. It turns a Markdown vault into a full site — search, graph, backlinks, popover previews, LaTeX, RSS, sitemap — and its parser is built around Obsidian syntax: wikilinks, transclusions, callouts, `![alt|300]` image sizes, Mermaid, and since v5 also Bases and Canvas files. [Version 5.1.0](https://github.com/jackyzha0/quartz/releases) arrived in November 2026, and the project is very much alive.

What you accept in exchange is that it is a developer tool. Content lives inside a Quartz repository, configuration is TypeScript, Node 22 is required, and hosting is left to you — GitHub Pages, Cloudflare Pages, Vercel, and Netlify are all documented paths. Within a major version, `npx quartz update` is genuinely smooth. Across major versions it has historically demanded real work: v4 was a rewrite that stranded v3 sites, and our own v4-to-v5 move ended up closer to a rebuild than an upgrade — we go into that in [Quartz vs. Riebeckite](/blog/quartz-vs-riebeckite/), because it is the honest cost of a config-driven generator.

## No repository, no build: Flowershow's free plan

The closest free thing to Publish itself is [Flowershow](https://flowershow.app/): a hosted platform you publish to straight from Obsidian — or by drag and drop, or from a CLI. The free plan is one site on a `flowershow.me` subdomain with an attribution footer; custom domains arrive with the premium tier at $5 per month. Obsidian support is real (wikilinks, Canvas, Bases, Mermaid, LaTeX, graph, backlinks), the project is active, and the AGPL-licensed core can be self-hosted if you outgrow hosting.

The trade is the one Publish has, minus the price: someone else's platform, whose free tier can change. For an experimental garden that is fine. For a site that is meant to last years, keep it in a repository you own.

## If you already run a server: Perlite

[Perlite](https://github.com/secure-77/Perlite) inverts the problem: instead of converting a vault into a site, it serves the vault as it lies. It is a PHP application you place next to the vault folder — Docker image included — and it renders on request: graph, search, tags, Mermaid, LaTeX, Canvas, no build step. An October 2026 release rebuilt the image on a patched PHP base, which says good things about the maintenance.

What you give up is selectivity — the vault it points at is the website, all of it. The author's README is blunt about treating it as fully public and about blocking direct access to the `.md` files. With a vault that is public anyway, on hardware you control, nothing here is more direct.

## No generator: exporting the vault as HTML

[Webpage Export](https://github.com/KosmosisDire/obsidian-webpage-export), the `webpage-html-export` plugin, exports single files, canvas pages, or the whole vault to plain HTML that keeps your Obsidian theme — with search, a navigation tree, a document outline, and a graph built in. Output is ordinary files: host them anywhere, or open them directly. The README claims most plugins' output is supported, Dataview included.

The limit is structural: an export is not a pipeline. Every change means exporting again, by hand, and the plugin's release cadence is slow (the last release dates to July 2025). This fits archives and rarely-changing sites better than a garden you tend weekly.

## What free really costs: host limits

Free stays free while the traffic fits the tier, so here are the documented numbers. GitHub Pages caps a published site at 1 GB and serves 100 GB of bandwidth per month as a soft limit, with at most 10 builds per hour. The hobby tiers of Vercel, Netlify, and Cloudflare Pages are built around personal sites; their limits move, but a notes site sits far below them. Publish, for comparison, includes 4 GB per site.

Text barely counts: at roughly 10 KB per note, a thousand notes are ten megabytes. Attachments are what count. Three hundred screenshots at half a megabyte each is 150 MB; years of photos land in gigabytes; audio and PDF go past that. Most personal sites fit with room to spare — but if a vault is backup-shaped rather than garden-shaped, do this arithmetic before choosing a host.

## What breaks between vault and web

Three recurring breakage points — all cheap to fix before publishing, all annoying after:

- **`obsidian://` links.** URIs that open notes inside the Obsidian app mean nothing in a browser. Every tool above converts wikilinks; notes full of literal `obsidian://` references need a manual pass to become regular links.
- **Attachment resolution.** Whether an image reference survives depends on where the file actually sits — wiki-style embeds and vault-wide attachment folders resolve differently across tools. Publish one note with one image first and check it, before migrating anything at scale.
- **Plugin-rendered blocks.** Publish does not render Dataview; among generators and exporters, support and fidelity vary. If a note's meaning lives in a Dataview block, test that note in every tool on your shortlist, not just one.

And one boundary to draw deliberately: what leaves the vault. The plugin approach never pushes an unflagged note, but whatever once was published stays in the public repository's history. Decide the line before publishing, not after.

## So which one?

- No terminal, ideally no GitHub — Digital Garden, or Flowershow, or Forestry.md.
- A content-first wiki, and TypeScript is fine — Quartz.
- The site should be yours down to its pages and components — Riebeckite, ours; the honest version of that pitch is in [Quartz vs. Riebeckite](/blog/quartz-vs-riebeckite/).
- A fully public vault on your own server — Perlite.
- An archive more than a garden — Webpage Export.
- Reading this list was tiring — Obsidian Publish. $8–10 is a fair price for never doing any of the above.

If you want the same landscape as a tool-by-tool comparison — including maintenance status, because the realistic risk of free tools is not the price but dormancy — continue to [Obsidian Publish alternatives](/blog/obsidian-publish-alternatives/).

## Frequently asked questions

### Is there a free way to publish Obsidian notes?

Yes, but not through the official service. Obsidian Publish is $10 per month ($8 billed yearly); the free routes all go through community tools — Digital Garden, Quartz, Flowershow, Perlite, or Webpage Export. The list above is ordered by setup effort, so your route is the first one whose trade you accept.

### Is free hosting actually enough for a notes site?

Usually, yes. GitHub Pages allows a 1 GB site with 100 GB of monthly bandwidth as a soft limit, and text is tiny — a thousand notes is roughly 10 MB. Attachments are what count: a few hundred screenshots, or years of photos, are worth a round of arithmetic before you choose a host.

### Does Obsidian Publish render Dataview?

No. Per the official limitations, community plugins mostly do not work on Publish, and plugin-rendered blocks — Dataview first — do not render. If your notes depend on Dataview, publishing means a tool that reads the vault: the Digital Garden plugin lists Dataview (including dataviewjs) support in its README, and Riebeckite renders Dataview queries (DQL, not dataviewjs).

### What breaks when a vault goes to the web?

Three things, repeatedly: literal `obsidian://` links, which mean nothing in a browser (every tool above converts wikilinks instead); attachment resolution, which depends on where the file actually sits; and plugin-rendered blocks, which vary by tool. Publish one small note with one image first and check.
