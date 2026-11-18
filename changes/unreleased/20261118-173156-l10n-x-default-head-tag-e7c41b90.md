---
packages:
  - "@riebeckite/plugin-l10n"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Localized sites now emit a `hreflang="x-default"` alternate pointing at the default-language page for every translation group with more than one language. The default-language URL is the canonical entry point for search engines and language-blind visitors.
