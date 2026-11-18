---
packages:
  - "@riebeckite/plugin-alias"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Aliases now work on localized sites and can claim the URL of a private note. Previously the conflict check compared raw alias paths across every language, so an English and a Japanese note declaring the same alias cancelled each other and only one redirect survived; unpublished notes also reserved their canonical URLs and silently blocked legit aliases. The plugin now orders itself after the `l10n` plugin when present, compares aliases in the final per-locale URL space, and skips ownership reservation for notes marked `private: true`, so localized sites emit one redirect per language and private URLs can be taken over.
