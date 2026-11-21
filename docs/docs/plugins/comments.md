---
date: 2026-10-07
title: Comments
---
# Comments

Comment threads for published notes, backed by a pluggable provider. The built-in
Giscus provider embeds GitHub Discussions with
[Giscus](https://giscus.app): readers sign in with GitHub to comment, and GitHub
owns storage, moderation, and notifications. Pair with
[Reactions](./reactions.md) for a Zenn/Qiita-style split between lightweight
reactions and full comments.

[日本語](./comments.ja.md)

## What it does

- Embeds a provider thread wherever the Site places `CommentsSection` or `ArticleCommentsSection`.
- Keeps the plugin independent of the comment backend: a provider supplies the
  browser initializer and its configuration.
- With Giscus, maps each page to a GitHub Discussion by URL, so notes need no
  extra frontmatter, and leaves posting, sign-in, spam handling, and moderation
  to GitHub Discussions.

## Quick start

```sh
npm install @riebeckite/plugin-comments
```

```ts
import { defineConfig } from "@riebeckite/core";
import { comments, giscus } from "@riebeckite/plugin-comments";

export default defineConfig({
  plugins: [
    comments({
      provider: giscus({
        repo: "owner/repo",
        repoId: "R_kgDO...",
        category: "Comments",
        categoryId: "DIC_kwDO...",
      }),
    }),
  ],
});
```

## Providers

`comments()` renders the section and registers one client entry; the provider
decides what is embedded and which browser module mounts it.

```ts
export type CommentsProvider = {
  name: string;
  client: { moduleSpecifier: string; exportName: string };
  publicConfig: JsonValue;
  validateOptions?: () => readonly ConfigValidationIssue[];
};
```

`client.moduleSpecifier` and `client.exportName` name a browser module that
exports an initializer, and `publicConfig` is passed to it as is. The initializer
receives that configuration and fills every `[data-rr-comments-thread]` element
that lacks `data-rr-comments-mounted`, setting the attribute before it appends
its markup. This keeps the plugin itself provider-agnostic:

```ts
import type {
  CommentsInitializer,
  CommentsProvider,
} from "@riebeckite/plugin-comments";

export function utterances(repo: string): CommentsProvider {
  return {
    name: "utterances",
    client: {
      moduleSpecifier: "example-comments/client",
      exportName: "initUtterances",
    },
    publicConfig: { repo, theme: "preferred-color-scheme" },
  };
}

export const initUtterances: CommentsInitializer<{ repo: string; theme: string }> = (
  config,
) => {
  for (const thread of document.querySelectorAll<HTMLElement>(
    "[data-rr-comments-thread]",
  )) {
    if (thread.hasAttribute("data-rr-comments-mounted")) continue;
    thread.setAttribute("data-rr-comments-mounted", "true");
    const script = document.createElement("script");
    script.src = "https://utteranc.es/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.repo = config.repo;
    script.dataset.theme = config.theme;
    thread.append(script);
  }
};
```

The provider client module must be resolvable from the Site build, for example
by publishing it from the same package that exports the provider.

`giscus()` is the built-in provider. It needs a public GitHub repository with
Discussions enabled:

1. Enable Discussions in the repository settings.
2. Install the [giscus app](https://github.com/apps/giscus) on the repository.
3. Create a discussion category for comments. An Announcements category keeps
   new discussions limited to maintainers, so readers comment instead of
   opening threads.
4. Fill in the repository on [giscus.app](https://giscus.app) and copy the
   generated `data-repo-id` and `data-category-id`.

## Options

`comments()`:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `provider` | `CommentsProvider` | required | Provider that embeds and mounts the thread. |
| `className` | `string` | `"rr-comments"` | Root CSS class of the rendered section. |

`giscus()`:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `repo` | `string` | required | Repository in `owner/name` form. |
| `repoId` | `string` | required | Repository ID from giscus.app. |
| `category` | `string` | required | Discussion category name. |
| `categoryId` | `string` | required | Discussion category ID from giscus.app. |
| `mapping` | `"pathname" \| "url" \| "title" \| "og:title"` | `"pathname"` | How a page maps to a discussion. |
| `strict` | `boolean` | `false` | Match the discussion by the exact mapping value. |
| `reactionsEnabled` | `boolean` | `true` | Show GitHub reactions on the discussion. |
| `inputPosition` | `"top" \| "bottom"` | `"bottom"` | Where the comment box sits. |
| `theme` | `string` | `"preferred_color_scheme"` | Giscus theme name or URL. |
| `lang` | `string` | `"en"` | Giscus UI language. |

## Rendering

The Site owns JSX placement. Place `ArticleCommentsSection` below the article:

```tsx
import { ArticleCommentsSection } from "@riebeckite/plugin-comments";

<ArticleCommentsSection />;
```

`ArticleCommentsSection` resolves the plugin options from the Site config and
renders an empty section; the provider thread loads in the browser. It renders
nothing when the plugin is not configured. Pass `className` to override the
configured value for one placement.

The section is client-side only, so built HTML contains no comments and readers
need JavaScript. If your server sends Content-Security-Policy headers, allow
`https://giscus.app` in both `script-src` and `frame-src`.

Giscus `theme` is fixed per build. `preferred_color_scheme` follows the
operating system, not the Site's color-mode toggle; set an explicit theme name
to match the Site.

## Related

- [Reactions](./reactions.md) for lightweight emoji reactions
- [Webmention](./webmention.md) for cross-site mentions
- [Plugin catalog](./README.md)
