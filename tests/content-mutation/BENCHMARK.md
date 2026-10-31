# Content mutation benchmark

Measures planning, link impact analysis, saved-plan validation, apply, manifest construction, and recovery on 100 and 1,000 Markdown files. Every file links to a single target that is moved by the measured mutation.

## Running

```sh
pnpm --dir tests/content-mutation benchmark
```

`BENCH_FILES` defaults to `100,1000`; `BENCH_RUNS` defaults to `3`.

```sh
BENCH_FILES=100 BENCH_RUNS=5 pnpm --dir tests/content-mutation benchmark
```

The script creates and removes a temporary vault under the system temporary directory. It runs one unmeasured plan for warm-up, then reports the median, minimum, and maximum for each metric.

- `plan`: full mutation planning, including link impact analysis.
- `linkImpact`: `planContentLinkUpdates` on an already-read file map, three samples per run.
- `validate`: saving and loading a plan, tampering with one source file, and receiving `concurrent-modification`.
- `apply`: end-to-end apply after validation.
- `futureManifest`: a fresh `ContentManager` scan and manifest build over the mutated vault.
- `recovery`: planning a second mutation, failing halfway through its writes, and rolling back through the journal.

## Environment

- Windows 11 Home 10.0.26200, Node 24.22.1.
- WSL2 Ubuntu, kernel 5.15.153.1-microsoft-standard-WSL2, Node 25.4.0.
- Intel Core i7-14700KF, 28 logical processors.
- The benchmark vault is created under the system temporary directory in both environments. On WSL2 this is the Linux filesystem, not `/mnt/c`.

## Results

All values are milliseconds, shown as median (minimum–maximum).

| Metric | Windows 100 | Windows 1,000 | Linux 100 | Linux 1,000 |
| --- | ---: | ---: | ---: | ---: |
| plan | 82.2 (63.5–100.3) | 801.3 (622.5–1333.8) | 42.9 (34.3–45.3) | 340.5 (326.7–531.2) |
| linkImpact | 29.4 (21.6–39.8) | 279.8 (177.0–473.9) | 24.7 (22.5–39.2) | 259.1 (201.9–289.0) |
| validate | 54.4 (49.6–90.2) | 698.5 (483.6–1051.3) | 24.7 (23.3–25.0) | 282.5 (214.0–323.3) |
| apply | 811.7 (628.9–858.3) | 12634.4 (7649.5–12742.5) | 492.8 (489.1–503.5) | 29391.1 (23915.7–33252.8) |
| futureManifest | 182.6 (152.8–217.0) | 1924.1 (1870.3–2319.6) | 197.1 (182.7–240.4) | 1276.2 (1261.6–1484.0) |
| recovery | 322.6 (278.9–328.0) | 2452.5 (1870.5–4004.4) | 116.2 (115.4–122.7) | 7533.4 (5948.6–9882.4) |

Planning, validation, and manifest construction scale roughly linearly. Apply is dominated by durable writes, backups, journal updates, and the source-file flush. The WSL2 result shows slower large-vault apply and recovery than Windows on this machine; these numbers describe one WSL2 host and are not a portable performance guarantee.
