---
packages:
  - "@riebeckite/node"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

Content mutations now fail with a clear error when the filesystem does not support hard links, instead of falling back to a rename that could overwrite a file another process created between verification and the write. Filesystems without hard-link support, such as FAT volumes, can no longer apply mutations that create or replace files.
