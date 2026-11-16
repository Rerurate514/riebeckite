---
packages:
  - "@riebeckite/plugin-autocardlink"
type: changed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Link preview cards now keep a fixed height of eight em and limit the image to half of the card width, so cards line up in a list the way Obsidian shows them instead of changing height with the image and description. Cards with an unlimited description grow to fit their text, and narrow containers hide the description below 500px and the image below 300px instead of stacking them.
