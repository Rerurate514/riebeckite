---
title: Language Switcher
sidebar:
  hidden: true
---

# Language Switcher

The control that lets a reader move between the language versions of a page. The l10n plugin publishes it into the article metadata slot when translations exist.

## Where it comes from

The l10n plugin contributes the switcher through the article metadata slot, so the site decides how and where to render it.

## When it appears

It appears only when the current page has at least one [translation](./translation.md). A page with no translated sibling shows no switcher.

## UI customization
The l10n plugin publishes the language switcher into the article metadata slot. The site controls how and where to render it. Default UI renders a styled list of language links, but it can be completely customized or disabled.

```ts
// Disable the built-in switcher, keep metadata only
l10n({ defaultLang: "ja", languages: ["ja", "en"], ui: false });

// Use a different slot for the switcher
l10n({
  defaultLang: "ja",
  languages: ["ja", "en"],
  ui: {
    slot: "article.footer",
    render: ({ localization }) => `<p>Lang: ${localization.lang}</p>`,
  },
});
```

Custom render functions receive a `LanguageSwitcherRenderContext` with the `localizedContent` and can return any HTML string. The slot name determines which metadata slot the switcher is inserted into. Themes can restyle the default component through the `.rr-l10n-switcher` root hook.

## When it appears
It appears only when the current page has at least one [translation](./translation.md). A page with no translated sibling shows no switcher. Only translations that actually exist are candidates; no fallback page is generated for a missing language.

## Related terms
