---
packages:
  - "@riebeckite/plugin-reactions"
  - "@riebeckite/plugin-comments"
  - "@riebeckite/reactions-cloudflare"
  - "@riebeckite/comments-cloudflare"
  - "@riebeckite/reactions-github"
  - "@riebeckite/comments-github"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Add `@riebeckite/plugin-reactions` and `@riebeckite/plugin-comments`, two new
plugins that bring Zenn/Qiita-style engagement to published notes. Reactions
renders emoji reaction buttons (👍 ❤️ 🎉 💡 🤔) with counts, and Comments
renders comment threads. Both are backed by pluggable providers with in-memory
defaults, plus production adapters: Cloudflare D1
(`@riebeckite/reactions-cloudflare`, `@riebeckite/comments-cloudflare`) and
GitHub Discussions (`@riebeckite/reactions-github`, `@riebeckite/comments-github`).
