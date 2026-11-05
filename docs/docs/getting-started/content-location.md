---
date: 2026-11-05
title: Content Location
sidebar:
  label: Content Location
  order: 21
---
# Content Location

Riebeckite reads Markdown from one directory. The directory is set by `content.directory` in `riebeckite.config.ts` and is resolved relative to the directory that contains the configuration file.

```ts
export default defineConfig({
  content: { directory: "content" },
});
```

The value may point outside the site directory:

```ts
content: { directory: "../vault" },
```

This is the only setting needed for the separate-directories layout. The content directory is not restricted to the project folder.

## Choosing a location

- **Integrated:** keep `content/` inside the site. This is the default and the simplest option.
- **Separate directories:** put the vault next to the site and set `content.directory` to `../vault`.
- **Separate repositories:** keep the site's `content.directory` at `content`, and let the GitHub Actions workflow check the vault out into that path.

Changing `content.directory` does not move files. Move the Markdown and `assets/` first, then update the setting.

## What belongs in the content directory

- Markdown pages with frontmatter, such as `index.md` and `notes/welcome.md`.
- `assets/` for images and attachments referenced from content.
- Any folder structure you want to keep. URLs follow the file paths without the `.md` extension.

Do not put `package.json`, `src/`, or build output inside the vault. The content directory is only for content.

## Verify the location

```sh
npm exec riebeckite check
npm exec riebeckite build
```

`check` validates the configuration. `build` fails when the configured directory does not exist or contains no publishable pages. Run `npm exec riebeckite doctor` for a diagnosis.

## Official samples

- [Integrated](https://github.com/Rerurate514/riebeckite-e2e-integrated) — [site](https://integrated.riebeckite.dev)
- [Separate directories](https://github.com/Rerurate514/riebeckite-e2e-directories) — [site](https://directories.riebeckite.dev)
- [Separate repositories](https://github.com/Rerurate514/riebeckite-e2e-site) — [site](https://repositories.riebeckite.dev)

## Next

- [Project Structure](./project-structure.md)
- [Integrated Setup](./integrated-setup.md)
- [Separate Directories Setup](./separate-directories-setup.md)
- [Separate Repositories Setup](./separate-repositories-setup.md)
