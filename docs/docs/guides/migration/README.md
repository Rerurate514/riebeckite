---
title: Migration Guides
sidebar:
  label: Migration Guides
  order: 100
---
# Migration Guides

Choose the platform you are leaving. These guides are evidence-based planning documents, not automatic converters. Difficulty reflects the verified amount of source-specific runtime, template, layout, and extension work—not a claim that every site is equally complex.

| Platform | Best fit | Content migration | Theme/layout migration | Primary constraint |
| --- | --- | --- | --- | --- |
| [Quartz](./from-quartz.md) | digital garden with Markdown content | Low–Medium | Medium | Quartz configuration and component layouts are not portable; rebuild them as Riebeckite plugins, theme CSS, or HonoX app code. |
| [Obsidian Publish](./from-obsidian-publish.md) | an Obsidian vault whose published notes can become a self-hosted site | Low–Medium | Medium | Publish hosting, site settings, and sharing controls have no export-compatible Riebeckite equivalent; configure hosting and public-note selection yourself. |
| [VitePress](./from-vitepress.md) | Markdown documentation sites that can adopt a content-first static site | Medium | Medium–High | VitePress theme APIs, Vue components, and Vite plugins are not executable in Riebeckite. |
| [Docusaurus](./from-docusaurus.md) | single-version documentation or content sites | Medium | Medium–High | React/MDX components, generated IDs, and Docusaurus versioning must be rebuilt or retained separately. |
| [MkDocs](./from-mkdocs.md) | Markdown documentation that does not depend on Python theme behavior | Medium | Medium–High | Python plugins, Jinja theme overrides, and Material-specific syntax require a manual replacement. |
| [GitBook](./from-gitbook.md) | GitBook spaces whose source Markdown is available in Git | Medium | Medium–High | Hosted editing, permissions, integrations, and GitBook-specific blocks cannot be exported as Riebeckite behavior. |
| [Hugo](./from-hugo.md) | Markdown-first static sites whose content can be separated from Go templates | Medium | Medium–High | Go templates, shortcodes, Hugo Pipes, and taxonomies are not drop-in compatible. |
| [Jekyll](./from-jekyll.md) | Markdown posts and pages with limited Liquid dependence | Medium | Medium–High | Liquid, Ruby plugins, collection output rules, and GitHub Pages behavior require manual redesign. |
| [Eleventy (11ty)](./from-eleventy.md) | content-driven sites with Markdown content independent of JavaScript templates | Medium | Medium–High | Nunjucks/Liquid/JavaScript templates, computed data, and arbitrary data fetching are not portable. |
| [Hexo](./from-hexo.md) | Markdown blogs with conventional posts, pages, and static assets | Medium | Medium–High | EJS/Pug/Swig themes, Hexo generators, and deployment plugins need manual replacement. |
| [Zola](./from-zola.md) | Markdown content sites that can give up Tera template behavior | Medium | Medium–High | Tera templates, shortcodes, Sass processing, and section pagination are not compatible. |
| [Astro](./from-astro.md) | mostly static Markdown sites without Astro component or server-runtime requirements | High | Medium–High | Astro components, integrations, content schemas, server endpoints, and islands require a HonoX/manual implementation. |
| [Gatsby](./from-gatsby.md) | static Markdown content that does not rely on GraphQL-driven application behavior | High | Medium–High | GraphQL queries, React templates, source plugins, and client runtime behavior are not portable. |
| [Next.js static export](./from-nextjs.md) | fully static Markdown-led sites; not general Next.js applications | High | Medium–High | Server Actions, API routes, middleware, ISR, image optimization, and dynamic server rendering cannot migrate to a static Riebeckite site. |

## Shared safety rules

1. Back up the repository, assets, and URL inventory.
2. Scaffold into a new directory; never overwrite the source project.
3. Move Markdown first, then explicitly rebuild behavior.
4. Preserve URLs with the documented Permalink plugin and verify redirects after deployment.
5. Treat application runtimes, templates, hosted-service settings, and unverified extensions as manual work.

All guides use Riebeckite's documented `create-riebeckite`, `check`, `doctor`, `build`, and `inspect` commands. They do not claim an end-to-end migration has been run against external production projects.

## Riebeckite migration building blocks

- [Writing content](../writing-content.md)
- [Publishing Obsidian notes](../obsidian.md)
- [Configuration](../../reference/configuration.md)
- [CLI reference](../../reference/cli.md)
- [Docs plugin](../../plugins/docs.md)
- [Permalink plugin](../../plugins/permalink.md)
- [SEO plugin](../../plugins/seo.md)
- [Deployment](../deployment/README.md)
