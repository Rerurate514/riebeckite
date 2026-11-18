---
packages:
  - "@riebeckite/plugin-navigation"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Sidebar links highlight the current page on localized pages again. The active check strips the language prefix from both the link href and the current path, so pages in non-default languages receive the `rb-sidebar-navigation__link--active` class and `aria-current="page"` as before; collapsed branches under `autoExpandActive` also reopen on load. Single-language sites are unaffected.
