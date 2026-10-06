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

# Incremental vs fresh-cold output equivalence.
pnpm benchmark:equivalence -- --size 500 --scenarios single-edit,frontmatter-edit,rename

# Full HonoX/Vite/SSG benchmark (requires `pnpm build:packages` first; the
# existing repository harness, reused as-is).
node --import tsx scripts/benchmark_ssg_large_vault.mjs
```

`benchmark:vault` accepts:

| flag | default | meaning |
| --- | --- | --- |
| `--profiles` | `baseline,realistic` | vault profiles to generate |
| `--sizes` | `100,1000,5000,10000` | note counts |
| `--scenarios` | all | scenarios to measure |
| `--repeats` | `3` | runs per (profile, size, scenario); reported as median |
| `--out` | `benchmarks/results` | output directory |

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

`cold`, `warm` (no change), `single-edit`, `frontmatter-edit`, `hub-edit`,
`rename`, `asset-edit`, `config-edit`, `plugin-edit`.

`cold` starts with no content build state, no persistent cache and no output.
`warm` and the edit scenarios run right after an initial build and reuse the
persisted state/cache.

## Output

Results are written to `benchmarks/results/<timestamp>-core.json` and are
**not** committed (see `.gitignore`). The committed JSON schema is
`benchmarks/results.schema.json`. The runner also prints a compact summary
table (cold / warm / selected edits / peak RSS) to stdout.

Snapshot fields (only populated by the equivalence runner) are internal
comparison data and may grow; treat `benchmarks/results.schema.json` as the
contract.

## Environment

Absolute timings depend on hardware, OS, Node version, filesystem and the
vault content. Always record the environment alongside results; do not read a
single number as a product-wide guarantee.
