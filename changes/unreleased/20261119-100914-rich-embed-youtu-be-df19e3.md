---
packages:
  - "@riebeckite/plugin-rich-embed"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

`richEmbed()` again renders `youtu.be` short links. The provider allow-list was missing the `youtu.be` host, so those URLs were reported as unsupported and stayed as plain code blocks even though the README lists them as supported.
