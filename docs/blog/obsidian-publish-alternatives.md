---
title: Obsidian Publish Alternatives, Compared Honestly
description: The tools that publish Obsidian notes to the web — Quartz, Digital Garden, Flowershow, Perlite, Webpage Export, ObsidianHtml and Riebeckite — with maintenance status, licenses, and the trade each one asks for.
date: 2026-11-20
category: Comparisons
author: Rerurate_514
tags:
  - obsidian
  - publishing
  - comparison
---

Search for Obsidian Publish alternatives and you will find the same article several times over: Publish is somehow "expensive," followed by a list of free tools that all sound equally fine. This post is our attempt at the version we wanted to read — and since it runs on the official Riebeckite blog, and Riebeckite is one of the tools in it, every fact below was checked against official pages and release notes on November 20, 2026, and the biases are marked. If you find an error, [tell us](https://github.com/Rerurate514/riebeckite/issues) and we will correct it.

## When Publish is the right answer

Most "alternatives" posts start with the price, so let's start the other way around. Publish at $10 per month ($8 billed yearly) is genuinely the right choice if:

- you never want to create a GitHub, Vercel, or Netlify account, or run a single command;
- password-protected publishing without your own infrastructure matters;
- you want the Obsidian team, not a volunteer maintainer, keeping the lights on;
- your notes are plain Markdown and callouts, and you do not rely on community plugins.

That last point is the real boundary. Per the [official limitations](https://help.obsidian.md/publish/limitations), community plugins mostly do not work on Publish: raw-markdown output survives, plugin-rendered blocks — Dataview first among them — do not, and search and graph are basic. A site is capped at 4 GB with 50 MB per file upload. If those constraints fit, the subscription is cheaper than your hours, and nothing below will save you money — only time you may not want to spend.

## The field, as of November 2026

| Tool | What it is | License | Last release | Selective publishing | Cost |
|---|---|---|---|---|---|
| Obsidian Publish | hosted service | proprietary | current | per-note toggle in the app | $8/mo yearly, $10/mo monthly |
| Quartz | static site generator | MIT | v5.1.0, Nov 2026 | whole-repo, all or nothing | free |
| Digital Garden | plugin + site template | MIT | 2.103.0, Oct 2026 | `dg-publish` flag; linked notes stay private | free |
| Flowershow | hosted platform (AGPL core) | AGPL-3.0 | Nov 2026 | choose notes in the plugin | free plan; $5/mo premium |
| Perlite | self-hosted PHP viewer | MIT | 1.6.4, Oct 2026 | none — the whole vault is served | free |
| Webpage Export | HTML export plugin | MIT | 1.9.2, Jul 2025 | you pick files at export time | free |
| ObsidianHtml | Python converter | GPL-3.0 | v3.5.2, May 2023 | unverified — see below | free |
| Riebeckite | site framework (ours) | Apache-2.0 | 0.1.0, Nov 2026 | per-note flags, folder excludes | free |

### Quartz

The mature default, with the largest community of the free tools (about 13.6k stars) and a November 2026 release. A vault becomes a git repository, a TypeScript configuration, and a build that outputs a full site — search, graph, backlinks, Obsidian syntax including Bases and Canvas as of v5. The trade is developer-shaped: Node 22, config as code, and major versions that have historically demanded real migration work — v3 sites could not upgrade to v4, and our own v4→v5 move was closer to a rebuild. If you want the deepest take on that trade, it is the subject of [Quartz vs. Riebeckite](/blog/quartz-vs-riebeckite/).

### Digital Garden

The easiest selectively-free publishing anywhere: an Obsidian plugin that pushes only notes you flag with `dg-publish: true` to a GitHub repository, with a site template (Eleventy) that deploys on Vercel or Netlify free tiers. Linked notes are never auto-published — privacy by design — and the plugin renders the plugins Publish will not: the README lists Dataview including dataviewjs, Canvas, Bases, and Excalidraw embeds. Actively maintained (release 2.103.0 in October 2026; roughly 2.5k stars). A managed version, [Forestry.md](https://forestry.md), runs as an open beta and skips the GitHub account, with a monthly publish quota noted in its release notes.

### Flowershow

Once "the free alternative" as a Next.js template, now a hosted platform: publish from Obsidian to a free site on a `flowershow.me` subdomain (with an attribution footer); custom domains and further premium features from $5 per month. The open-source core is AGPL-3.0 and self-hostable for teams that want the platform without the hosting. Active as of November 2026. This is the closest free experience to Publish itself — with the same platform dependence that entails.

### Perlite

Not a generator: a PHP application (Docker image available) that serves a vault folder as a website, rendering pages on request — graph, search, tags, Mermaid, LaTeX, Canvas, no build step. That directness is also the limitation: the vault it serves is the site, all of it, and the author's own README tells you to treat it as fully public and to block direct access to the underlying `.md` files. The October 2026 release rebuilt the image against a patched PHP base, which is what good maintenance looks like.

### Webpage Export

The `webpage-html-export` plugin exports single files, canvas pages, or the whole vault to HTML that preserves your Obsidian theme, with search, navigation tree, outline, and graph built into the output; the README claims most plugins' output is supported, Dataview included. No hosting assumptions — plain files, host them anywhere. The honest downsides: an export is not a pipeline (every change is a manual re-export), and the release cadence is slow — the last release is from July 2025. Fits archives better than gardens.

### ObsidianHtml

Listed here only because it still appears in recommendation roundup posts — which is exactly why it belongs in an honest comparison. The last tagged release is v3.5.2 from May 2023, and the repository's last activity dates to mid-2025. If a roundup recommends it without dates, treat the rest of that roundup accordingly. (GPL-3.0, Python, converts notes to Markdown or an HTML site.)

### Riebeckite

Ours, so the constraints first: version 0.1.0, released November 19, 2026 — a day-old project by the standards of this table. Before 1.0, minor versions may carry breaking changes; the community is small; the number of sites running it in the wild is correspondingly small. The idea it sells instead: your site is a plain HonoX/TypeScript application that Markdown feeds into, not a configuration file driving a generator. The vault can live outside the site repository, pages and components are ordinary code, and a plugin set covering roughly seventy capabilities — Obsidian syntax (wikilinks, embeds, callouts, inline tags), Dataview queries (DQL, not dataviewjs), search, backlinks, graph, tags, and full English/Japanese publishing — installs from npm. The full argument for and against is [in its own post](/blog/quartz-vs-riebeckite/).

## The risk nobody prices in: dormancy

Free tools rarely fail on cost. They fail when the maintainer moves on, and the fear is well-founded: the recurring question under every "Publish alternatives" forum thread is what happens if the project stops. ObsidianHtml above is the live example — still recommended, no longer moving. The defenses are boring and effective:

- check the **latest release date** before adopting, not the feature list (features freeze; releases rot);
- check that issues get responses, not just that the repository exists;
- prefer tools whose output you keep — static HTML or Markdown in a repository you own survives the tool's death; hosted platforms and export dialogs do not.

Licenses matter less for hobby use and more as insurance: MIT and Apache-2.0 make a community fork frictionless, which is what "the project died" recovery actually looks like.

## Selective publishing, and the git-history trap

"Publish only some notes" is the second recurring question, and the answer differs more than feature tables suggest:

- **Publish** — you tick notes in the app; nothing about git or files to think about.
- **Digital Garden / Flowershow** — you flag notes; the Digital Garden plugin never auto-publishes linked notes.
- **Quartz (repo-based generators generally)** — everything in the repository is public, so selective publishing becomes a repo-architecture problem. People solve it by keeping the vault in a private repository and publishing to a separate public one — [Tomoya Matsuura writes up the private/public tradeoffs](https://garden.matsuuratomaya.com/Obsidian%E3%81%A8Quartz%E3%81%A7%E9%83%A8%E5%88%86%E7%9A%84%E3%81%AB%E5%85%AC%E9%96%8B%E3%81%97%E3%81%9F%E3%83%A1%E3%83%A2%E3%82%92%E4%BD%9C%E3%82%8B), and [Oliver Falvai](https://oliverfalvai.com/evergreen/my-quartz-+-obsidian-note-publishing-setup) documents a subtree-based setup.
- **Riebeckite** — per-note flags (`private: true`, `draft`) and folder exclusion, with the same git-history caveat if you publish through a repository.
- **Perlite / Webpage Export** — no third party ever holds your notes, but there is no selectivity either: one serves the whole vault, the other exports what you explicitly pick.

The caveat across all repository routes: whatever was once public stays in the git history of the public repository. Decide the boundary before the first publish, not after an accidental one.

## What it comes down to

- Money: Publish costs $96–120 per year; Flowershow's premium starts at $60; everything else costs your time instead.
- Time: a plugin route is an evening; a generator is an evening plus upgrades forever after; a platform is an hour plus dependence; Publish is none of those.
- Risk: hosted means someone else's roadmap; repo-based means your maintenance; dormant-but-recommended (ObsidianHtml) is the outcome the dates column protects you from.

For the practical walkthrough of the free routes, start with [how to publish Obsidian notes for free](/blog/publish-obsidian-notes-for-free/). For the generator question specifically, we wrote [Quartz vs. Riebeckite](/blog/quartz-vs-riebeckite/) — the honest version, since we are the biased party for once.
