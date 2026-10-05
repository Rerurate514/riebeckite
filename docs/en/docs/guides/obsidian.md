# Publishing Obsidian notes

This guide shows how to use Markdown notes from an Obsidian vault as the content for a Riebeckite site.

## The basic idea

Riebeckite turns Markdown files from a configured folder into a site. An Obsidian vault is also a Markdown folder, so you can point `content.directory` at the vault.

You do not have to rebuild an existing vault for Riebeckite. Riebeckite reads Markdown from the configured folder; it does not rewrite your notes as part of normal `dev`, `check`, `doctor`, `inspect`, or `build` commands. Keep using Obsidian as your editor, and opt in only the notes you want to publish.

Each note decides whether it is published through frontmatter.

```md
---
title: Published note
publish: true
---
```

Notes without `publish: true` are not published by the default explicit publish strategy. This lets you keep private notes and public articles in the same vault.

## Pattern A: Put the vault inside the site

This is the simplest setup. Open the generated site's `content/` folder as an Obsidian vault.

```text
my-site/
|- content/        <- open this folder in Obsidian
|- riebeckite.config.ts
`- package.json
```

The default configuration works for this pattern.

```ts
content: {
  directory: "content",
},
```

Use this pattern first if you only want to try Riebeckite.

## Pattern B: Keep the vault and site in separate folders

If you already have an Obsidian vault, place the site next to it.

```text
workspace/
|- notes/      <- existing Obsidian vault
`- my-site/    <- Riebeckite site
```

In `my-site/riebeckite.config.ts`, point `content.directory` at the vault.

```ts
content: {
  directory: "../notes",
},
```

`../notes` means "the `notes` folder one level above the site". For more advanced separation, see [Separating content from the site](./content-repositories.md).

This pattern is safe for an existing vault as long as you understand the publish rule: only notes with `publish: true` become public by default. Riebeckite reads the vault during preview and build; it does not reorganize the vault or edit Markdown files for you.

## Writing notes in Obsidian

For a note you want to publish, add at least these frontmatter fields.

```md
---
title: Article title
publish: true
---
```

Write the body as normal Markdown.

```md
# Heading

Write the article body here.

You can link to [[another note]].
```

The file name becomes part of the URL. For example, `content/my-note.md` becomes `/my-note`. Non-English file names can work, but short lowercase English names are easier to share as URLs.

## Images and attachments

Keep images and attachments inside the vault.

```md
![Photo](/images/photo.jpg)
```

If you use an Obsidian attachments folder, keep that folder inside the vault. Files outside the vault may not be found during the build.

## Duplicate names and ambiguous links

Riebeckite resolves `[[links]]` against note paths, aliases, and attachment names. When two notes, two aliases, or two attachments share the same name, a bare name cannot identify one target. Riebeckite never guesses: the link stays unresolved and `doctor` reports it as ambiguous.

```text
x/dup.md
y/dup.md
```

```md
[[dup]]     <- ambiguous
[[x/dup]]   <- explicit, resolves to x/dup.md
```

Add the folder to the link, or rename one of the files, so every published link points at exactly one target.

## Keeping private notes private

Do not add `publish: true` to private notes.

```md
---
title: Private note
---
```

The private note itself will not be published. Avoid linking from public articles to private notes, and run `doctor` before publishing.

```sh
npm exec riebeckite doctor
```

## Check before publishing

```sh
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite build
```

`check` validates configuration, `doctor` inspects content and links, and `build` writes the publishable files.

## Next steps

- [Writing content](./writing-content.md)
- [Separating content from the site](./content-repositories.md)
- [Content System](../framework/content-system.md)
