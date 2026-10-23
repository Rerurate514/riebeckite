---
date: 2026-10-20
title: Plugin Generator
---
# Plugin Generator

`riebeckite create plugin` creates a local Plugin under `extensions/` from the public Plugin API. It is an implementation starting point; [Writing a Plugin](./writing-a-plugin.md) and the relevant Plugin documentation remain the explanation of each extension point.

Run `riebeckite create` in a TTY to choose this generator alongside Site and Theme creation. Direct `riebeckite create plugin` usage remains unchanged.

## Create a Plugin

```sh
riebeckite create plugin my-plugin --template transform
riebeckite create plugin my-plugin --features transform,diagnostics,cache
```

The default output is `extensions/my-plugin/`. It never overwrites an existing directory. Use `--directory extensions/my-plugin` to state the same destination explicitly, `--no-tests` or `--no-docs` to omit optional files, and `--register` to attempt a conservative registration in `riebeckite.config.ts`.

Registration only edits a recognizable `plugins: []` array. If the configuration cannot be edited safely, the Plugin is created unchanged and the CLI tells you to register it manually.

## Interactive and scripts

Run `riebeckite create plugin` in a TTY to enter the name, destination, comma-separated primary and supporting features, and choices for tests, documentation, and registration. In CI or scripts, prompts are disabled: provide a name and `--template` or `--features`.

## Templates

Primary templates: `transform`, `renderers`, `content-hooks`, `urls`, `content-graph`, `pages`, `components`, `assets-and-client-entries`, `endpoints`, `seo`, and `generated-files`.

Supporting templates: `diagnostics`, `cache`, `dependencies-and-options`, and `logging-and-tracing`.

The registry records each template's related Plugin documentation, generated files, configuration requirements, and composition metadata. A combined Plugin contains one `definePlugin` call. Shared lifecycle work is composed into one hook, imports are selected once, and output uses public manifest views for public output.

## After generation

Review the generated code, register the factory if it was not registered automatically, then run the generated test and your site checks. Generated endpoint examples use `discoverableEntries`; pages and generated files avoid draft and private content. Client entries expose only explicit public configuration.

```sh
pnpm test
pnpm typecheck
riebeckite check
```

Common errors: an unknown feature ID is rejected with the available IDs; invalid names must be kebab-case; an existing directory is never replaced; and non-TTY invocations must provide all required values.
