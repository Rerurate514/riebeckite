# Development Guide

## Workspace workflow

Install dependencies with pnpm, then use the root scripts:

```sh
pnpm install
pnpm lint
pnpm format
pnpm check
pnpm test
pnpm build
```

`lint` runs Biome linting and `check` runs Biome checks, both read-only; `check` reports issues without writing. Apply fixes explicitly with `check:fix`, or run `format` for formatting writes, and review the resulting diff. For framework behavior use the Riebeckite CLI commands from [CLI](cli.md).

Tests run per package through `pnpm test` (or `pnpm test:update` to refresh golden files); see [Testing](testing.md) for the layout, writing tests, and adding a test script to a new package.

## Make focused changes

1. Locate the owning package using [Architecture](architecture.md).
2. Read the public export surface (`packages/core/index.ts` for Core contracts) and at least one comparable implementation.
3. Preserve dependency direction and separate build-time state from runtime code.
4. Add or update focused tests when behavior changes.
5. Run the narrowest relevant validation, then repository checks appropriate to the change.

Do not solve an application concern by importing HonoX or `apps/web` into Core. Do not put reusable plugin behavior in a route. Do not make a theme carry JavaScript or DOM transformation behavior.

## Documentation changes

Keep English and Japanese references aligned, use relative links, and describe ownership, inputs/outputs, failure behavior, and boundaries—not only happy paths. Update the agent guides when a cross-package invariant changes.

## Implementation backlog record

The initial implementation backlog lives in [tasklist.md](../../tasklist.md) (all tasks closed). Use it as a historical record of earlier decisions, not as an active plan or tracker.
