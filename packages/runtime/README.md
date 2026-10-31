# @riebeckite/runtime

Typed lifecycle contracts for interactive browser runtimes.

[日本語](./README_ja.md)

## Installation

```sh
pnpm add @riebeckite/runtime
```

## Usage

Define a runtime once, register it, and create instances per mount scope. The
core entry has no DOM or browser globals.

```ts
import { defineInteractiveRuntime, InteractiveRuntimeRegistry } from "@riebeckite/runtime";

const calculator = defineInteractiveRuntime({
  id: "calculator",
  kind: "main",
  capabilities: ["dom"],
  create: () => ({
    start: async () => {},
    invoke: (input: { left: number; right: number }) => input.left + input.right,
    stop: () => {},
  }),
});

const registry = new InteractiveRuntimeRegistry();
registry.register(calculator);

const runtime = registry.create("calculator", { root: element });
await runtime.mount();
const total = await runtime.invoke({ left: 2, right: 3 });
await runtime.dispose();
```

An instance moves through `created`, `starting`, `ready`, `running`,
`stopping`, `disposed`, and `failed`. `mount()` is idempotent while starting and
ready, `dispose()` is idempotent, and a failed instance is not reusable. Aborting
the instance signal disposes it.

## Adapters

The `@riebeckite/runtime/client` entry provides browser adapters:

- `createMainRuntime` runs trusted code on the page and mounts into an opaque
  root. It is not a sandbox.
- `createWorkerRuntime` runs a module worker with a typed request/response
  protocol, cancellation, timeouts, transferable values, crash handling, and a
  process-wide worker budget.
- `createWasmWorkerRuntime` loads a same-origin WASM asset inside a worker.
- `createIframeRuntime` hosts untrusted markup in a sandboxed `srcdoc` iframe
  with a default-deny CSP, handshake, session validation, and an explicit
  capability list.

The worker side of an adapter uses `serveWorkerRuntime` or
`serveWasmWorkerRuntime` from `@riebeckite/runtime/worker`.

## Security

- Workers and WASM are not security sandboxes. Isolation comes from origin and
  CSP policy, not from the execution kind.
- The iframe adapter requires `allow-scripts`, refuses `allow-same-origin` and
  unknown sandbox tokens, and validates message source, origin, protocol,
  session, and schema before accepting a message.
- Payload size and concurrency limits reject oversized or excessive requests.

## Limitations

The runtime package does not provide a UI framework, a scheduler, or automatic
server-side rendering. Hosts must call `dispose()` from their page or
application lifecycle, and must serve WASM assets with a compatible content type
and CSP.
