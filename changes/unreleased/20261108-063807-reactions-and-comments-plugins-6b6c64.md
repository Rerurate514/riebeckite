---
packages:
  - "@riebeckite/plugin-reactions"
  - "@riebeckite/plugin-comments"
  - "@riebeckite/reactions-cloudflare"
  - "@riebeckite/reactions-github"
type: added
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Add `@riebeckite/plugin-reactions` and `@riebeckite/plugin-comments`, two new
plugins that bring Zenn/Qiita-style engagement to published notes. Reactions
renders emoji reaction buttons (👍 ❤️ 🎉 💡 🤔) with counts and is backed by
pluggable providers, plus production adapters for Cloudflare D1
(`@riebeckite/reactions-cloudflare`) and GitHub Discussions
(`@riebeckite/reactions-github`). Comments renders a provider-mounted thread
below articles; its built-in Giscus provider embeds GitHub Discussions, so
posting, sign-in, and moderation stay with GitHub.
