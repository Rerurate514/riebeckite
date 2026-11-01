---
date: 2026-11-01
title: Interactive Runtime
---

# Interactive Runtime

The Interactive Runtime provides one lifecycle and invocation contract for
browser work that runs on the main thread, in a Web Worker, in a WebAssembly
worker, or inside a sandboxed iframe. The core contract lives in
`@riebeckite/runtime`, the browser adapters live in
`@riebeckite/runtime/client`, and worker-side host code lives in
`@riebeckite/runtime/worker`.

The runtime is optional. Pages that do not mount a runtime do not download its
adapter, worker, WASM asset, or iframe bridge.

## Architecture

```text
Plugin client entry
        │
        ▼
ClientLifecycle (page or app scope)
        │  mount / unmount
        ▼
ClientRuntimeHost ── InteractiveRuntimeRegistry
        │
        ▼
InteractiveRuntime instance (state, signal, limits, errors)
        │
        ├── main adapter      → trusted DOM code
        ├── worker adapter    → module worker + typed protocol
        ├── wasm adapter      → worker + WebAssembly module
        └── iframe adapter    → sandboxed srcdoc guest
```

`@riebeckite/runtime` does not import HonoX, Vite, or browser globals. The
HonoX integration imports the client entry only when a page contains a plugin
marker, and the plugin declares its runtime modules through `runtimeEntries`.

## Lifecycle

An instance moves through `created`, `starting`, `ready`, `running`,
`stopping`, `disposed`, and `failed`.

- `mount()` starts the driver. Calling it again while starting returns the same
  promise; calling it when ready resolves immediately.
- `invoke()` is accepted only in `ready` or `running`, up to the concurrency
  limit.
- `dispose()` is idempotent, aborts in-flight work, and waits for `stop()`.
- Aborting the instance signal disposes the instance.
- A start failure or a fatal runtime failure is terminal. Create a new instance
  instead of reusing a failed one.
- Ordinary invocation errors keep the instance reusable.

The page or application scope owns the instance. HonoX pages pass a
`ClientRuntimeHost` into `ClientInitializerContext.runtimes`; when the page
unmounts, the host disposes every instance it created. An application-scope
runtime remains owned by the application lifecycle.

## Core API

```ts
import {
  defineInteractiveRuntime,
  InteractiveRuntimeRegistry,
} from "@riebeckite/runtime";

const double = defineInteractiveRuntime<{ value: number }, number>({
  id: "double",
  kind: "main",
  capabilities: ["dom"],
  create: () => ({
    start: () => {},
    invoke: (input) => input.value * 2,
    stop: () => {},
  }),
});

const registry = new InteractiveRuntimeRegistry();
registry.register(double);

const instance = registry.create<{ value: number }, number>("double");
await instance.mount();
const result = await instance.invoke({ value: 21 });
await instance.dispose();
```

A definition declares `id`, `kind`, `capabilities`, optional `limits`, and a
`create(context)` factory. The factory receives `instanceId`, `signal`,
resolved `limits`, and the opaque `root` supplied by the host.

Limits default to 4 MiB input, 16 MiB output, 16 concurrent invocations, no
invocation timeout, and a 15 second start timeout. Adapters may set stricter
timeouts.

## Main thread adapter

`createMainRuntime({ id, capabilities, start, invoke, stop })` runs trusted
first-party code against a DOM root. It is appropriate for small official
widgets. It is not an isolation boundary for untrusted code.

The calculator plugin is the reference usage. Its client entry creates one
runtime per code block, renders into the block, and leaves the server result as
the no-JavaScript fallback.

## Worker adapter

`createWorkerRuntime` creates one module worker per instance and speaks a typed
protocol with request IDs. It supports concurrent requests, transferable input
and output, cancellation, timeouts, crash detection, and termination.

```ts
import { createWorkerRuntime } from "@riebeckite/runtime/client";

const runtime = createWorkerRuntime<{ value: number }, number>({
  id: "double-worker",
  createWorker: () =>
    new Worker(new URL("./double.worker.js", import.meta.url), {
      type: "module",
    }),
});
```

The worker entry uses `serveWorkerRuntime(self, { invoke })`. At most eight
worker runtimes may be active in one document. A terminating instance rejects
its pending promises with `RuntimeAbortError` instead of leaving them pending.

Workers do not automatically lose network access. Origin, CORS, and Content
Security Policy determine what a worker can reach.

## WASM worker adapter

`createWasmWorkerRuntime({ wasmUrl, exportName, createWorker })` runs a worker
that loads a same-origin WASM asset with `serveWasmWorkerRuntime(self)`.
Streaming compilation is used when the response has `application/wasm`; an
`ArrayBuffer` fallback handles servers that omit the content type.

WASM load failures, missing exports, and traps become `RuntimeWasmError`.
`RuntimeWasmError.trap` distinguishes a trap from initialization failure.
WebAssembly is not a security sandbox for untrusted code.

## Sandboxed iframe adapter

`createIframeRuntime({ html, title, sandbox, expectedOrigin, capabilities })`
hosts markup in a `srcdoc` iframe. The default sandbox is `allow-scripts` only.
The adapter refuses `allow-same-origin` and unknown sandbox tokens, and applies
a default-deny CSP that permits inline scripts and styles but no network
connections, forms, or top navigation.

Messages are accepted only when the source window, origin, protocol version,
session ID, message kind, and request ID match the live instance. Malformed or
foreign messages are ignored. A navigation after the handshake fails the
instance. At most four iframe runtimes may be active in one document.

For opaque sandboxed content the expected origin is `"null"`. Do not combine
`allow-scripts` and `allow-same-origin` for same-origin untrusted content.
Because `"null"` is not a valid `targetOrigin`, the parent posts to opaque
guests with `"*"`; the source-window and session checks still gate every
accepted message.

## Plugin integration

A plugin declares runtime modules on its client entry:

```ts
import { createClientEntry, createRuntimeEntry } from "@riebeckite/core";

createClientEntry(
  "example",
  "@riebeckite/plugin-example/client",
  "initExample",
  undefined,
  "page",
  "context",
  "[data-example]",
  [
    createRuntimeEntry(
      "example",
      "@riebeckite/plugin-example/client-runtime",
      "createExampleRuntime",
    ),
  ],
);
```

The HonoX client module imports the runtime module lazily through a static
`import()` expression, registers the definition, and passes a host in
`context.runtimes`. The client entry itself is loaded only when the page
matches `presenceSelector`. Disabled plugins emit no client code.

Runtime modules receive no build-time plugin options unless they are explicitly
declared as JSON `options`; plugin options are not copied into the client
bundle automatically.

## SSR and SSG

No worker, WASM module, or iframe starts before `mount()`, and `mount()` is only
called from a client initializer. Server rendering therefore never starts a
runtime.

Render a static fallback and enhance it on the client:

```html
<div data-runtime-fallback-root>
  <p data-runtime-loading hidden>Loading…</p>
  <p data-runtime-fallback>Static result</p>
  <p data-runtime-error role="alert" hidden></p>
</div>
```

`createRuntimeFallback(root)` switches those elements between loading, ready,
and error states and maintains `aria-busy`. It throws when no DOM exists, so it
must only be called from a client initializer. Without JavaScript the fallback
remains visible.

The public content view is unchanged by the runtime. Draft and scheduled
content never enters the client bundle because client entries contain only
plugin identifiers and explicitly public configuration.

## SPA navigation

The runtime uses the existing `ClientLifecycle` and SPA transaction. Before a
page commits, the page scope is unmounted and all worker, WASM, iframe, main
thread, timer, and listener resources are released. After the commit the new
page's initializers create fresh instances for the new DOM.

Returning to a page creates a new instance. Nothing from the previous page is
reused across the navigation boundary.

## Browser support

- Module workers are required for the worker and WASM adapters.
- WebAssembly is required for the WASM adapter. Unsupported browsers receive
  `RuntimeUnsupportedError`.
- `srcdoc`, sandboxed iframes, and `postMessage` are required for the iframe
  adapter.
- The main thread adapter requires a DOM.

Hosts should present a fallback when a capability is unavailable rather than
assuming every browser supports every adapter.

## Performance

Measurements from the repository browser fixture and production documentation
build on Windows with Chrome headless shell 155:

| Measurement | Result |
| --- | --- |
| Main thread mount | under 1 ms |
| Worker startup | under 10 ms |
| Worker roundtrip (30 requests) | under 1 ms average |
| WASM startup | under 10 ms |
| Iframe startup | under 5 ms |
| Runtime disposal | under 1 ms |
| SPA navigation with calculator remount | under 100 ms |
| Heap growth after 30 mount/dispose cycles | about 18 KB |
| Main client bundle | 108 KB (35 KB gzip) |
| Lazy calculator runtime chunk | 3 KB (1.2 KB gzip) |

These numbers are environment-specific. Bundle size and startup are checked by
the runtime performance test; the worker and iframe budgets are enforced by
unit and browser tests.

## Limitations

- The runtime is not a general-purpose sandbox for arbitrary scripts. Use the
  iframe adapter and an appropriate origin/CSP policy for untrusted content.
- There is no scheduler, priority queue, or automatic CPU budgeting.
- Worker and iframe concurrency limits are per document, not per tab.
- The WASM adapter expects a single exported function per runtime instance.
- The calculator example evaluates arithmetic only. It is not a JavaScript
  evaluator.
- Host termination is authoritative. A guest `dispose` handler runs only if the
  worker or iframe processes the disposal message before termination.
- A worker crash with no in-flight request surfaces on the next invocation.
- Browser E2E depends on a locally installed Chrome or Chromium.

## Examples

- [Calculator plugin](../plugins/calculator.md) — official plugin using the
  main thread adapter, static fallback, lazy runtime loading, and SPA cleanup.
- [SPA runtime internals](./spa-runtime.md) — navigation transaction and
  lifecycle constraints.
- [HonoX integration](./honox-integration.md) — client module generation and
  application boundaries.
