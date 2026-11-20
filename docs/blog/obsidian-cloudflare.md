---
title: How to Publish Obsidian Notes to Cloudflare
description: A guide to publishing an Obsidian vault to Cloudflare Pages and Workers for free. Covers the official November 2026 guidance, the actual free-tier numbers, a comparison with GitHub Pages, and how Riebeckite configures it.
date: 2026-11-21
category: Tutorials
author: Rerurate_514
tags:
  - obsidian
  - publishing
  - cloudflare
  - tutorial
---

Full disclosure first: this blog runs on Riebeckite, the framework I develop, and it is hosted on Cloudflare. That does not make this a pitch for my tools, though. It is a roundup on Cloudflare as of November 2026, and every number here comes from official documentation. If I got something wrong, tell me on GitHub and I will fix it.

## How far does Cloudflare's free tier go?

Earlier I wrote about the routes for publishing Obsidian notes for free:

[/blog/publish-obsidian-notes-for-free/](/blog/publish-obsidian-notes-for-free/)

That one used GitHub Pages as the example host, because that's where most tutorials stop. But there is another option that almost no Japanese tutorial touches at all: Cloudflare. Of the Quartz walkthroughs I found, every single one ended at GitHub Pages or Netlify. That gap is why this post exists.

One thing up front. Publishing an Obsidian vault to Cloudflare really means "build your notes into a static site, then put the result on Cloudflare". The output directory is `public/` for Quartz, `dist/` for Riebeckite. Everything else in this article is about where that output goes.

## Cloudflare in 2026: Pages and Workers

Here is the thing you should know first. Cloudflare has two relevant products, Pages and Workers, and as of November 2026 the official recommendation for new projects is Workers. The Pages documentation now opens with an unusually pointed notice:

> Are you sure you want to use Pages? Workers supports most Pages use cases and offers a broader feature set. It is Cloudflare's primary platform for building applications. Start new projects with Workers.

[developers.cloudflare.com/pages/ (as of November 2026)](https://developers.cloudflare.com/pages/)

![The current notice on the Cloudflare Pages documentation](/assets/blog/cloudflare-pages-notice.png)
*(screenshot as of November 2026)*

This does not mean Pages is dead. The Pages docs are still maintained (last updated August 2026), and there is an official migration guide from Pages to Workers. For putting a static site somewhere, Pages still works fine today. The official position is just that the *recommended* starting point has moved to Workers. This article covers both.

## Your vault as a static site

Before the hosting details, the one prerequisite: your notes need to come out as a static site. Every route in my earlier article produces a folder of HTML — Quartz outputs `public/`, Riebeckite outputs `dist/`, Flowershow and the others do the equivalent. Cloudflare takes that folder and serves it. Nothing about your vault changes on the way.

## Pages' free tier, the actual numbers

Everything in this list is from the official limits page (updated November 19, 2026):

- **500 builds per month** on the free plan. One concurrent build, and a build times out after 20 minutes.
- **20,000 files per project** on the free plan (100,000 on paid).
- **25 MiB max per file**.
- **100 custom domains** per project.
- **100 projects** per account.
- Deployments are kept for **30 days** (the most recent 100 are kept indefinitely).

Bandwidth needs careful wording. The old "Pages has unlimited bandwidth" claim you may remember from older articles is not on the current docs anymore — the old FAQ page is gone. The closest current first-party statement is on the Workers pricing page (updated November 18, 2026): requests to static assets are free and unlimited, and there are no additional charges for data transfer (egress) or throughput (bandwidth). In practice: a site that just sits there and gets read does not get billed by traffic. As with everything on this page, check the current numbers before you rely on them.

## Compared to GitHub Pages

The natural question: how does this stack up against GitHub Pages?

GitHub Pages' current documented limits: a published site should be **1 GB or less** (phrased as a "recommended limit"), a **soft bandwidth limit of 100 GB per month**, and a **soft limit of 10 builds per hour** (builds run by custom GitHub Actions workflows are exempt).

| | GitHub Pages (free) | Cloudflare Pages (free) |
|---|---|---|
| Site size | 1 GB recommended limit | 20,000 files / 25 MiB per file |
| Bandwidth | 100 GB/month soft limit | Static asset requests free and unlimited (Workers pricing, Nov 2026) |
| Builds | 10 per hour, soft | 500/month, one at a time, 20 min each |
| Account | Tied to your GitHub account | Standalone Cloudflare account |

The rough summary: if your vault is full of photos, Cloudflare's model (limits on file *count* and per-file *size*) is easier to predict than GitHub Pages' size and bandwidth caps. If you want push-to-deploy and nothing else to think about, GitHub Pages' workflow is still excellent. But there is a way to get that same "push and done" experience on Cloudflare — next section.

## The two ways to deploy

**Git integration.** You connect a GitHub repository to a Pages project; every push triggers a build and deploy on Cloudflare's side. You specify the build command and output directory — for Quartz, that's `npx quartz build` with `public` as the output directory.

**Direct Upload.** You build locally and upload the output. From the CLI:

```text
npx wrangler login
npx wrangler pages project create <PROJECT_NAME>
npx wrangler pages deploy <BUILD_OUTPUT_DIRECTORY>
```

That's from the official Direct Upload guide. The project ends up at `<PROJECT_NAME>.pages.dev`. Dashboard drag-and-drop also works, but uploads are capped at 1,000 files per upload (20,000 via wrangler).

One warning worth its own paragraph: **a project created as Direct Upload cannot be switched to Git integration later.** The official docs are explicit about this. The other direction works — you can `wrangler pages deploy` into a Git-integrated project manually. If you want to keep the option open, start with Git integration.

## If you use Riebeckite

Last, my own tool — not to sell it, but because its defaults are part of this story.

Riebeckite's scaffolder (`npx create-riebeckite`) maps the "Cloudflare" deploy option to **Workers**, following the official recommendation I quoted above. Under the hood there are two providers: `provider: "cloudflare-workers"` runs `wrangler deploy`, and `provider: "cloudflare-pages"` runs `wrangler pages deploy`.

This blog itself runs on Pages (`provider: "cloudflare-pages"`) — for a purely static site it's fine, and switching later is a one-line config change either way.

## FAQ

### How much does it cost per month to publish Obsidian notes on Cloudflare?

$0 to start. Pages' free tier gives you 500 builds a month, 20,000 files, 25 MiB per file, and requests to static assets are free and unlimited (Workers pricing, as of November 2026). You would move to a paid plan (Workers paid starts at $5/month) only if you outgrow these or want Workers' broader features.

### GitHub Pages or Cloudflare — which should I use?

If your vault is image-heavy and you worry about bandwidth, Cloudflare's static-asset requests are free and unlimited while GitHub Pages has a 100 GB/month soft limit. If you want the simplest possible "push and it's live" workflow, GitHub Pages is still great. Both are free, so trying each for an hour beats reading any comparison, including this one.

### Is Cloudflare Pages deprecated?

No, but Cloudflare's center of gravity has moved to Workers. The Pages docs (November 2026) recommend starting new projects on Workers, yet Pages itself still works and is maintained, and there is an official Pages-to-Workers migration guide. For static sites, Pages remains practical today.

### How does Riebeckite configure Cloudflare deploys?

`npx create-riebeckite` maps the Cloudflare option to Workers by default (`provider: "cloudflare-workers"`). Setting `provider: "cloudflare-pages"` in the config switches to `wrangler pages deploy`. The build output is `dist/` either way.

## Wrapping up

The wider comparison of free publishing routes — Quartz, Digital Garden, Flowershow, Perlite and the rest — is in a separate post:

[/blog/obsidian-publish-alternatives/](/blog/obsidian-publish-alternatives/)

My guess for why Cloudflare rarely shows up in tutorials: it simply isn't where the existing walkthroughs point. But the numbers above are the numbers, and they hold up well for a notes site.
