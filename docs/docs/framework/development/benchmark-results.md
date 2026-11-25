---
date: 2026-11-25
title: Benchmark Results
sidebar.label: Benchmark Results
sidebar.order: 50
---
# Benchmark Results

This page records the most recent measurements taken on the reference development machine. Each section names its measurement date and command. Benchmarks do not run as part of `pnpm test` or CI, and the raw files under `benchmarks/results/` are not committed; this page keeps the values that matter for comparison.

Unless a section says otherwise, the environment is Windows x64, Node.js v24.22.1, AMD Ryzen 7 7730U (16 logical CPUs), and 14,188 MB RAM.

## Core build pipeline

Measured 2026-11-16 with `pnpm benchmark:vault` on a generated realistic 1,000-note vault. Three repeats per scenario; wall time is the median. The content and output caches are enabled, and the edit scenarios reuse state from an initial build.

| Scenario | Wall (median) | Range | Peak RSS |
| --- | ---: | ---: | ---: |
| Cold build | 15.9 s | 11.6–16.2 s | 461 MB |
| No-change warm build | 2.19 s | 2.19–2.79 s | 466 MB |
| One body edit | 2.41 s | 2.38–3.05 s | 465 MB |
| One frontmatter edit | 6.09 s | 6.05–7.97 s | 464 MB |
| Add one note | 2.38 s | 2.37–3.06 s | 470 MB |
| Delete one note | 2.21 s | 2.19–2.84 s | 470 MB |

Peak RSS is process-wide. A cold build spends most of its wall time reading and processing content; the warm and edit scenarios reuse the persisted content state.

## Development server startup

### Repository website

Measured 2026-11-22 with `pnpm benchmark:development-startup`. It starts the repository's `website/` through `pnpm dev`, stops it, and starts it again immediately. Each value is one sample.

| Start | Vite ready | First HTTP response | First visible |
| --- | ---: | ---: | ---: |
| First | 10.0 s | 26.5 s | 26.6 s |
| Second | 11.2 s | 27.7 s | 27.7 s |

### Scaling by vault size

Measured 2026-11-17 with `pnpm benchmark:development-startup-scaling`. The runner copies the repository's `website/` configuration and plugin stack to a temporary site, generates a deterministic realistic vault, and records the first and immediate second start. Each value is one sample in seconds from process spawn.

| Markdown files | First Vite ready | First HTTP | First visible | Second Vite ready | Second HTTP | Second visible |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 22.11 | 37.46 | 37.53 | 21.98 | 35.24 | 35.25 |
| 100 | 22.23 | 42.93 | 42.96 | 21.23 | 35.99 | 36.01 |
| 1,000 | 21.49 | 62.85 | 62.88 | 21.24 | 37.47 | 37.48 |
| 2,000 | 21.65 | 85.99 | 86.02 | 21.45 | 39.64 | 39.65 |
| 4,000 | 22.38 | 135.32 | 135.35 | 21.80 | 43.41 | 43.43 |
| 5,000 | 21.84 | 156.30 | 156.33 | 21.47 | 43.88 | 43.89 |
| 10,000 | 22.06 | 271.34 | 271.37 | 23.31 | 52.81 | 52.82 |

Vite startup stays nearly constant across sizes. The second start is substantially faster because the persistent development route cache avoids repeating content work. At 5,000 files, unbounded cache fingerprint reads caused `EMFILE`, so the route cache limits them to the same concurrency of 16 used for content processing.

Five additional 10,000-note runs on 2026-11-22 measured 78.6–156.1 s to Vite ready and 327.4–543.4 s to the first HTTP response; the second start measured 17.8–50.3 s and 37.8–101.6 s. These values are far above the sweep above, and the cause was not identified. Treat the 2026-11-17 sweep as the recorded baseline and re-measure before drawing conclusions from a single run.

## Preset SSG

Measured 2026-11-07 with `pnpm benchmark:presets` during the post-merge check. It scaffolds the `starter` preset with 100 notes and compares an incremental `no-change` build with a clean SSG from the same source tree. This record contains one sample and one scenario.

| Preset | Notes | Scenario | Wall | Clean wall | Peak RSS | Output cache | Fast path | Equivalent |
| --- | ---: | --- | ---: | ---: | ---: | --- | --- | --- |
| starter | 100 | no-change | 14.8 s | 26.1 s | 1,002 MB | 260 hit / 0 miss | yes | yes |

The incremental build rendered no outputs and reused 256 outputs; `outputWrite` accounted for 1.96 s of its wall time. No output paths differed from the clean build.

## SPA navigation

Measured 2026-11-22 with `pnpm benchmark:spa` on tarballs packed for publication, in an isolated temporary site. Each mode used five cold builds and five browser trials on a local `no-store` server.

| Mode | Cold build (median) | Initial render | Navigation | Static JS raw / gzip / brotli |
| --- | ---: | ---: | ---: | --- |
| SPA off | 23.4 s | 27.2 ms | 30.6 ms | 1.343 MB / 430 KB / 368 KB |
| SPA on, prefetch off | 23.1 s | 25.9 ms | 184.3 ms | 1.355 MB / 434 KB / 371 KB |
| SPA on, hover prefetch | 23.3 s | 20.5 ms | 91.7 ms | 1.355 MB / 434 KB / 371 KB |

With hover prefetch, five requests and 67,365 bytes were issued before the click. Without prefetch, those requests happened after the click.

## Graph layout

The [graph package README](https://github.com/Rerurate514/riebeckite/blob/main/packages/graph/README.md) records the development-machine results for synthetic graphs. Settling 3,000 nodes with about 3,600 links takes roughly 1.15 s of simulation work, or about 3.8 ms per tick. Dense graphs of the same size with about 11,900 links exceed the 60 Hz frame budget on some frames: about 12.4 ms average and 24 ms at the 95th percentile. These numbers depend on the browser and machine.

## Provenance recording cost

Measured with `scripts/benchmark_large_vault.mjs` on a generated 1,000-note vault, five runs per scenario, with the default content and output caches enabled. Environment: Windows (win32), Node.js v24.22.0.

| Scenario | Provenance off (median, range) | Provenance on (median, range) |
| --- | --- | --- |
| Cold build | 2,358 ms (2,306–3,119) | 2,422 ms (2,383–2,596) |
| No-change warm build | 584 ms (531–933) | 747 ms (627–2,251) |
| One independent note edit | 646 ms (585–670) | 741 ms (680–1,035) |

Provenance is recorded after the manifest and output plan are known. Disabling it removes recording and state serialization but does not change build output.

## Comparing results

Absolute timings depend on hardware, filesystem, background load, and fixture content. Compare runs made on the same machine with the same command and fixture, and do not read a single number as a product-wide guarantee. The harness commands and flags are documented in [`benchmarks/README.md`](https://github.com/Rerurate514/riebeckite/blob/main/benchmarks/README.md).
