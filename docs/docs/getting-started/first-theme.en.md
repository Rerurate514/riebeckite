# Change Your Theme

Themes control how your Riebeckite site looks — colors, typography, spacing, and layout. This guide walks through switching to the **minimal** theme, a clean, content-first design.

> Want to add features instead? See [Add Your First Plugin](./first-plugin.en.md).

---

## 1. Install

In your generated site directory:

```sh
npm install @riebeckite/theme-minimal
```

---

## 2. Import

Open `riebeckite.config.ts` and add the import at the top:

```ts
import { minimalTheme } from "@riebeckite/theme-minimal";
```

---

## 3. Change the Theme

Find the `theme` line in your config and replace `defaultTheme()` with `minimalTheme()`:

```ts
theme: minimalTheme(),
```

---

## 4. Start Riebeckite

Restart the dev server to see the new theme:

```sh
npm exec riebeckite dev
```

Open your site — the appearance has changed to the minimal theme.

---

## 5. Next Steps

- Browse other themes in the [Themes reference](../themes/README.en.md)
- Try `@riebeckite/theme-tokyonight` for a dark, colorful theme
- Try `@riebeckite/theme-sakura` for a light, elegant theme
- Learn to [write your own theme](../themes/writing-a-theme.en.md)