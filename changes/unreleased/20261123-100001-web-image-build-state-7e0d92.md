---
packages:
  - "@riebeckite/web"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The website image build now records whole-tree fingerprints of the content and asset directories in `.riebeckite/build-images-state.json` and skips the collection, copy, and orphan-cleanup passes entirely when nothing changed, removing duplicate image work from every repeated dev-server and build start.
