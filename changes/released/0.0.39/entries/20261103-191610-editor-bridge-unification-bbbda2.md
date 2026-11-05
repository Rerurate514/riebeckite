---
packages:
  - "@riebeckite/dev-inspector"

type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The development Bridge now serves the Obsidian-compatible `/__riebeckite/bridge/v1/page` endpoint from the same source and publication resolution used by `/source`, `/preview`, and `/publication`. Source paths resolve through one shared manifest lookup, every endpoint reports the same Bridge revision, and ambiguous sources are reported instead of being silently treated as missing.
