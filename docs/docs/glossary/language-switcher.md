---
date: 2026-10-14
title: Language Switcher
sidebar:
  hidden: true
---

# Language Switcher

The control that lets a reader move between language versions of a page. `l10n` exports the component and its data helper.

## Where it comes from

`<LanguageSwitcher />` is a server-rendered component exported by `@riebeckite/plugin-l10n`. Render it where the site wants; with `SiteProvider` and an `Article` carrying its public `entry`, it resolves `getLocalization(manifest, slug)` itself.

## When it appears

It appears only when the current page has at least one [translation](./translation.md). A page with no translated sibling shows no switcher. Only translations that actually exist are candidates; no fallback page is generated for a missing language.

## UI customization

The default renders a styled list of language links; the site can replace it with its own component or pass explicit data.

```tsx
import { LanguageSwitcher, getLocalization } from "@riebeckite/plugin-l10n";

const localization = getLocalization(manifest, entry.slug);
<LanguageSwitcher localization={localization} />;
```

Themes restyle the default through `.rr-l10n-switcher`.

## Related terms
