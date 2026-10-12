# Riebeckite performance benchmarks

These benchmarks measure Riebeckite's build pipeline against synthetic,
deterministic Obsidian vaults. They exist to characterise scaling, not to
guarantee absolute numbers (see *Environment* below).

Nothing here runs as part of `pnpm test` or CI. Run them explicitly.

## Commands

```sh
# Core content/build pipeline (no Vite, no SSG).
pnpm benchmark:vault

# Narrow the sweep.
pnpm benchmark:vault -- --profiles baseline,realistic --sizes 1000,5000
pnpm benchmark:vault -- --scenarios cold,warm,single-edit --repeats 1

# Localization workload with paired English/Japanese translations.
pnpm benchmark:vault -- --l10n --sizes 100,1000,10000 --scenarios cold,warm,single-edit,link-edit,add,delete,rename,public-draft --repeats 1

# Incremental vs fresh-cold output equivalence.
pnpm benchmark:equivalence -- --size 500 --scenarios single-edit,frontmatter-edit,rename

# Full HonoX/Vite/SSG benchmark (requires `pnpm build:packages` first; the
# existing repository harness, reused as-is).
node --import tsx scripts/benchmark_ssg_large_vault.mjs

# Official create-riebeckite Starter / Showcase SSG benchmark.
# Runs one measurement per scenario after building workspace packages.
pnpm build:packages
pnpm benchmark:presets -- --sizes 100
pnpm benchmark:presets -- --sizes 1000

# Harness tests.
pnpm test:benchmark:presets
```

`benchmark:vault` accepts:

| flag | default | meaning |
| --- | --- | --- |
| `--profiles` | `baseline,realistic` | vault profiles to generate |
| `--sizes` | `100,1000,5000,10000` | note counts |
| `--scenarios` | all | scenarios to measure |
| `--repeats` | `3` | runs per (profile, size, scenario); reported as median |
| `--out` | `benchmarks/results` | output directory |
| `--l10n` | off | enable l10n and generate paired English/Japanese translations |

## Official preset SSG harness

`benchmark:presets` scaffolds the official `starter` and `showcase` presets with
`scaffoldRiebeckiteSite`; it does not define a benchmark-only preset or alter
the generated configuration. It runs full HonoX/Vite SSG for `cold`,
`no-change`, `single-body-edit`, `link-edit`, `add`, `delete`, `rename`, and
`publication-change`. Every scenario begins from a newly scaffolded site and a
successful baseline build (except cold), then compares its incremental output
with a clean SSG from the same changed source tree.

The added content is deterministic and contains frontmatter, aliases, wiki and
normal links, an asset reference, public/draft boundaries, Japanese and English
body text, and folders. Translation groups are generated only for Showcase,
which already includes l10n. Results record the generated preset plugin order,
wall time, peak RSS, content/output reuse, SSG/output-cache counters, fast-path
and full-regeneration status, output-write time, and a complete output-tree
comparison. No output paths are excluded from equivalence checks.

Showcase intentionally retains the official changelog and webmention plugins.
Both declare unknown output dependencies, so no-change builds may require full
regeneration; this is reported rather than bypassed. Output files are written
as `benchmarks/results/<timestamp>-preset-ssg.{json,md}` and are single-sample
measurements unless the harness is run repeatedly.
Its disposable generated sites live under
`apps/web/.riebeckite/preset-ssg-benchmark` by default so they resolve the
workspace's built packages without changing a generated site's configuration.

## Vault profiles

Generated deterministically per run (fixed seed) into the OS temp directory;
no fixture vaults are committed.

| profile | shape |
| --- | --- |
| `baseline` | small/medium body, 2–5 wikilinks, 1–2 tags, no assets, no embeds, public |
| `realistic` | ~5 paragraphs, 5–15 links, 2–4 tags, ~20% asset refs, ~15% embeds, aliases, mixed visibility, few scheduled, few l10n, few custom permalinks |
| `sparse` | 2–5 links per note |
| `medium` | 10–20 links per note |
| `dense` | ~50 links per note |
| `asset` | every note references assets, ~2 assets per note |

## Scenarios

`cold`, `warm` (no change), `single-edit`, `link-edit`, `title-edit`, `add`, `delete`,
`frontmatter-edit`, `public-draft`, `hub-edit`, `rename`, `asset-edit`,
`config-edit`, `plugin-edit`.

`cold` starts with no content build state, no persistent cache and no output.
`warm` and the edit scenarios run right after an initial build and reuse the
persisted state/cache.

## Output

Results are written to `benchmarks/results/<timestamp>-core.json` and are
**not** committed (see `.gitignore`). The committed JSON schema is
`benchmarks/results.schema.json`. The runner also prints a compact summary
table (cold / warm / selected edits / peak RSS) to stdout.

Each JSON result records the Node/OS/CPU environment and cache/fixture
conditions. Numeric fields include the median, minimum, maximum, and population
variance for repeated samples. Per-sample phase timing includes scanning,
reading, Markdown processing, content processing, manifest construction, and
graph construction; concurrent spans are reported as aggregate elapsed time.
`pluginTimings` reports hook call counts and elapsed time by plugin and hook.

Snapshot fields (only populated by the equivalence runner) are internal
comparison data and may grow; treat `benchmarks/results.schema.json` as the
contract.

## Environment

Absolute timings depend on hardware, OS, Node version, filesystem and the
vault content. Always record the environment alongside results; do not read a
single number as a product-wide guarantee.
