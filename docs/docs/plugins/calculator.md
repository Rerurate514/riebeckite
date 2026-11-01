---
date: 2026-11-01
title: Calculator
---
# Calculator

The Calculator plugin evaluates a fixed arithmetic expression written in a
`calc` code block. The server renders the result for the static page and the
browser re-evaluates the same expression through the Riebeckite Interactive
Runtime.

[日本語](./calculator.ja.md)

## What it does

- Renders a `calc` block as a result on the server.
- Re-evaluates the same expression in the browser through the Interactive
  Runtime.
- Keeps the server result as a fallback when JavaScript or the runtime is
  unavailable.

## What it is not

This is not an input-driven calculator. The expression is fixed in the Markdown
source at build time; readers cannot type numbers or change the expression. An
input-driven widget needs a custom plugin that reads form state and calls a
runtime, which this plugin does not implement.

## Install

```sh
npm install @riebeckite/plugin-calculator
```

Register the plugin in `riebeckite.config.ts`:

```ts
import { calculator } from "@riebeckite/plugin-calculator";

export default defineConfig({
  plugins: [calculator()],
});
```

## Write an expression

Use the `calc` language on a fenced code block:

```calc
2 * (3 + 4)
```

The result is `14`. The same value is rendered on the server, so it remains
readable when JavaScript is unavailable. With JavaScript enabled, the plugin
mounts the runtime, evaluates the expression again, and replaces the static
value with a live result.

## Supported expressions

The plugin accepts numbers, `+`, `-`, `*`, `/`, unary signs, parentheses, and
whitespace. Expressions are limited to 200 characters. Division by zero and
malformed input render an error message instead of starting a runtime.

The parser is a small recursive-descent evaluator. It never uses `eval` or
`new Function`, and a Markdown block cannot execute arbitrary JavaScript.

## Lifecycle and fallback

Each calculator block owns one Runtime instance with the `calculator` runtime
ID. The instance is created through the plugin runtime registry and is disposed
with the page scope on SPA navigation. The markup uses the standard
`data-runtime-fallback`, `data-runtime-loading`, and `data-runtime-error`
contract from `@riebeckite/runtime`.

- Without JavaScript, `data-runtime-fallback` shows the server result.
- While the runtime starts, `data-runtime-loading` is visible.
- When evaluation completes, the live output replaces the static value.
- If the runtime fails, the static value stays visible and
  `data-runtime-error` announces the failure with `role="alert"`.

The initializer is loaded only on pages that contain `[data-calculator]`, and
the runtime module is loaded lazily through the plugin `runtimeEntries` contract.

## Security

This plugin runs trusted first-party code on the main thread. It is not a
sandbox for untrusted code. For untrusted markup or scripts, use the sandboxed
iframe Runtime instead; workers and WebAssembly are not security boundaries on
their own.

## Public API

- `calculator()` creates the plugin definition.
- `evaluateExpression(source)` returns an `{ ok: true, value }` or
  `{ ok: false, reason }` result.
- `renderCalculator(expression)` renders the static HTML and runtime mount point.
- `remarkCalculator` transforms `calc` code blocks during the Markdown build.
- `createCalculatorRuntime()` creates the runtime definition used by the plugin
  client entry.
