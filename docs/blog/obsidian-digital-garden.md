---
title: "Obsidian as a Digital Garden: Why the Tool Fits the Practice"
description: What a digital garden actually is, where the idea came from, and how Obsidian's features map onto it — plus how each publishing tool handles selective sharing.
date: 2026-11-21
category: Tutorials
author: Rerurate_514
tags:
  - obsidian
  - publishing
  - tutorial
  - digital-garden
---

Disclosure first: this blog runs on Riebeckite, a framework I develop, and Riebeckite ships a digital-garden preset. The tools below are ordered by how little setup they need, not by how much I like them.

## What a digital garden actually is

The definition most people mean comes from Maggie Appleton's [A Brief History & Ethos of the Digital Garden](https://maggieappleton.com/garden-history): "a collection of evolving ideas that aren't strictly organised by their publication date... inherently exploratory — notes are linked through contextual associations." The opposite of a blog's reverse-chronological feed. You tend notes over months; a blog post is a plant you harvest once.

Appleton's essay names six traits: topography over timelines, continuous growth, imperfection and learning in public, playfulness and personal experimentation, intercropping diverse content, and independent ownership. The last one matters more than it sounds — gardens hosted on someone else's platform have a way of dying when the platform does.

Notes carry growth labels: **Seedling** (🌱, an early idea), **Budding** (🌿, growing), **Evergreen** (🌳, "reasonably complete though I still tend these over time" — Appleton's words). A planted date and a last-tended date. None of this is required; it's a vocabulary, not a spec.

## Where the idea came from

The first recorded use of the term is Mark Bernstein's 1998 "Hypertext Gardens." The conceptual origin is Mike Caufield's 2015 piece "The Garden and the Stream" — as Appleton puts it, if anyone should be considered the original source of digital gardening, it's Caufield. Tom Critchlow (2018) and Joel Hooks (2019, "My blog is a digital garden, not a blog") popularized the practice. The wiki world was tending gardens long before: c2 wiki described its cleanup volunteers as WikiGardeners and WikiGnomes.

## Why Obsidian fits

Three features do most of the work:

- **Wikilinks as a first-class citizen.** A garden lives or dies on associations between notes; `[[note]]` is that, as a keystroke.
- **Local, plain Markdown files.** Independent ownership means your notes shouldn't be locked in someone's database. A folder of `.md` files is the most durable form your ideas can take.
- **Graph and backlinks.** They make the garden visible to you while writing — which clusters exist, which notes are orphaned.

## How each tool handles selective sharing

This is where gardens differ from blogs: you publish a *subset* of your vault, and that subset changes over time. I compared the major options in detail before; here is the garden-specific view:

- **[Obsidian Publish](https://obsidian.md/publish)** — note-by-note toggle, but $10/month ($8 billed yearly) and limits on community plugins.
- **Digital Garden plugin** ([oleeskild](https://github.com/oleeskild/obsidian-digital-garden)) — set `dg-publish: true` in frontmatter. Design center: publish the garden floor, not the whole vault.
- **Flowershow** — you pick notes from the plugin and publish to their hosting (free tier is a `flowershow.me` subdomain; custom domains are $5/month).
- **Quartz** ([jzhao](https://github.com/jackyzha0/quartz)) — repository-shaped: publish the repo, keep the vault separate. v5.1.0 as of 2026-11.
- **Perlite** ([secure-77](https://github.com/secure-77/Perlite)) — serves the whole vault from a directory. Great for a garden you *do* want fully public; the README is explicit that you should block direct access to `.md` and `metadata.json`, and it isn't built for partial publishing.
- **Riebeckite** — my framework, so constraints first: `private: true` or draft per note, DQL supported and `dataviewjs` not, a [digital-garden preset](/docs/), and like Quartz it's a repository-shaped publish.

## A living, public garden

Hirokazu Nishio's [mem.nhiro.org](https://mem.nhiro.org/) is one of the best-known public knowledge gardens in Japanese. To be precise about it (as the site itself says): it's a customized view of his Scrapbox ([scrapbox.io/nishio](https://scrapbox.io/nishio)), with English translations.

![Nishio's garden: mem.nhiro.org](/assets/blog/digital-garden-nishio.png)
*(screenshot as of November 2026)*

## Start small: a four-step first garden

A structured walkthrough of any of these routes is in [the free-publishing guide](/blog/publish-obsidian-notes-for-free/). The garden-shaped version:

1. Pick 3–5 notes you're willing to show unfinished.
2. Choose a tool based on **which notes** you want public (not on features) — that's the column most beginners skip.
3. Publish. Label everything Seedling. Nobody resents a seedling.
4. Once a month, re-read and re-link. Tending the graph is the actual gardening. If a note stood still for six months, that's data, not failure.

## Frequently asked questions

### What is a digital garden?
A public collection of notes organized by links and context rather than publication date, where notes carry visible grow-state. Appleton's definition: "a collection of evolving ideas that aren't strictly organised by their publication date."

### Is Obsidian good for digital gardening?
Yes — local Markdown files, wikilinks, and the graph make the three core garden mechanics (ownership, association, visible topography) native operations. The publishing side needs Obsidian Publish or a separate tool.

### What's the difference between a digital garden and a blog?
Order and lifecycle. A blog is a feed of finished posts, newest first. A garden is a space of linked notes you tend over time. You can graft a garden onto a blog — many people run both.

### Can I publish only some notes?
In every tool above, with different mechanics: a frontmatter flag (Digital Garden, Riebeckite's `private`), plugin-side selection (Flowershow, Obsidian Publish), or repository separation (Quartz). Perlite is the exception — it assumes the whole vault is public.

---

Which tool to *choose* is a longer conversation: the [alternatives comparison](/blog/obsidian-publish-alternatives/) covers all of these, and [Quartz vs Riebeckite](/blog/quartz-vs-riebeckite/) goes deep on the repository-shaped pair.
