---
packages:
  - "@riebeckite/plugin-reactions"
  - "@riebeckite/plugin-comments"
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
renders comment threads. Both are backed by pluggable providers
(`ReactionsProvider` / `CommentsProvider`) with in-memory defaults, so a site
can start locally and later connect GitHub Discussions, a database, or an edge
function without changing site code.
