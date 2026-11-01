---
date: 2026-11-01
title: Interactive Runtime
---

# Interactive Runtime

Interactive Runtime is the plugin-facing foundation for running code in the
browser on an otherwise static Riebeckite site. It gives a plugin one lifecycle —
mount, invoke, dispose — whether the work runs on the main thread, in a Web
Worker, in a WebAssembly worker, or inside a sandboxed iframe.

It is **not** a feature that site visitors turn on, and it does not make Markdown
interactive by itself. Writing JavaScript in a Markdown file does not execute it.
A plugin must ship a client entry and a runtime definition, and the runtime loads
only on pages that contain the plugin's marker. The runtime provides the execution
contract; the plugin provides the widget, its inputs, and its rendering.

It exists because static HTML has no server to compute on demand. Doing browser
work ad hoc in every plugin leads to leaked workers, broken SPA navigation,
inconsistent size and timeout limits, and unsafe handling of untrusted markup.
The runtime standardizes those parts so plugin authors can focus on the widget.

## What you can do

As a plugin author, you choose an execution environment. The runtime supplies the
lifecycle, limits, errors, fallback hooks, and cleanup; you supply the code and
the UI.

| Use case | Adapter | What the plugin implements |
| --- | --- | --- |
| Small official widget, trusted DOM code | Main thread | `start`, `invoke`, `stop` against a DOM root |
| CPU-heavy calculation off the main thread | Worker | A module worker and its request handler |
| Compiled or ported code | WASM worker | A same-origin `.wasm` asset and one exported function |
| Untrusted markup or a third-party demo | Sandboxed iframe | Guest HTML and message handling |

The runtime does not create widgets automatically. A calculator, chart, editor, or
data explorer is a plugin built on top of it. The only runtime consumer shipped in
this repository is the [Calculator plugin](../plugins/calculator.md).

## Live demo

This page runs the real Calculator plugin through the Interactive Runtime. The
server rendered the value first; the browser then mounted the runtime and
evaluated the same expression again:

```calc
2 * (3 + 4)
```

The result is `14` with or without JavaScript. The difference is where it comes
from: the static HTML contains the server result, and the runtime replaces it with
the live result after mounting. If the runtime fails, the static value stays
visible.

This demo is honest about its limits: **it is not an input-driven calculator**.
The expression is fixed at build time, and the plugin has no input handling. An
input-driven demo would need a new first-party plugin; adding one is outside this
documentation change. The demo shows the real lifecycle and fallback contract, not
a new execution base.

The `calc` block is transformed at build time by the Calculator plugin's remark
step. It is not arbitrary JavaScript. The plugin's parser accepts numbers, `+`,
`-`, `*`, `/`, unary signs, parentheses, and whitespace, and never uses `eval` or
`new Function`.

## Quick start for plugin authors

A runtime definition is a plain object with an ID, a kind, capabilities, and a
factory. This example runs on the main thread:

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

A real plugin declares the runtime module on its client entry:

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
`context.runtimes`. The client entry itself is loaded only when the page matches
`presenceSelector`. Disabled plugins emit no client code.

For the full package scaffold, see [[plugin-system|Plugin System]] and
[Writing a Plugin](../plugins/writing-a-plugin.md).

## How it works

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

`@riebeckite/runtime` does not import HonoX, Vite, or browser globals. The HonoX
integration imports the client entry only when a page contains a plugin marker,
and the plugin declares its runtime modules through `runtimeEntries`.

The runtime is optional. Pages that do not mount a runtime do not download its
adapter, worker, WASM asset, or iframe bridge.

### Lifecycle

An instance moves through `created`, `starting`, `ready`, `running`, `stopping`,
`disposed`, and `failed`.

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

### Core API

A definition declares `id`, `kind`, `capabilities`, optional `limits`, and a
`create(context)` factory. The factory receives `instanceId`, `signal`, resolved
`limits`, and the opaque `root` supplied by the host. Duplicate or empty IDs and
duplicate capabilities are rejected.
`createInteractiveRuntime(definition, options)` creates an instance without a
registry, and `registry.create(id, options)` does the same after a lookup.

Limits default to 4 MiB input, 16 MiB output, 16 concurrent invocations, no
invocation timeout, and a 15 second start timeout. Adapters may set stricter
timeouts: the worker adapter defaults to a 30 second invocation timeout and the
iframe adapter to 10 seconds.

`invoke(input, options)` accepts an optional `signal`, `timeoutMs`, `capability`,
and `transfer` list. `timeoutMs` overrides the instance limit for that call;
`capability` rejects the invocation when the runtime does not declare it.
`onStateChange(listener)` returns an unsubscribe function. Instances expose `id`,
`instanceId`, `kind`, `capabilities`, `state`, and `signal`.

## Relationship to other features

- [[plugin-system|Plugin System]] owns the client entry, presence selector, and
  runtime entry declaration. The runtime is one part of a plugin, not a separate
  app.
- [Calculator](../plugins/calculator.md) is the reference consumer. It uses the
  main thread adapter, the static fallback contract, lazy runtime loading, and
  SPA cleanup.
- [[spa-runtime|SPA runtime internals]] describes the navigation transaction that
  disposes page-scope instances.
- [[honox-integration|HonoX integration]] describes client module generation and
  application boundaries.
- Markdown is not an execution surface. A fenced block such as `calc` becomes
  interactive only because a plugin's build-time transform emits the plugin's
  markup, and that plugin ships a client entry. The runtime never scans Markdown
  for scripts.

## Limitations

- The runtime is not a general-purpose sandbox for arbitrary scripts. Use the
  iframe adapter and an appropriate origin/CSP policy for untrusted content.
- It provides execution plumbing, not widgets. Each plugin implements its own UI,
  inputs, and result rendering.
- There is no scheduler, priority queue, or automatic CPU budgeting.
- Worker and iframe concurrency limits are per document, not per tab.
- The WASM adapter expects a single exported function per runtime instance.
- The calculator example evaluates arithmetic only. It is not a JavaScript
  evaluator.
- Host termination is authoritative. A guest `dispose` handler runs only if the
  worker or iframe processes the disposal message before termination.
- A worker crash with no in-flight request surfaces on the next invocation.
- Browser E2E depends on a locally installed Chrome or Chromium.

## Adapters

### Main thread adapter

`createMainRuntime({ id, capabilities, start, invoke, stop })` runs trusted
first-party code against a DOM root. It is appropriate for small official
widgets. It is not an isolation boundary for untrusted code.

The calculator plugin is the reference usage. Its client entry creates one
runtime per code block, renders into the block, and leaves the server result as
the no-JavaScript fallback.

### Worker adapter

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

### WASM worker adapter

`createWasmWorkerRuntime({ wasmUrl, exportName, createWorker })` runs a worker
that loads a same-origin WASM asset with `serveWasmWorkerRuntime(self)`.
Streaming compilation is used when the response has `application/wasm`; an
`ArrayBuffer` fallback handles servers that omit the content type.

WASM load failures, missing exports, and traps become `RuntimeWasmError`.
`RuntimeWasmError.trap` distinguishes a trap from initialization failure.
WebAssembly is not a security sandbox for untrusted code.

### Sandboxed iframe adapter

`createIframeRuntime({ html, title, sandbox, expectedOrigin, capabilities })`
hosts markup in a `srcdoc` iframe. The default sandbox is `allow-scripts` only.
The adapter accepts `allow-scripts` and `allow-forms`, refuses `allow-same-origin`
and unknown sandbox tokens, and applies a default-deny CSP that permits inline
scripts and styles but no network connections, forms, or top navigation.

Messages are accepted only when the source window, origin, protocol version,
session ID, message kind, and request ID match the live instance. Malformed or
foreign messages are ignored. A navigation after the handshake fails the
instance. At most four iframe runtimes may be active in one document.

For opaque sandboxed content the expected origin is `"null"`. Do not combine
`allow-scripts` and `allow-same-origin` for same-origin untrusted content.
Because `"null"` is not a valid `targetOrigin`, the parent posts to opaque
guests with `"*"`; the source-window and session checks still gate every
accepted message.

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

The public content view is unchanged by the runtime. Draft and scheduled content
never enters the client bundle because client entries contain only plugin
identifiers and explicitly public configuration.

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

## Error handling

```ts
import {
  RuntimeAbortError,
  RuntimeConcurrencyError,
  RuntimeFailureError,
  RuntimeIframeError,
  RuntimePayloadError,
  RuntimeStateError,
  RuntimeTimeoutError,
  RuntimeUnsupportedError,
  RuntimeWasmError,
  RuntimeWorkerError,
} from "@riebeckite/runtime";
```

| Error | When it is raised |
| --- | --- |
| `RuntimeStateError` | Invalid state transition, duplicate registration, or missing runtime |
| `RuntimeFailureError` | Terminal start or runtime failure |
| `RuntimeAbortError` | Instance or invocation signal aborted |
| `RuntimeTimeoutError` | Start or invocation exceeded its timeout |
| `RuntimePayloadError` | Input or output exceeded its byte limit |
| `RuntimeConcurrencyError` | More than `maxConcurrent` invocations are active |
| `RuntimeWorkerError` | Worker crash, protocol error, or remote failure |
| `RuntimeWasmError` | WASM load failure, missing export, or trap (`trap` is true) |
| `RuntimeIframeError` | Sandbox validation, handshake, navigation, or remote failure |
| `RuntimeUnsupportedError` | The browser lacks a required capability |

Ordinary invocation errors leave the instance reusable. A start failure or fatal
runtime failure is terminal; create a new instance. A terminating instance rejects
pending invocations instead of leaving them pending. `onError` on
`RuntimeInstanceOptions` receives the error and phase (`start`, `invoke`, `stop`,
`state-change`).

## Security model

- The main-thread adapter executes trusted first-party code in the page. It is
  not an isolation boundary.
- Workers isolate the global scope, not the network. Origin, CORS, and CSP still
  determine what a worker can fetch.
- WebAssembly is not a sandbox. The WASM adapter isolates execution in a worker
  but trusts the module code.
- The iframe adapter is the only adapter intended for untrusted markup. It
  accepts only `allow-scripts` and `allow-forms`, rejects `allow-same-origin` and
  unknown tokens, and applies a default-deny CSP with no network, forms, or top
  navigation.
- Iframe messages must match the source window, origin, protocol version,
  session ID, message kind, and request ID. A post-handshake navigation fails the
  instance.
- Runtime code never receives build-time plugin options unless they are declared
  as JSON `options`. Draft and scheduled content never enters the client bundle.
- Host termination is authoritative. A guest cleanup handler runs only if its
  disposal message is processed before termination.

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
the runtime performance test; the worker and iframe budgets are enforced by unit
and browser tests.

## Troubleshooting

- **Nothing mounts**: the plugin client entry is loaded only when the page
  matches `presenceSelector`, and `mount()` is only called from a client
  initializer. Check the marker and the initializer.
- **Worker fails before the first result**: module workers are required. Confirm
  the worker URL is same-origin and served with a JavaScript MIME type.
- **`RuntimeUnsupportedError`**: the browser lacks module workers, WebAssembly,
  or `srcdoc` support. Show the static fallback instead of retrying.
- **Iframe request is ignored**: an unmatched origin, session, protocol version,
  or source window is dropped by design. Check `expectedOrigin`; opaque sandboxed
  content uses `"null"`.
- **Iframe navigation fails the instance**: the guest navigated after the
  handshake. Keep the guest document stable or create a new instance.
- **Approval/content leaks into the client bundle**: runtime modules receive only
  explicitly declared JSON `options`. Review the client entry and plugin config.
- **A crashed worker is not noticed until the next call**: a crash with no
  in-flight request surfaces on the next invocation. Register `onError` and
  present the fallback.
