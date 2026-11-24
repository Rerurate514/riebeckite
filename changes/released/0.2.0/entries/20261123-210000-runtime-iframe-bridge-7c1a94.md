---
packages:
  - "@riebeckite/runtime"
type: fixed
breaking: false
migration: ""
pr: ""
issue: ""
adr: ""
---

The sandboxed iframe runtime's guest bridge script lost its sandbox handshake: the bridge document was generated with `export function send` inside a plain script, so the script failed with a syntax error, the guest never answered the init handshake, and every `createIframeRuntime` mount stalled until its start timeout. The bridge is now emitted with a plain function declaration again, so iframe runtimes become ready and respond to invocations.
