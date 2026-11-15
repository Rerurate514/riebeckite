---
packages:
  - "@riebeckite/plugin-attachment"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Text attachments such as `.txt`, `.log`, and `.json` are embedded as an escaped code block preview with the file name, format, size, and download link below it. The new `preview` option selects which extensions preview, and files over 256 KiB, binary files, and invalid UTF-8 keep the existing attachment card.
