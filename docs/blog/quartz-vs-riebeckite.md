---
title: Quartz vs. Riebeckite
description: Both turn Obsidian notes into websites, both are open source, and they agree on almost nothing else. A comparison from the biased party, with the bias marked.
date: 2026-11-20
category: Comparisons
author: Rerurate_514
tags:
  - quartz
  - obsidian
  - comparison
---

If you arrived here from a search engine hoping for mineralogy: riebeckite is a sodium-rich amphibole, quartz is the second most abundant mineral in Earth's crust, and no, they do not fracture the same way. This post is about the two software projects that borrowed those names — [Quartz](https://quartz.jzhao.xyz/), the static site generator that turns Obsidian vaults into websites, and [Riebeckite](https://riebeckite.dev), the framework I develop, which does the same job by a different route.

The disclosure is the obvious one: this is the Riebeckite blog. That is precisely why this post spends most of its length on the case *for* Quartz, and on the places where Quartz is the honest answer. I would rather be quoted on this page by a Quartz user than have the comparison read as if someone else wrote it.

## The same problem, handled twice

Both projects take folders of Markdown — Obsidian syntax included — and produce a website with search, graph view, backlinks, wikilinks, callouts, and transclusions. Both are free, both are open source under permissive licenses (Quartz: MIT; Riebeckite: Apache-2.0), and both output plain static files you can put on GitHub Pages, Cloudflare Pages, Vercel, Netlify, or your own server. On that level, the choice is a coin flip.

The difference starts with what the site *is*.

## Configuration vs. code

**Quartz is a generator you configure.** Your content sits inside a Quartz repository. You set up the site by editing its configuration and its plugin layout; you get an enormous feature set — search, graph, backlinks, popover previews, LaTeX, RSS, sitemap, and an Obsidian-flavored parser that even handles Bases and Canvas files as of v5. When the built-in behavior is what you want, this is a small amount of surface area for a lot of site. When it isn't, the path runs through Quartz's own component and extension system: the site's UI is customized through its component model, and running my own Quartz 4 site, I experienced that as Hooks and DOM manipulation for things a web framework would express as ordinary pages. [Version 5.1.0](https://github.com/jackyzha0/quartz/releases) shipped November 2026; the project is mature, with roughly 13,600 stars and the largest community in this space.

**Riebeckite is an application you own.** The site is a plain HonoX + TypeScript project: routes, components, pages — ordinary code in ordinary places. Markdown is one input to that application ([the tagline is "your content, your code, your framework"](https://riebeckite.dev)), and the vault does not have to live inside the site's repository at all — I publish this blog from a content directory outside the app. Roughly seventy npm-installable plugins cover the Obsidian side — wikilinks, embeds, callouts, inline tags, Dataview queries (DQL, not dataviewjs) — plus search, backlinks, local graph, tags, and built-in English/Japanese publishing with hreflang handled automatically. Presets (starter, blog, digital garden, minimal) get you running; after that, adding anything means writing the code for it, not finding a setting.

The short version: Quartz asks "which switches do you want?" and Riebeckite asks "what should this page do?"

![The blog running on Riebeckite](/assets/blog/riebeckite-blog.png)
*This blog, running on Riebeckite (screenshot as of November 2026).*

## The upgrade story

A site generator's real cost is paid over years, and majors are where it shows. Quartz's history is public: v4 was a ground-up rewrite that left v3 sites behind, and when v5 arrived, the configuration model changed under the site — my own v4-to-v5 move was closer to a rebuild than an upgrade, and that experience is the reason Riebeckite exists. Within a major version, `npx quartz update` is genuinely smooth; across major versions, you historically re-setup against the new model, and your accumulated customization is what makes that expensive.

Riebeckite's honest version of the same risk is worse on paper: it is at version 0.1.0, released November 19, 2026, and before 1.0 I consider breaking changes in minor versions normal. If stability is the deciding criterion today, Quartz wins; a project with a decade-shaped roadmap is the safer bet than one released yesterday. The structural difference is that a Riebeckite site is already ordinary app code — there is no generator-specific configuration layer to migrate — but no amount of structure saves you from a young API. I would rather you come back at 1.0 than adopt this with the wrong expectations.

## The same tasks, side by side

- **Publish only some notes.** In Quartz, everything in the repository publishes, so selective publishing becomes a repository-architecture decision (vault in a private repository, plus a public repository or subtree that carries the public slice of it). In Riebeckite, notes carry flags (`private: true`, `draft`) and folders are excluded in configuration, so the vault can stay whole and in place.
- **Build a page that isn't a note.** In Quartz, you write Markdown and fit it to the component slots the generator defines. In Riebeckite, you write a route — this very blog's index page is a few dozen lines of TSX checking a route pattern and a locale, exactly as a HonoX app does it.
- **Publish in two languages.** Quartz ships i18n for interface strings; content translation is your arrangement. Riebeckite's l10n plugin pairs content files by convention, generates hreflang links and a language switcher across the whole site, and leaves untranslated pages unpublished rather than duplicated. For an English/Japanese site like this one, that asymmetry decided a lot.

## Where each one wins

Choose **Quartz** if the goal is a content-first wiki or digital garden and the built-in feature set already covers it; if you want the largest community, the most answered questions, and a project whose upgrade rhythm you accept. This is not a concession paragraph: for the majority of "publish my vault" projects, Quartz is the right tool, and I say that having run it for years.

Choose **Riebeckite** if the notes are feeding something app-shaped — a site with its own pages and components, a documentation system, a bilingual publication — and you would rather write TypeScript than learn a generator's configuration surface; if the vault should stay outside the site's repository, or un-split and un-moved. Be honest with yourself about the trade: a day-old 0.1.0 framework expects you to write code, and it may break things before 1.0.

The cheapest advice I can give: try both for an hour. Quartz's `npx quartz create` and Riebeckite's `npx create-riebeckite` each produce a site in minutes, and the one that feels like *your* project is usually the one that survives the major upgrades to come.

For the wider field — including plugins, hosted platforms, and Obsidian Publish itself — see [Obsidian Publish alternatives, compared honestly](/blog/obsidian-publish-alternatives/), and for the practical free-publishing walkthrough, [how to publish Obsidian notes for free](/blog/publish-obsidian-notes-for-free/).

## Frequently asked questions

### What is the difference between Quartz and Riebeckite?

Quartz is a static site generator you configure: content sits inside a Quartz repository, and the site's behavior is assembled through its configuration and component model. Riebeckite is a HonoX + TypeScript application that Markdown feeds into: routes, components, and pages are ordinary code, and the vault can live outside the site's repository. Both take Obsidian syntax in and put static files out.

### Is Riebeckite free?

Yes — open source under Apache-2.0, with no hosted tier. The current release is 0.1.0, published November 19, 2026, and before 1.0, minor versions may carry breaking changes. If stability is the deciding criterion today, that is a point for Quartz, and I say so in the article above.

### Which one should I pick for a digital garden?

For most vault-publishing projects, Quartz: the mature tool, the largest community, and a built-in feature set that already covers gardens. Riebeckite fits when the site is app-shaped — its own pages and components, bilingual publishing, a vault that stays where it is — and you accept a day-old 0.1.0 framework in exchange.
