---
title: Quick Start
sidebar:
  label: Quick Start
  order: 10
---
# Quick Start

This is the shortest path from an empty folder to a working Riebeckite site. You do not need to know the framework internals first.

## 1. Create the site

```sh
npx create-riebeckite my-site
cd my-site
npm install
```

`create-riebeckite` uses the `starter` preset by default. When it succeeds, it prints `Created a starter Riebeckite site in my-site` and a short "Next steps" list. `npm install` installs the generated site's packages.

The generated site is a single-repository project:

```text
my-site/
├─ content/
├─ app/
├─ riebeckite.config.ts
└─ package.json
```

## 2. Start the local preview

```sh
npm exec riebeckite dev
```

The development server is started by the generated HonoX/Vite app. Open the local URL printed in your terminal, for example a `localhost` URL. If the generated Riebeckite site appears in the browser, this step is working.

Keep the command running while you edit. Press `Ctrl + C` when you want to stop it.

## 3. Edit Markdown

Open the `content/` folder. The `starter` preset already includes sample Markdown, including:

- `content/index.en.md`
- `content/guide.en.md`
- `content/examples.en.md`
- `content/notes/planning.md`
- `content/notes/writing.md`

You can edit one of those files instead of creating a new one. Save the file and refresh the browser, or follow the app's live reload behavior.

To create a new page, add `content/first-post.md`:

```md
---
title: First post
publish: true
---

Hello from Riebeckite.
```

`publish: true` is important. By default, Riebeckite only publishes Markdown files that opt in with this frontmatter field.

When this succeeds, the page is available from the local site. For example, `content/first-post.md` is served at `/first-post`, and `content/index.en.md` contributes to the home page for English content.

## 4. Build the site

```sh
npm exec riebeckite build
```

A successful build writes the publishable static output to `dist/`. This is the folder you deploy.

## If something does not appear

First check the basics:

- Is the dev server still running?
- Did you save the Markdown file?
- Does the file have `publish: true` in frontmatter?
- Are you opening the URL printed by the terminal?

For deeper troubleshooting, use `check`, `doctor`, and `inspect` from the [CLI reference](../reference/cli.md). They are useful diagnostic tools, but they are not required for the first run.

## Next

- [First Content](./first-content.md) — write and preview content more deliberately
- [Presets](./presets.md) — compare `starter`, `minimal`, `showcase`, and `empty`
- [Deployment](./deployment.md) — publish the built site
