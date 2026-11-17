---
date: 2026-11-17
title: Development Startup Scaling
sidebar.label: Startup Scaling
sidebar.order: 40
---
# Development Startup Scaling

## Method

`pnpm benchmark:development-startup-scaling` copies the repository's `website/`
configuration and plugin stack to a temporary site. It generates a deterministic
realistic vault at each size, including one homepage, and measures a first
process start followed by a stop and immediate second start.

The browser is started before timing. Each measurement includes the image
pre-step and Vite server start, then records elapsed time from process spawn to:

1. Vite accepting TCP connections
2. the first document HTTP response
3. visible `main#main-content`

The benchmark does not delete existing user data or Vite caches. It removes only
its temporary site and cache. Each value is one sample, not a median. Results
are specific to this machine, configuration, and synthetic vault.

## Results

Environment: Windows x64, Node.js v24.22.1, AMD Ryzen 7 7730U, 16 logical CPUs,
14,188 MB RAM.

All values are seconds from process spawn.

| Markdown files | First Vite ready | First HTTP | First visible | Second Vite ready | Second HTTP | Second visible |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10 | 22.11 | 37.46 | 37.53 | 21.98 | 35.24 | 35.25 |
| 100 | 22.23 | 42.93 | 42.96 | 21.23 | 35.99 | 36.01 |
| 1,000 | 21.49 | 62.85 | 62.88 | 21.24 | 37.47 | 37.48 |
| 2,000 | 21.65 | 85.99 | 86.02 | 21.45 | 39.64 | 39.65 |
| 4,000 | 22.38 | 135.32 | 135.35 | 21.80 | 43.41 | 43.43 |
| 5,000 | 21.84 | 156.30 | 156.33 | 21.47 | 43.88 | 43.89 |
| 10,000 | 22.06 | 271.34 | 271.37 | 23.31 | 52.81 | 52.82 |

## Finding

The second start benefits substantially from the persistent development route
cache, while Vite startup remains nearly constant. At large vault sizes, cache
fingerprint reads must be bounded: unbounded reads caused `EMFILE` during the
second start at 5,000 files. The route-cache implementation therefore limits
fingerprint reads to the existing content-processing concurrency of 16.
